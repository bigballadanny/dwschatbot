
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Checks if the chat_analytics table exists and has the correct structure
 */
export async function validateAnalyticsTable(): Promise<boolean> {
  try {
    console.log('Validating chat_analytics table structure...');
    
    // Check if the table exists by querying it
    const { error: tableError } = await supabase
      .from('chat_analytics')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.error('Error checking chat_analytics table:', tableError);
      
      // If the error indicates the table doesn't exist
      if (tableError.message.includes('does not exist')) {
        toast({
          title: "Analytics table missing",
          description: "The chat_analytics table does not exist in the database.",
          variant: "destructive"
        });
        return false;
      }
      
      toast({
        title: "Database error",
        description: "Could not validate analytics table structure.",
        variant: "destructive"
      });
      return false;
    }
    
    console.log('Analytics table validation successful');
    return true;
  } catch (err) {
    console.error('Error in validateAnalyticsTable:', err);
    return false;
  }
}

/**
 * Checks for any existing analytics data
 */
export async function checkForExistingData(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('chat_analytics')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error checking for existing data:', error);
      return 0;
    }
    
    console.log(`Found ${count || 0} existing analytics records`);
    return count || 0;
  } catch (err) {
    console.error('Error in checkForExistingData:', err);
    return 0;
  }
}

/**
 * This function attempts to migrate conversation data to analytics table
 * by creating analytics entries for past conversations
 */
export async function migrateConversationDataToAnalytics(): Promise<number> {
  try {
    console.log('Attempting to migrate conversation data to analytics...');
    
    // First get all conversations and their first message (which is usually the query)
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, title, created_at');
    
    if (convError) {
      console.error('Error fetching conversations:', convError);
      return 0;
    }
    
    if (!conversations || conversations.length === 0) {
      console.log('No conversations found to migrate');
      return 0;
    }
    
    console.log(`Found ${conversations.length} conversations to potentially migrate`);
    
    // For each conversation, get the first user message
    let migratedCount = 0;
    const analyticsRecords = [];
    
    for (const conv of conversations) {
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('content, created_at, is_user')
        .eq('conversation_id', conv.id)
        .eq('is_user', true)
        .order('created_at', { ascending: true })
        .limit(1);
      
      if (msgError) {
        console.error(`Error fetching messages for conversation ${conv.id}:`, msgError);
        continue;
      }
      
      if (!messages || messages.length === 0) {
        console.log(`No user messages found for conversation ${conv.id}`);
        continue;
      }
      
      // Get the first AI response to calculate length
      const { data: aiResponses, error: aiError } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', conv.id)
        .eq('is_user', false)
        .order('created_at', { ascending: true })
        .limit(1);
      
      const firstQuery = messages[0].content;
      const responseLength = aiResponses && aiResponses.length > 0 ? aiResponses[0].content.length : 0;
      
      // Create analytics record from conversation data
      analyticsRecords.push({
        query: firstQuery,
        conversation_id: conv.id,
        response_length: responseLength,
        successful: true, // Assume successful since there's a conversation
        source_type: 'historical_migration',
        created_at: messages[0].created_at
      });
      
      migratedCount++;
    }
    
    // Insert the analytics records if there are any
    if (analyticsRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('chat_analytics')
        .insert(analyticsRecords);
      
      if (insertError) {
        console.error('Error inserting migrated analytics records:', insertError);
        return 0;
      }
      
      console.log(`Successfully migrated ${migratedCount} conversation records to analytics`);
    }
    
    return migratedCount;
  } catch (err) {
    console.error('Error in migrateConversationDataToAnalytics:', err);
    return 0;
  }
}

/**
 * Insert sample data for testing if needed
 * Only use this in development environments
 */
export async function insertSampleData(count: number = 5): Promise<boolean> {
  try {
    const sampleQueries = [
      "How do I find businesses for sale?",
      "What is the best structure for an acquisition?",
      "How to negotiate seller financing?",
      "What's a typical SBA loan process?",
      "How to perform due diligence?",
      "What is a roll-up strategy?",
      "How to value a small business?",
      "What are the best SBA lenders?",
      "How to close a business deal?",
      "What to look for in financial statements?"
    ];
    
    const sourceTypes = [
      'protege_call',
      'foundations_call',
      'mastermind_call',
      'business_acquisitions_summit',
      'web',
      'fallback'
    ];
    
    const transcriptTitles = [
      'Financing Strategies for Acquisitions',
      'Seller Psychology Deep Dive',
      'Due Diligence Process',
      'SBA Loan Requirements',
      'Finding Off-Market Deals',
      'Negotiation Tactics',
      null
    ];
    
    const sampleData = Array.from({ length: count }, (_, i) => ({
      query: sampleQueries[Math.floor(Math.random() * sampleQueries.length)],
      source_type: sourceTypes[Math.floor(Math.random() * sourceTypes.length)],
      transcript_title: transcriptTitles[Math.floor(Math.random() * transcriptTitles.length)],
      response_length: Math.floor(Math.random() * 3000) + 500,
      relevance_score: Math.random() * 100,
      search_time_ms: Math.floor(Math.random() * 1000) + 50,
      api_time_ms: Math.floor(Math.random() * 2000) + 200,
      successful: Math.random() > 0.1, // 90% success rate
      conversation_id: crypto.randomUUID(),
      created_at: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
    }));
    
    const { error } = await supabase
      .from('chat_analytics')
      .insert(sampleData);
    
    if (error) {
      console.error('Error inserting sample data:', error);
      return false;
    }
    
    console.log(`Successfully inserted ${count} sample analytics records`);
    return true;
  } catch (err) {
    console.error('Error in insertSampleData:', err);
    return false;
  }
}
