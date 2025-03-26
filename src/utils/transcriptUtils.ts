import { MessageProps } from '@/components/MessageItem';

interface Transcript {
  id: string;
  title: string;
  content: string;
  created_at: string;
  file_path?: string;
  source?: string;
}

const BUSINESS_TERMS = [
  'acquisition', 'deal', 'negotiate', 'diligence', 'finance', 
  'purchase', 'business', 'seller', 'buyer', 'agreement', 
  'contract', 'creative', 'dealmaker', 'valuation', 'strategy'
];

const CONTEXT_SOURCES = {
  'creative_dealmaker': {
    keywords: ['carl allen', 'creative dealmaker', 'book'],
    weight: 2.0
  },
  'mastermind_call': {
    keywords: ['mastermind', 'call', 'transcript'],
    weight: 1.5
  }
};

export const searchTranscriptsForQuery = (
  query: string, 
  transcripts: Transcript[]
): { content: string, title: string, source?: string } | null => {
  if (!transcripts || transcripts.length === 0) return null;

  const lowercaseQuery = query.toLowerCase();
  
  const keywords = lowercaseQuery
    .split(/\s+/)
    .filter(word => 
      word.length > 3 && 
      !['what', 'when', 'where', 'which', 'how', 'does', 'this', 'that', 'with', 'about'].includes(word)
    );

  keywords.push(...BUSINESS_TERMS.filter(term => lowercaseQuery.includes(term)));

  const contextSourceMatch = Object.entries(CONTEXT_SOURCES)
    .find(([_, sourceConfig]) => 
      sourceConfig.keywords.some(keyword => lowercaseQuery.includes(keyword))
    );

  const scoredTranscripts = transcripts
    .filter(transcript => transcript.content)
    .map(transcript => {
      const content = transcript.content.toLowerCase();
      const title = transcript.title.toLowerCase();
      let score = 0;

      keywords.forEach(keyword => {
        const titleMatches = (title.match(new RegExp(keyword, 'gi')) || []).length;
        const contentMatches = (content.match(new RegExp(keyword, 'gi')) || []).length;
        
        score += titleMatches * 3 + contentMatches;
      });

      if (contextSourceMatch) {
        const [sourceName, sourceConfig] = contextSourceMatch;
        if (sourceConfig.keywords.some(k => content.includes(k) || title.includes(k))) {
          score *= sourceConfig.weight;
        }
      }

      return { transcript, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scoredTranscripts.length === 0) return null;

  const bestMatch = scoredTranscripts[0].transcript;
  const extractedContent = bestMatch.content.length > 500 
    ? bestMatch.content.substring(0, 500) + '...' 
    : bestMatch.content;

  return {
    content: extractedContent,
    title: bestMatch.title,
    source: bestMatch.source || 'creative_dealmaker'
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
