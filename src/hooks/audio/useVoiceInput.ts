
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/ui/use-toast';

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    };
  }, []);

  const setupMediaRecorder = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          setAudioChunks((chunks) => [...chunks, event.data]);
        }
      });
      
      recorder.addEventListener('stop', async () => {
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          await processAudioForTranscription(audioBlob);
        }
      });
      
      setMediaRecorder(recorder);
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Access Error",
        description: "Could not access your microphone. Please check your browser permissions.",
        variant: "destructive",
      });
      return false;
    }
  };

  const startRecording = async () => {
    setAudioChunks([]);
    
    if (!mediaRecorder) {
      const success = await setupMediaRecorder();
      if (!success) return;
    }
    
    if (mediaRecorder && mediaRecorder.state !== 'recording') {
      mediaRecorder.start(1000); // Collect chunks every second
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    } else {
      setIsRecording(false);
    }
  };

  const processAudioForTranscription = async (audioBlob: Blob): Promise<string> => {
    setIsProcessing(true);
    
    try {
      // Convert Blob to base64
      const reader = new FileReader();
      const audioBase64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      
      reader.readAsDataURL(audioBlob);
      const audioBase64 = await audioBase64Promise;
      
      // Send to Speech-to-Text function
      const { data, error } = await supabase.functions.invoke('speech-to-text', {
        body: { audioData: audioBase64 }
      });
      
      if (error) throw error;
      
      if (data.transcription) {
        setTranscript(data.transcription);
        return data.transcription;
      } else if (data.error) {
        throw new Error(data.error);
      }
      
      return '';
    } catch (error) {
      console.error('Error processing audio for transcription:', error);
      toast({
        title: "Speech Recognition Error",
        description: error instanceof Error ? error.message : "Failed to process your speech",
        variant: "destructive",
      });
      return '';
    } finally {
      setIsProcessing(false);
    }
  };

  const clearTranscript = () => {
    setTranscript('');
  };

  return {
    isRecording,
    isProcessing,
    transcript,
    startRecording,
    stopRecording,
    clearTranscript,
    setTranscript
  };
}
