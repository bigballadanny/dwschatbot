
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export async function migrateConversationDataToAnalytics(): Promise<number> {
  try {
    console.log('Attempting to migrate conversation data to analytics...');
    
    // First get all conversations and their first message
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, title, created_at');
    
    if (convError) {
      console.error('Error fetching conversations:', convError);
      toast({
        title: "Migration Error",
        description: "Could not fetch conversation data.",
        variant: "destructive"
      });
      return 0;
    }
    
    if (!conversations || conversations.length === 0) {
      console.log('No conversations found to migrate');
      toast({
        title: "No Data",
        description: "No conversation history found to migrate.",
        variant: "default"
      });
      return 0;
    }
    
    console.log(`Found ${conversations.length} conversations to potentially migrate`);
    
    let migratedCount = 0;
    const analyticsRecords = [];
    
    // Batch processing to reduce database load
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
      
      const firstQuery = messages[0].content;
      
      // Limit migration to prevent overwhelming the analytics table
      if (migratedCount >= 500) break;
      
      analyticsRecords.push({
        query: firstQuery,
        conversation_id: conv.id,
        source_type: 'historical_migration',
        successful: true,
        created_at: messages[0].created_at
      });
      
      migratedCount++;
    }
    
    if (analyticsRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('chat_analytics')
        .insert(analyticsRecords);
      
      if (insertError) {
        console.error('Error inserting migrated analytics records:', insertError);
        toast({
          title: "Migration Failed",
          description: "Could not insert analytics records.",
          variant: "destructive"
        });
        return 0;
      }
      
      toast({
        title: "Migration Successful",
        description: `Successfully migrated ${migratedCount} conversation records to analytics.`,
        variant: "default"
      });
    }
    
    return migratedCount;
  } catch (err) {
    console.error('Unexpected error in data migration:', err);
    toast({
      title: "Unexpected Error",
      description: "An unexpected error occurred during migration.",
      variant: "destructive"
    });
    return 0;
  }
}
