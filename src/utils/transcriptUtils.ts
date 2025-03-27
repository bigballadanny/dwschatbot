import { MessageProps } from '@/components/MessageItem';

interface Transcript {
  id: string;
  title: string;
  content: string;
  created_at: string;
  file_path?: string;
  source?: string;
}

// Business-related terms for improved query matching
const BUSINESS_TERMS = [
  'acquisition', 'merger', 'deal', 'negotiation', 'valuation', 
  'due diligence', 'roi', 'financing', 'investor', 'term sheet', 
  'closing', 'loi', 'letter of intent', 'ebitda', 'cash flow',
  'assets', 'liabilities', 'equity', 'debt', 'leverage',
  'buyout', 'owner financing', 'sba', 'bank loan', 'seller note',
  'deal structure', 'earnout', 'installment', 'down payment', 'collateral',
  'business broker', 'multiple', 'valuation', 'funding', 'acquisition entrepreneur',
  'lead generation', 'origination', 'target company', 'seller psychology',
  'roll-up', 'add-on', 'platform acquisition', 'bolt-on', 'holdco',
  'search criteria', 'owner operator', 'management team', 'post-acquisition',
  'integration', 'synergy', 'pro forma', 'working capital', 'performance bonuses'
];

// Context sources with their keywords, weights, and descriptions
const CONTEXT_SOURCES = {
  'protege_call': {
    keywords: ['protege', 'call', 'mentorship', 'guidance', 'advanced'],
    weight: 1.5,
    description: 'Transcripts from Protege Calls with Carl Allen'
  },
  'foundations_call': {
    keywords: ['foundations', 'call', 'basics', 'learning', 'beginners'],
    weight: 1.5,
    description: 'Transcripts from Foundations Calls with Carl Allen'
  },
  'creative_dealmaker': {
    keywords: ['book', 'creative', 'dealmaker', 'chapter'],
    weight: 1.3,
    description: 'Carl Allen\'s "The Creative Dealmaker" book'
  },
  'mastermind_call': {
    keywords: ['mastermind', 'group', 'session', 'qa'],
    weight: 1.4,
    description: 'Carl Allen\'s Mastermind Call transcripts'
  },
  'case_study': {
    keywords: ['case', 'study', 'example', 'real-world'],
    weight: 1.6,
    description: 'Case studies from successful deals'
  }
};

// Detect possible source category from transcript content and title
export const detectSourceCategory = (title: string, content: string): string => {
  const combinedText = (title + ' ' + content).toLowerCase();
  
  const matchedSources = Object.entries(CONTEXT_SOURCES)
    .map(([sourceName, sourceConfig]) => {
      const matchCount = sourceConfig.keywords.reduce((count, keyword) => {
        return count + (combinedText.includes(keyword) ? 1 : 0);
      }, 0);
      
      return { sourceName, matchCount, weight: sourceConfig.weight };
    })
    .filter(item => item.matchCount > 0)
    .sort((a, b) => (b.matchCount * b.weight) - (a.matchCount * a.weight));
  
  // Return the best match or default
  return matchedSources.length > 0 ? matchedSources[0].sourceName : 'protege_call';
};

// Get description for a source category
export const getSourceDescription = (source: string): string => {
  return CONTEXT_SOURCES[source as keyof typeof CONTEXT_SOURCES]?.description || 
    'Transcript from Carl Allen\'s calls';
};

// Get transcript counts by source type
export const getTranscriptCounts = (transcripts: Transcript[]) => {
  const counts = {
    total: transcripts.length,
    protege_call: 0,
    foundations_call: 0, 
    mastermind_call: 0,
    creative_dealmaker: 0,
    case_study: 0,
    other: 0
  };
  
  transcripts.forEach(transcript => {
    const source = transcript.source || 'other';
    if (source in counts) {
      // @ts-ignore - We know these properties exist
      counts[source]++;
    } else {
      counts.other++;
    }
  });
  
  return counts;
};

export const searchTranscriptsForQuery = (
  query: string, 
  transcripts: Transcript[]
): { content: string, title: string, source?: string, relevanceScore: number } | null => {
  if (!transcripts || transcripts.length === 0) {
    console.log('No transcripts available to search');
    return null;
  }

  console.log(`Searching ${transcripts.length} transcripts for query: "${query}"`);
  const lowercaseQuery = query.toLowerCase();
  
  // Extract keywords from the query, with improved filtering
  const stopWords = ['what', 'when', 'where', 'which', 'how', 'does', 'this', 'that', 'with', 'about', 
        'from', 'have', 'will', 'would', 'could', 'should', 'their', 'there', 'and', 'the', 'for', 'are',
        'can', 'you', 'please', 'tell', 'me', 'explain', 'help', 'need', 'want', 'like', 'know'];

  let keywords = lowercaseQuery
    .split(/\s+/)
    .filter(word => 
      word.length > 3 && 
      !stopWords.includes(word)
    );

  // Add matched business terms to keywords
  const businessTermMatches = BUSINESS_TERMS.filter(term => lowercaseQuery.includes(term));
  keywords = [...keywords, ...businessTermMatches];
  
  // Add key phrases (2-3 word combinations that might be significant)
  const words = lowercaseQuery.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    if (!stopWords.includes(words[i]) && !stopWords.includes(words[i+1])) {
      const phrase = words[i] + ' ' + words[i+1];
      if (phrase.length > 6) { // Only add meaningful phrases
        keywords.push(phrase);
      }
    }
  }
  
  // Remove duplicates
  keywords = [...new Set(keywords)];
  
  console.log('Extracted keywords:', keywords);

  // Check if query matches any specific context sources
  const contextSourceMatch = Object.entries(CONTEXT_SOURCES)
    .find(([_, sourceConfig]) => 
      sourceConfig.keywords.some(keyword => lowercaseQuery.includes(keyword))
    );

  // Pre-filter transcripts to only include those with content
  const validTranscripts = transcripts.filter(transcript => 
    transcript.content && transcript.content.length > 0 && transcript.content !== 'PDF file uploaded'
  );
  
  if (validTranscripts.length === 0) {
    console.log('No valid transcripts with content to search');
    return null;
  }

  // Score transcripts based on content relevance
  const scoredTranscripts = validTranscripts
    .map(transcript => {
      const content = transcript.content.toLowerCase();
      const title = transcript.title.toLowerCase();
      let score = 0;

      // Direct phrase match (highest priority)
      if (content.includes(lowercaseQuery)) {
        score += 50;
        
        // Boost even more if it's in a paragraph that seems directly relevant
        const paragraphs = content.split(/\n\n+/);
        for (const paragraph of paragraphs) {
          if (paragraph.includes(lowercaseQuery)) {
            // Check if paragraph has high keyword density
            const keywordMatches = keywords.reduce((count, keyword) => {
              return count + (paragraph.match(new RegExp('\\b' + keyword + '\\b', 'gi')) || []).length;
            }, 0);
            
            if (keywordMatches >= 2) {
              score += 25; // This paragraph is highly relevant
              break;
            }
          }
        }
      }

      // Score based on keyword matches in title and content
      keywords.forEach(keyword => {
        // Title matches are weighted more heavily
        const titleMatches = (title.match(new RegExp('\\b' + keyword + '\\b', 'gi')) || []).length;
        score += titleMatches * 8;
        
        // Content matches - consider density and proximity
        const contentMatches = (content.match(new RegExp('\\b' + keyword + '\\b', 'gi')) || []).length;
        // Adjust for content length to avoid bias toward longer documents
        const normalizedMatches = contentMatches / Math.sqrt(content.length / 500);
        score += normalizedMatches * 2;
      });
      
      // Check for co-occurrence of keywords in the same paragraphs (signals relevance)
      if (keywords.length > 1) {
        const paragraphs = content.split(/\n\n+/);
        for (const paragraph of paragraphs) {
          let keywordsInParagraph = 0;
          keywords.forEach(keyword => {
            if (paragraph.includes(keyword)) keywordsInParagraph++;
          });
          
          if (keywordsInParagraph >= 2) {
            // Bonus for paragraphs with multiple keywords (indicates relevance)
            score += keywordsInParagraph * 5;
          }
        }
      }

      // Apply source-specific weight boost if applicable
      if (contextSourceMatch) {
        const [sourceName, sourceConfig] = contextSourceMatch;
        if (transcript.source === sourceName || 
            sourceConfig.keywords.some(k => content.includes(k) || title.includes(k))) {
          score *= sourceConfig.weight;
        }
      }

      // Boost relevance of recent transcripts slightly
      const transcriptDate = new Date(transcript.created_at);
      const now = new Date();
      const ageInDays = (now.getTime() - transcriptDate.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays < 30) {
        score *= 1.1; // 10% boost for recent transcripts
      }

      return { transcript, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  console.log(`Found ${scoredTranscripts.length} matching transcripts`);
  
  if (scoredTranscripts.length === 0) return null;

  // Log the top 3 matches for debugging
  scoredTranscripts.slice(0, 3).forEach((item, index) => {
    console.log(`Match #${index + 1}: "${item.transcript.title}" (score: ${item.score})`);
  });

  const bestMatch = scoredTranscripts[0].transcript;
  
  // Extract the most relevant section for the query
  let extractedContent = bestMatch.content;
  let relevanceScore = scoredTranscripts[0].score;
  
  if (extractedContent.length > 3000) {
    // Find the most relevant paragraph
    const paragraphs = extractedContent.split(/\n\n+/);
    const scoredParagraphs = paragraphs.map(paragraph => {
      let score = 0;
      const paragraphLower = paragraph.toLowerCase();
      
      // Direct query match is highest priority
      if (paragraphLower.includes(lowercaseQuery)) {
        score += 50;
      }
      
      // Score keyword matches
      keywords.forEach(keyword => {
        const matches = (paragraphLower.match(new RegExp('\\b' + keyword + '\\b', 'gi')) || []).length;
        score += matches * 2;
      });
      
      // Bonus for business terms
      businessTermMatches.forEach(term => {
        if (paragraphLower.includes(term)) {
          score += 5;
        }
      });
      
      return { paragraph, score };
    }).sort((a, b) => b.score - a.score);
    
    if (scoredParagraphs.length > 0 && scoredParagraphs[0].score > 0) {
      // Get the most relevant paragraph and some context around it
      const bestParagraphIndex = paragraphs.findIndex(p => p === scoredParagraphs[0].paragraph);
      
      // More context for better coherence
      let contextStart = Math.max(0, bestParagraphIndex - 2);
      let contextEnd = Math.min(paragraphs.length - 1, bestParagraphIndex + 3);
      
      // If we're near the start of the document, include more paragraphs after
      if (bestParagraphIndex < 2) {
        contextEnd = Math.min(paragraphs.length - 1, contextStart + 5);
      }
      // If we're near the end, include more paragraphs before
      else if (bestParagraphIndex > paragraphs.length - 3) {
        contextStart = Math.max(0, contextEnd - 5);
      }
      
      extractedContent = paragraphs.slice(contextStart, contextEnd + 1).join('\n\n');
      
      // If the content is still too long, try to keep the most relevant sections
      if (extractedContent.length > 3000) {
        // Get the top 2-3 most relevant paragraphs instead
        const topParagraphs = scoredParagraphs.slice(0, 3)
          .map(item => item.paragraph)
          .join('\n\n');
        
        // Add some context from the beginning of the document for topics/setting
        const introduction = paragraphs.slice(0, 2).join('\n\n');
        
        extractedContent = introduction + '\n\n' + topParagraphs;
        
        // If still too long, truncate but try to keep whole sentences
        if (extractedContent.length > 3000) {
          const sentences = extractedContent.split(/(?<=[.!?])\s+/);
          let resultContent = "";
          let currentLength = 0;
          
          for (const sentence of sentences) {
            if (currentLength + sentence.length <= 3000) {
              resultContent += sentence + " ";
              currentLength += sentence.length + 1;
            } else {
              break;
            }
          }
          
          extractedContent = resultContent.trim();
        }
      }
    } else {
      // If no relevant paragraph found, use the beginning of the content
      extractedContent = extractedContent.substring(0, 3000) + '...';
    }
  }

  return {
    content: extractedContent,
    title: bestMatch.title,
    source: bestMatch.source || 'protege_call',
    relevanceScore
  };
};

export const generateSummaryResponse = (content: string, query: string): string => {
  const keywords = query.toLowerCase().split(' ').filter(word => 
    word.length > 3 && !['what', 'when', 'where', 'which', 'how', 'does', 'this', 'that', 'with', 'about'].includes(word)
  );

  if (keywords.length === 0 || !content) {
    return "I found some information but couldn't generate a relevant summary. Could you be more specific in your question?";
  }

  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);

  const scoredParagraphs = paragraphs.map(paragraph => {
    const paragraphLower = paragraph.toLowerCase();
    let score = 0;

    keywords.forEach(keyword => {
      if (paragraphLower.includes(keyword)) {
        score += 1;
      }
    });

    return { paragraph, score };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scoredParagraphs.length === 0) {
    if (content.length > 1000) {
      return `I found a transcript that might be relevant, but couldn't identify the most important sections. Here's a portion of the content:\n\n${content.substring(0, 500)}...\n\nCould you ask a more specific question?`;
    } else {
      return content;
    }
  }

  const isSummaryRequest = query.toLowerCase().includes('summary') || 
                          query.toLowerCase().includes('summarize') ||
                          query.toLowerCase().includes('overview') ||
                          query.toLowerCase().includes('main points');

  if (isSummaryRequest) {
    const topParagraphs = scoredParagraphs.slice(0, Math.min(3, scoredParagraphs.length));

    return `Here's a summary based on the transcript:\n\n${topParagraphs.map(item => 
      item.paragraph.length > 300 ? item.paragraph.substring(0, 300) + '...' : item.paragraph
    ).join('\n\n')}\n\nThese are the key sections I found relevant to your query. Would you like more specific information on any particular aspect?`;
  } else {
    const mostRelevantParagraph = scoredParagraphs[0].paragraph;

    const mostRelevantIndex = paragraphs.findIndex(p => p === mostRelevantParagraph);

    let response = "Based on the information I found:\n\n";

    if (mostRelevantIndex > 0) {
      const prevParagraph = paragraphs[mostRelevantIndex - 1];
      if (prevParagraph && prevParagraph.length < 200) {
        response += prevParagraph + "\n\n";
      }
    }

    response += mostRelevantParagraph;

    if (mostRelevantIndex < paragraphs.length - 1) {
      const nextParagraph = paragraphs[mostRelevantIndex + 1];
      if (nextParagraph && nextParagraph.length < 200) {
        response += "\n\n" + nextParagraph;
      }
    }

    return response;
  }
};
