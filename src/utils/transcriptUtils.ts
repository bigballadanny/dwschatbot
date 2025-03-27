
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

// This function was missing - detects source category from filename or content
export function detectSourceCategory(filename: string, content?: string): string {
  const lowercaseFilename = filename.toLowerCase();
  
  if (lowercaseFilename.includes('protege')) {
    return 'protege_call';
  } else if (lowercaseFilename.includes('foundation')) {
    return 'foundations_call';
  } else if (lowercaseFilename.includes('mastermind')) {
    return 'mastermind_call';
  }
  
  // If no category detected from filename, try content if provided
  if (content) {
    const lowercaseContent = content.toLowerCase();
    if (lowercaseContent.includes('protege')) {
      return 'protege_call';
    } else if (lowercaseContent.includes('foundation')) {
      return 'foundations_call';
    } else if (lowercaseContent.includes('mastermind')) {
      return 'mastermind_call';
    }
  }
  
  // Default category
  return 'other';
}

// This function was missing - searches transcripts for relevant content based on query
export function searchTranscriptsForQuery(query: string, transcripts: Transcript[]) {
  if (!query || !transcripts || transcripts.length === 0) {
    return null;
  }

  // Normalize query for better matching
  const normalizedQuery = query.toLowerCase().trim();
  
  // Find transcripts that might have relevant content
  const matchedTranscripts = transcripts
    .filter(transcript => transcript.content && transcript.content.length > 0)
    .map(transcript => {
      // Calculate a simple relevance score based on keyword matching
      const content = transcript.content.toLowerCase();
      const queryTerms = normalizedQuery.split(/\s+/);
      
      let relevanceScore = 0;
      queryTerms.forEach(term => {
        if (term.length > 3) { // Skip short words
          const regex = new RegExp(`\\b${term}\\b`, 'g');
          const matches = content.match(regex);
          if (matches) {
            relevanceScore += matches.length;
          }
        }
      });
      
      return {
        ...transcript,
        relevanceScore
      };
    })
    .filter(t => t.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  if (matchedTranscripts.length === 0) {
    return null;
  }
  
  // Return the most relevant transcript
  return matchedTranscripts[0];
}

// This function was missing - gets description for different source types
export function getSourceDescription(sourceType: string): string {
  switch (sourceType.toLowerCase()) {
    case 'protege_call':
      return "Carl Allen's Protege Program call";
    case 'foundations_call':
      return "Carl Allen's Foundations Program call";
    case 'mastermind_call':
      return "Carl Allen's Mastermind call";
    case 'creative_dealmaker':
      return "Carl Allen's Creative Dealmaker book";
    case 'case_study':
      return "a case study";
    default:
      return "Carl Allen's business acquisition material";
  }
}
