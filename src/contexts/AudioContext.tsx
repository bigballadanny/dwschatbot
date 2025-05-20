import React, { createContext, useContext, ReactNode } from 'react';
import { useAudioManager, AudioManagerOptions } from '@/hooks/useAudioManager';

// Define the context type
interface AudioContextType {
  // Audio state
  audioSrc: string | null;
  isGenerating: boolean;
  isPlaying: boolean;
  enabled: boolean;
  
  // Recording state
  transcript: string;
  isRecording: boolean;
  isProcessing: boolean;
  
  // Audio methods
  generateSpeech: (text: string, voice?: string) => Promise<boolean>;
  playAudioContent: (audioContent: string) => void;
  togglePlayback: () => void;
  stopAudio: () => void;
  clearAudio: () => void;
  toggleEnabled: () => void;
  
  // Recording methods
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearTranscript: () => void;
  setTranscript: (transcript: string) => void;
}

// Create context with a default undefined value
const AudioContext = createContext<AudioContextType | undefined>(undefined);

// Provider props interface
interface AudioProviderProps {
  children: ReactNode;
  options?: AudioManagerOptions;
}

/**
 * Audio Provider component to manage audio state at the application level
 */
export const AudioProvider: React.FC<AudioProviderProps> = ({ 
  children, 
  options 
}) => {
  // Use our consolidated audio hook
  const audioManager = useAudioManager(options);
  
  // Create the context value object
  const contextValue: AudioContextType = {
    // Audio state
    audioSrc: audioManager.audioSrc,
    isGenerating: audioManager.isGenerating,
    isPlaying: audioManager.isPlaying,
    enabled: audioManager.enabled,
    
    // Recording state
    transcript: audioManager.transcript,
    isRecording: audioManager.isRecording,
    isProcessing: audioManager.isProcessing,
    
    // Audio methods
    generateSpeech: audioManager.generateSpeech,
    playAudioContent: audioManager.playAudioContent,
    togglePlayback: audioManager.togglePlayback,
    stopAudio: audioManager.stopAudio,
    clearAudio: audioManager.clearAudio,
    toggleEnabled: audioManager.toggleEnabled,
    
    // Recording methods
    startRecording: audioManager.startRecording,
    stopRecording: audioManager.stopRecording,
    clearTranscript: audioManager.clearTranscript,
    setTranscript: audioManager.setTranscript,
  };
  
  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  );
};

/**
 * Custom hook to use the audio context
 * Throws an error if used outside of AudioProvider
 */
export const useAudio = (): AudioContextType => {
  const context = useContext(AudioContext);
  
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  
  return context;
};