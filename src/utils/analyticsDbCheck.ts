
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
        console.log('Analytics table validation successful');
        return true;
      } else {
        console.error('Analytics table setup failed:', setupResult?.message);
        return false;
      }
    }
    
    console.log('Analytics table validation successful');
    return true;
  } catch (err) {
    console.error('Error validating analytics table:', err);
    return false;
  }
}
