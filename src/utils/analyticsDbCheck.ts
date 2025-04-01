
import { supabase } from '@/integrations/supabase/client';

export async function checkAnalyticsTable() {
  try {
    console.log('Validating chat_analytics table structure...');
    
    // First check if the table exists by trying to query it
    const { data, error } = await supabase
      .from('chat_analytics')
      .select('id')
      .limit(1);
    
    if (error) {
      console.warn('Analytics table might not exist:', error.message);
      
      // Call the edge function to create the table
      const { data: setupResult, error: setupError } = await supabase.functions.invoke('analytics-setup');
      
      if (setupError) {
        console.error('Failed to set up analytics table:', setupError);
        return false;
      }
      
      if (setupResult?.success) {
        console.log('Analytics table created successfully');
        
        // Check if we should add sample data for testing
        if (import.meta.env.DEV && setupResult?.tableExists === false) {
          await generateSampleAnalyticsData();
        }
        
        return true;
      } else {
        console.error('Analytics table setup failed:', setupResult?.message);
        return false;
      }
    } else {
      console.log('Analytics table validation successful');
      
      // If table exists but is empty and we're in development, add sample data
      if (import.meta.env.DEV && (!data || data.length === 0)) {
        const { count } = await supabase
          .from('chat_analytics')
          .select('*', { count: 'exact', head: true });
          
        if (count === 0) {
          console.log('Analytics table is empty, adding sample data for development');
          await generateSampleAnalyticsData();
        }
      }
      
      return true;
    }
  } catch (err) {
    console.error('Error validating analytics table:', err);
    return false;
  }
}

async function generateSampleAnalyticsData() {
  console.log('Generating sample analytics data...');
  
  const sourceTypes = ['mastermind_call', 'foundations_call', 'protege_call', 'business_acquisitions_summit', 'fallback', 'web'];
  const transcriptTitles = [
    'Mastermind Call - April 2024', 
    'Foundations Call - Business Valuation', 
    'Protege Call - Financing Options',
    'Business Acquisition Summit - Keynote',
    'Deal Structuring Workshop'
  ];
  
  const sampleQueries = [
    'How do I finance a business acquisition?',
    'What are the steps in due diligence?',
    'How to value a business?',
    'Explain seller financing',
    'How to find off-market deals?',
    'SBA loan requirements',
    'Roll-up strategy explained',
    'Best industries for acquisition',
    'How to negotiate with sellers',
    'Asset vs stock purchase differences'
  ];
  
  // Create sample conversations
  const { data: conversations } = await supabase.from('conversations').select('id').limit(3);
  
  // Use existing conversations or a placeholder
  const conversationIds = conversations && conversations.length > 0 
    ? conversations.map(c => c.id) 
    : [null];
  
  // Generate 50 sample analytics entries spread over the last 30 days
  const sampleData = [];
  
  for (let i = 0; i < 50; i++) {
    // Random date in the last 30 days
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    
    const successful = Math.random() > 0.1; // 90% success rate
    
    sampleData.push({
      conversation_id: conversationIds[Math.floor(Math.random() * conversationIds.length)],
      query: sampleQueries[Math.floor(Math.random() * sampleQueries.length)],
      response_length: successful ? Math.floor(Math.random() * 1000) + 500 : null,
      source_type: sourceTypes[Math.floor(Math.random() * sourceTypes.length)],
      relevance_score: successful ? (Math.random() * 0.5) + 0.5 : null, // 0.5-1.0
      search_time_ms: successful ? Math.floor(Math.random() * 500) + 100 : null,
      api_time_ms: successful ? Math.floor(Math.random() * 2000) + 500 : null,
      successful: successful,
      transcript_title: successful ? transcriptTitles[Math.floor(Math.random() * transcriptTitles.length)] : null,
      error_message: successful ? null : 'Could not find relevant information',
      used_online_search: Math.random() > 0.7, // 30% use online search
      created_at: date.toISOString()
    });
  }
  
  // Insert data in batches of 10
  for (let i = 0; i < sampleData.length; i += 10) {
    const batch = sampleData.slice(i, i + 10);
    const { error } = await supabase.from('chat_analytics').insert(batch);
    
    if (error) {
      console.error('Error inserting sample analytics data:', error);
    }
  }
  
  console.log(`Generated ${sampleData.length} sample analytics records`);
}
