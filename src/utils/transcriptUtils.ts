
import { Tables } from '../integrations/supabase/types';

export type Transcript = {
  id: string;
  title: string;
  source: string;
  created_at: string;
  content: string;
  file_path?: string;
  relevanceScore?: number;
};

export function getTranscriptCounts(transcripts: Transcript[]) {
  let protege_call = 0;
  let foundations_call = 0;
  let mastermind_call = 0;
  let business_acquisitions_summit = 0;
  let other = 0;
  
  transcripts.forEach(transcript => {
    const source = transcript.source?.toLowerCase() || '';
    if (source.includes('protege')) {
      protege_call++;
    } else if (source.includes('foundations')) {
      foundations_call++;
    } else if (source.includes('mastermind')) {
      mastermind_call++;
    } else if (source.includes('business_acquisitions_summit') || source === 'business acquisitions summit') {
      business_acquisitions_summit++;
    } else {
      other++;
    }
  });
  
  return {
    total: transcripts.length,
    protege_call,
    foundations_call,
    mastermind_call,
    business_acquisitions_summit,
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

export function detectSourceCategory(filename: string, content?: string): string {
  const lowercaseFilename = filename.toLowerCase();
  
  if (lowercaseFilename.includes('protege')) {
    return 'protege_call';
  } else if (lowercaseFilename.includes('foundation')) {
    return 'foundations_call';
  } else if (lowercaseFilename.includes('mastermind')) {
    return 'mastermind_call';
  } else if (
    lowercaseFilename.includes('summit') || 
    lowercaseFilename.includes('acquisitions_summit') || 
    lowercaseFilename.includes('acquisition summit') ||
    lowercaseFilename.includes('business acquisition')
  ) {
    return 'business_acquisitions_summit';
  }
  
  if (content) {
    const lowercaseContent = content.toLowerCase();
    if (lowercaseContent.includes('protege')) {
      return 'protege_call';
    } else if (lowercaseContent.includes('foundation')) {
      return 'foundations_call';
    } else if (lowercaseContent.includes('mastermind')) {
      return 'mastermind_call';
    } else if (
      lowercaseContent.includes('summit') || 
      lowercaseContent.includes('acquisitions summit') ||
      lowercaseContent.includes('acquisition summit') || 
      lowercaseContent.includes('business acquisition summit')
    ) {
      return 'business_acquisitions_summit';
    }
  }
  
  // Check for timestamps on 27th for likely summit content
  if (filename.includes('2025-03-27') || filename.includes('2025-02-27')) {
    return 'business_acquisitions_summit';
  }
  
  return 'other';
}

export function searchTranscriptsForQuery(query: string, transcripts: Transcript[]) {
  if (!query || !transcripts || transcripts.length === 0) {
    return null;
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  const businessKeywords = [
    'acquisition', 'deal', 'finance', 'negotiate', 'valuation', 
    'due diligence', 'cashflow', 'funding', 'seller', 'owner', 'sba', 
    'structure', 'roi', 'risk', 'revenue', 'profit', 'ebitda', 'multiple',
    'broker', 'capital', 'closing', 'contract', 'leverage', 'debt', 'equity'
  ];
  
  const matchedTranscripts = transcripts
    .filter(transcript => transcript.content && transcript.content.length > 0)
    .map(transcript => {
      const content = transcript.content.toLowerCase();
      const queryTerms = normalizedQuery.split(/\s+/);
      
      let relevanceScore = 0;
      let exactPhraseMatch = false;
      
      if (content.includes(normalizedQuery)) {
        relevanceScore += 50;
        exactPhraseMatch = true;
      }
      
      queryTerms.forEach(term => {
        if (term.length > 2) {
          const regex = new RegExp(`\\b${term}\\b`, 'g');
          const matches = content.match(regex);
          
          if (matches) {
            let termScore = matches.length;
            
            if (businessKeywords.includes(term)) {
              termScore *= 2;
            }
            
            if (term.length > 5) {
              termScore *= 1.5;
            }
            
            relevanceScore += termScore;
          }
        }
      });
      
      // Boost relevance for business_acquisitions_summit as it's the newest content
      const sourceBoost = transcript.source === 'business_acquisitions_summit' ? 1.5 :
                          transcript.source === 'mastermind_call' ? 1.2 : 
                          1.0;
      
      relevanceScore *= sourceBoost;
      
      if (queryTerms.length > 1 && !exactPhraseMatch) {
        const contentParagraphs = content.split(/\n\s*\n/);
        
        for (const paragraph of contentParagraphs) {
          let termsInParagraph = 0;
          
          for (const term of queryTerms) {
            if (term.length > 2 && paragraph.includes(term)) {
              termsInParagraph++;
            }
          }
          
          if (termsInParagraph > 1) {
            relevanceScore += (termsInParagraph * 10);
          }
        }
      }
      
      return {
        ...transcript,
        relevanceScore: Math.round(relevanceScore)
      };
    })
    .filter(t => t.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  if (matchedTranscripts.length === 0) {
    return null;
  }
  
  return matchedTranscripts.slice(0, 3);
}

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
    case 'business_acquisitions_summit':
      return "Carl Allen's 2024 Business Acquisitions Summit";
    default:
      return "Carl Allen's business acquisition material";
  }
}

export function extractRelevantContent(transcript: Transcript, query: string, maxLength: number = 4000): string {
  if (!transcript || !transcript.content || !query) {
    return transcript?.content || '';
  }
  
  const content = transcript.content;
  const normalizedQuery = query.toLowerCase().trim();
  const queryTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 2);
  
  const paragraphs = content.split(/\n\s*\n/);
  
  const scoredParagraphs = paragraphs.map(paragraph => {
    let score = 0;
    
    if (paragraph.toLowerCase().includes(normalizedQuery)) {
      score += 50;
    }
    
    for (const term of queryTerms) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = paragraph.match(regex);
      if (matches) {
        score += matches.length * 10;
      }
    }
    
    return { paragraph, score };
  });
  
  scoredParagraphs.sort((a, b) => b.score - a.score);
  
  let extractedContent = '';
  let currentLength = 0;
  
  for (const { paragraph, score } of scoredParagraphs) {
    if (score > 0 && currentLength + paragraph.length <= maxLength) {
      extractedContent += paragraph + '\n\n';
      currentLength += paragraph.length + 2;
    }
  }
  
  if (currentLength < maxLength / 2 && paragraphs.length > 0) {
    let contextParagraphs = '';
    let i = 0;
    
    while (currentLength + contextParagraphs.length < maxLength && i < Math.min(5, paragraphs.length)) {
      if (!extractedContent.includes(paragraphs[i])) {
        contextParagraphs += paragraphs[i] + '\n\n';
      }
      i++;
    }
    
    extractedContent = contextParagraphs + extractedContent;
  }
  
  return extractedContent.trim();
}
