
import { Tables } from '../integrations/supabase/types';

export type Transcript = {
  id: string;
  title: string;
  source: string;
  created_at: string;
  content: string;
  file_path?: string;
  file_type?: string;
  relevanceScore?: number;
  tags?: string[];
  is_processed?: boolean;
  is_summarized?: boolean;  
  updated_at?: string;
  user_id?: string;
  metadata?: Record<string, any>; // Add metadata property
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
    } else if (source === 'business_acquisitions_summit' || source.includes('summit') || source.includes('acquisition summit')) {
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
    content_length: transcript.content?.length || 0,
    tags: transcript.tags || []
  }));
}

/**
 * Detects the most likely source category for a transcript based on its title and content.
 * 
 * @param filename The title of the transcript
 * @param content Optional content of the transcript for additional context
 * @returns The detected source category identifier
 */
export function detectSourceCategory(filename: string, content?: string): string {
  const lowercaseFilename = filename.toLowerCase();
  
  // Check filename first for more specific matches
  if (lowercaseFilename.includes('summit') || 
      lowercaseFilename.includes('acquisitions_summit') || 
      lowercaseFilename.includes('acquisition summit') || 
      lowercaseFilename.includes('2025 summit') ||
      lowercaseFilename.includes('2025-summit') || 
      lowercaseFilename.includes('business acquisition')) {
    // Check specifically for 2025 summit
    if (lowercaseFilename.includes('2025')) {
      return 'business_acquisitions_summit_2025';
    }
    return 'business_acquisitions_summit';
  } else if (lowercaseFilename.includes('protege')) {
    return 'protege_call';
  } else if (lowercaseFilename.includes('foundation')) {
    return 'foundations_call';
  } else if (lowercaseFilename.includes('mastermind')) {
    return 'mastermind_call';
  } else if (lowercaseFilename.includes('rlgl') || 
             lowercaseFilename.includes('rich lose') ||
             lowercaseFilename.includes('get lost')) {
    return 'rlgl_call';
  } else if (lowercaseFilename.includes('finance') || 
             lowercaseFilename.includes('financial')) {
    return 'finance_call';
  } else if (lowercaseFilename.includes('sba') ||
      lowercaseFilename.includes('law') || 
      lowercaseFilename.includes('regulation')) {
    return 'reference_material';
  } else if (lowercaseFilename.includes('book') ||
      lowercaseFilename.includes('guide')) {
    return 'educational_material';
  }
  
  // Check content if filename didn't provide a clear match
  if (content) {
    const lowercaseContent = content.toLowerCase();
    if (lowercaseContent.includes('summit') || 
        lowercaseContent.includes('acquisitions summit') ||
        lowercaseContent.includes('acquisition summit') || 
        lowercaseContent.includes('business acquisition summit')) {
      if (lowercaseContent.includes('2025')) {
        return 'business_acquisitions_summit_2025';
      }
      return 'business_acquisitions_summit';
    } else if (lowercaseContent.includes('protege')) {
      return 'protege_call';
    } else if (lowercaseContent.includes('foundation')) {
      return 'foundations_call';
    } else if (lowercaseContent.includes('mastermind')) {
      return 'mastermind_call';
    } else if (lowercaseContent.includes('rich lose get lost') || 
               lowercaseContent.includes('rlgl') || 
               lowercaseContent.includes('rich guys lose')) {
      return 'rlgl_call';
    } else if (lowercaseContent.includes('finance call') || 
               lowercaseContent.includes('financial call')) {
      return 'finance_call';
    } else if (lowercaseContent.includes('sba') ||
        lowercaseContent.includes('law') || 
        lowercaseContent.includes('regulation')) {
      return 'reference_material';
    }
  }
  
  // Specific date detection for summit content
  if (filename.includes('2024-03-27') || 
      filename.includes('2024-02-27')) {
    return 'business_acquisitions_summit';
  }
  
  if (filename.includes('2025-03-27') || 
      filename.includes('2025-02-27')) {
    return 'business_acquisitions_summit_2025';
  }
  
  // If Year 2025 is mentioned, it's likely the new Business Acquisitions seminar
  if (filename.includes('2025') || (content && content.includes('2025'))) {
    return 'business_acquisitions_summit_2025';
  }
  
  return 'other';
}

export function detectFileType(fileName: string, mimeType: string): string {
  if (mimeType.includes('video/')) {
    return 'video';
  } else if (mimeType === 'application/pdf') {
    return 'pdf';
  } else if (mimeType.includes('text/')) {
    return 'text';
  } else if (mimeType.includes('audio/')) {
    return 'audio';
  } else if (mimeType.includes('image/')) {
    return 'image';
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/msword') {
    return 'document';
  } else {
    // Try to detect from file extension
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'pdf';
      case 'txt': return 'text';
      case 'doc':
      case 'docx': return 'document';
      case 'mp4':
      case 'webm':
      case 'mov': return 'video';
      case 'mp3':
      case 'wav': return 'audio';
      case 'jpg':
      case 'jpeg':
      case 'png': return 'image';
      default: return 'other';
    }
  }
}

export function generateFileIcon(fileType: string) {
  switch (fileType) {
    case 'video': return 'video';
    case 'pdf': return 'file-text';
    case 'text': return 'file-text';
    case 'document': return 'file';
    case 'audio': return 'headphones';
    case 'image': return 'image';
    default: return 'file';
  }
}

export function getCommonTagSuggestions() {
  return [
    { id: 'deal-sourcing', label: 'Deal Sourcing' },
    { id: 'valuation', label: 'Valuation' },
    { id: 'due-diligence', label: 'Due Diligence' },
    { id: 'negotiation', label: 'Negotiation' },
    { id: 'financing', label: 'Financing' },
    { id: 'sba-loans', label: 'SBA Loans' },
    { id: 'closing', label: 'Closing' },
    { id: 'seller-financing', label: 'Seller Financing' },
    { id: 'business-planning', label: 'Business Planning' },
    { id: 'legal', label: 'Legal' },
    { id: 'tax', label: 'Tax' },
    { id: 'mindset', label: 'Mindset' },
    { id: 'case-study', label: 'Case Study' },
    { id: 'roi', label: 'ROI' },
    { id: 'marketing', label: 'Marketing' }
  ];
}

/**
 * Returns all available source categories for transcripts.
 * This centralized function ensures consistency across the application.
 */
export function getSourceCategories() {
  return [
    { id: 'protege_call', label: 'Protege Call' },
    { id: 'foundations_call', label: 'Foundations Call' },
    { id: 'mastermind_call', label: 'Mastermind Call' },
    { id: 'rlgl_call', label: 'RLGL Call' },
    { id: 'finance_call', label: 'Finance Call' },
    { id: 'business_acquisitions_summit', label: '2024 Business Acquisitions Summit' },
    { id: 'business_acquisitions_summit_2025', label: '2025 Business Acquisitions Summit' },
    { id: 'reference_material', label: 'Reference Material' },
    { id: 'educational_material', label: 'Educational Material' },
    { id: 'other', label: 'Other' }
  ];
}

export function suggestTagsFromContent(content: string): string[] {
  if (!content || content.length === 0) {
    return [];
  }

  // Define keyword mappings for auto-tagging
  const keywordMappings = [
    { tag: 'deal-sourcing', keywords: ['source', 'broker', 'find deal', 'finding deals', 'lead generation', 'deal flow'] },
    { tag: 'valuation', keywords: ['value', 'multiple', 'ebitda', 'cash flow', 'valuation', 'worth', 'price'] },
    { tag: 'due-diligence', keywords: ['due diligence', 'investigate', 'review', 'verify', 'analysis', 'investigate', 'check'] },
    { tag: 'negotiation', keywords: ['negotiat', 'offer', 'counter', 'terms', 'deal structure', 'agreement'] },
    { tag: 'financing', keywords: ['loan', 'financ', 'fund', 'capital', 'money', 'investment', 'bank'] },
    { tag: 'sba-loans', keywords: ['sba', '7a', '504', 'small business administration'] },
    { tag: 'closing', keywords: ['close', 'sign', 'finalize', 'complete', 'purchase agreement'] },
    { tag: 'seller-financing', keywords: ['seller financ', 'owner financ', 'vendor tak', 'earn out'] },
    { tag: 'business-planning', keywords: ['plan', 'strategy', 'growth', 'forecast', 'projection', 'vision'] },
    { tag: 'legal', keywords: ['attorney', 'lawyer', 'legal', 'contract', 'law', 'regulation', 'compliance'] },
    { tag: 'tax', keywords: ['tax', 'irs', 'deduction', 'asset', 'depreciation', 'write off'] },
    { tag: 'mindset', keywords: ['fear', 'psychology', 'confidence', 'mindset', 'attitude', 'mental'] },
    { tag: 'case-study', keywords: ['example', 'case study', 'story', 'experience', 'deal story'] },
    { tag: 'roi', keywords: ['roi', 'return', 'profit', 'margin', 'investment return', 'payback'] },
    { tag: 'marketing', keywords: ['market', 'advertis', 'promotion', 'customer', 'sales', 'lead'] }
  ];

  // Normalize content for easier matching
  const normalizedContent = content.toLowerCase();
  const detectedTags = new Set<string>();

  // Check for each tag's keywords in content
  keywordMappings.forEach(({ tag, keywords }) => {
    for (const keyword of keywords) {
      if (normalizedContent.includes(keyword.toLowerCase())) {
        detectedTags.add(tag);
        break;
      }
    }
  });

  return Array.from(detectedTags);
}

export function searchTagsByText(query: string, tags: string[]) {
  if (!query || !tags || tags.length === 0) {
    return tags;
  }
  
  const normalizedQuery = query.toLowerCase().trim();
  return tags.filter(tag => tag.toLowerCase().includes(normalizedQuery));
}

export function formatTagForDisplay(tag: string): string {
  // Convert kebab-case to Title Case
  return tag
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatTagForStorage(tag: string): string {
  // Convert to lowercase kebab-case
  return tag
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
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
      const sourceBoost = transcript.source === 'business_acquisitions_summit_2025' ? 2.5 : 
                          transcript.source === 'business_acquisitions_summit' ? 2.0 :
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
    case 'rlgl_call':
      return "Carl Allen's Rich Lose Get Lost call";
    case 'finance_call':
      return "Carl Allen's Finance call";
    case 'creative_dealmaker':
      return "Carl Allen's Creative Dealmaker book";
    case 'case_study':
      return "a case study";
    case 'business_acquisitions_summit':
      return "Carl Allen's 2024 Business Acquisitions Summit";
    case 'business_acquisitions_summit_2025':
      return "Carl Allen's 2025 Business Acquisitions Summit";
    case 'reference_material':
      return "Carl Allen's reference material";
    case 'educational_material':
      return "Carl Allen's educational material";
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
