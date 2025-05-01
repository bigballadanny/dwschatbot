
import { supabase } from '@/integrations/supabase/client';

/**
 * Checks environment status for transcript processing
 */
export async function checkEnvironmentVariables() {
  try {
    // Call the edge function to check environment status
    const { data, error } = await supabase.functions.invoke('check-environment', {
      method: 'GET'
    });
    
    if (error) {
      console.error('Error checking environment:', error);
      return {
        systemStatus: 'error',
        transcriptProcessingEnabled: false,
        supabaseConfigured: false
      };
    }
    
    // Return simplified status
    return data.status || {
      systemStatus: 'unknown',
      transcriptProcessingEnabled: false,
      supabaseConfigured: false
    };
  } catch (error) {
    console.error('Error checking environment:', error);
    return {
      systemStatus: 'error',
      transcriptProcessingEnabled: false,
      supabaseConfigured: false
    };
  }
}
