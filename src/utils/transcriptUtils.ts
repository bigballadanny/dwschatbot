
import { Tables } from '../integrations/supabase/types';

export type Transcript = {
  id: string;
  title: string;
  source: string;
  created_at: string;
  content: string;
};

export function getTranscriptCounts(transcripts: Transcript[]) {
  let protege_call = 0;
  let foundations_call = 0;
  let mastermind_call = 0;
  let other = 0;
  
  transcripts.forEach(transcript => {
    const source = transcript.source?.toLowerCase() || '';
    if (source.includes('protege')) {
      protege_call++;
    } else if (source.includes('foundations')) {
      foundations_call++;
    } else if (source.includes('mastermind')) {
      mastermind_call++;
    } else {
      other++;
    }
  });
  
  return {
    total: transcripts.length,
    protege_call,
    foundations_call,
    mastermind_call,
    other
  };
}

export function getTranscriptSummaries(transcripts: Transcript[]) {
  return transcripts.map(transcript => ({
    id: transcript.id,
    title: transcript.title,
    source: transcript.source,
    created_at: transcript.created_at,
    content_length: transcript.content?.length || 0
  }));
}
