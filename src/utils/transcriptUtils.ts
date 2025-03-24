
interface Transcript {
  id: string;
  title: string;
  content: string;
  created_at: string;
  file_path?: string;
}

/**
 * Search through transcripts for content matching the query
 */
export const searchTranscriptsForQuery = (
  query: string, 
  transcripts: Transcript[]
): { content: string, title: string } | null => {
  if (!transcripts || transcripts.length === 0) {
    return null;
  }
  
  // Enhanced keyword extraction - include common business acquisition terms
  const lowercaseQuery = query.toLowerCase();
  const businessTerms = [
    'acquisition', 'deal', 'negotiate', 'diligence', 'finance', 'purchase', 
    'business', 'seller', 'buyer', 'agreement', 'contract', 'creative', 'dealmaker'
  ];
  
  // Check if query explicitly mentions the book
  const isBookQuery = lowercaseQuery.includes('book') || 
                      lowercaseQuery.includes('creative dealmaker') || 
                      lowercaseQuery.includes('carl allen');
                      
  // Extract keywords from query
  const keywords = query.toLowerCase().split(' ').filter(word => 
    word.length > 3 && !['what', 'when', 'where', 'which', 'how', 'does', 'this', 'that', 'with', 'about'].includes(word)
  );
  
  // Add business-specific terms that appear in the query
  businessTerms.forEach(term => {
    if (lowercaseQuery.includes(term) && !keywords.includes(term)) {
      keywords.push(term);
    }
  });
  
  if (keywords.length === 0 && !isBookQuery) return null;
  
  // Score each transcript by number of keyword matches
  const scoredTranscripts = transcripts
    .filter(transcript => transcript.content) // Ensure content exists
    .map(transcript => {
      const content = transcript.content.toLowerCase();
      let score = 0;
      let matches = 0;
      
      // Boost score for transcripts with titles matching keywords
      const lowercaseTitle = transcript.title.toLowerCase();
      keywords.forEach(keyword => {
        if (lowercaseTitle.includes(keyword)) {
          score += 5; // Higher weight for title matches
          matches++;
        }
      });
      
      // Calculate score based on keyword frequency in content
      keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const count = (content.match(regex) || []).length;
        if (count > 0) {
          matches++;
          score += count;
        }
      });
      
      // Boost score if all keywords are found
      if (matches === keywords.length) {
        score *= 2;
      }
      
      // Boost score if explicitly about the book and transcript mentions book
      if (isBookQuery && (content.includes('book') || content.includes('creative dealmaker'))) {
        score += 10;
      }
      
      return {
        transcript,
        score,
        matches
      };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
  
  if (scoredTranscripts.length === 0) return null;
  
  // Get the highest scoring transcript
  const bestMatch = scoredTranscripts[0];
  
  // Extract the most relevant sections
  const content = bestMatch.transcript.content;
  const paragraphs = content.split('\n\n');
  
  // Find paragraphs that contain the keywords
  const relevantParagraphs = paragraphs.filter(paragraph => {
    const lowercaseParagraph = paragraph.toLowerCase();
    return keywords.some(keyword => lowercaseParagraph.includes(keyword));
  });
  
  // If we have relevant paragraphs, use them; otherwise use the whole content
  const extractedContent = relevantParagraphs.length > 0 
    ? relevantParagraphs.join('\n\n')
    : content;
  
  // Return the best matching content with context
  return {
    content: `This information is from "The Creative Dealmaker" by Carl Allen:\n\n${extractedContent}`,
    title: bestMatch.transcript.title
  };
};

/**
 * Generate a summarized response based on transcript content and user query
 */
export const generateSummaryResponse = (content: string, query: string): string => {
  // Identify relevant sections by looking for paragraphs containing query keywords
  const keywords = query.toLowerCase().split(' ').filter(word => 
    word.length > 3 && !['what', 'when', 'where', 'which', 'how', 'does', 'this', 'that', 'with', 'about'].includes(word)
  );
  
  if (keywords.length === 0 || !content) {
    return "I found some information but couldn't generate a relevant summary. Could you be more specific in your question?";
  }
  
  // Split content into paragraphs
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  // Score paragraphs by keyword relevance
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
    // No direct paragraph matches, try to extract some content anyway
    if (content.length > 1000) {
      return `I found a transcript that might be relevant, but couldn't identify the most important sections. Here's a portion of the content:\n\n${content.substring(0, 500)}...\n\nCould you ask a more specific question?`;
    } else {
      return content;
    }
  }
  
  // Determine if query is asking for a summary
  const isSummaryRequest = query.toLowerCase().includes('summary') || 
                          query.toLowerCase().includes('summarize') ||
                          query.toLowerCase().includes('overview') ||
                          query.toLowerCase().includes('main points');
  
  if (isSummaryRequest) {
    // For summary requests, take top relevant paragraphs and create a summary
    const topParagraphs = scoredParagraphs.slice(0, Math.min(3, scoredParagraphs.length));
    
    return `Here's a summary based on the transcript:\n\n${topParagraphs.map(item => 
      item.paragraph.length > 300 ? item.paragraph.substring(0, 300) + '...' : item.paragraph
    ).join('\n\n')}\n\nThese are the key sections I found relevant to your query. Would you like more specific information on any particular aspect?`;
  } else {
    // For specific questions, prioritize the most relevant paragraph
    const mostRelevantParagraph = scoredParagraphs[0].paragraph;
    
    // Extract context by including surrounding paragraphs if available
    const mostRelevantIndex = paragraphs.findIndex(p => p === mostRelevantParagraph);
    
    let response = "Based on the information I found:\n\n";
    
    // Add previous paragraph for context if available
    if (mostRelevantIndex > 0) {
      const prevParagraph = paragraphs[mostRelevantIndex - 1];
      if (prevParagraph && prevParagraph.length < 200) {
        response += prevParagraph + "\n\n";
      }
    }
    
    // Add the most relevant paragraph
    response += mostRelevantParagraph;
    
    // Add next paragraph for additional context if available
    if (mostRelevantIndex < paragraphs.length - 1) {
      const nextParagraph = paragraphs[mostRelevantIndex + 1];
      if (nextParagraph && nextParagraph.length < 200) {
        response += "\n\n" + nextParagraph;
      }
    }
    
    return response;
  }
};
