
import { supabase } from '@/integrations/supabase/client';

/**
 * Checks environment status for transcript processing
 */
export async function checkEnvironmentVariables() {
  try {
    // Call the edge function to check environment status
    const { data, error } = await supabase.functions.invoke('process-transcript', {
      body: { health_check: true }
    });
    
    if (error) {
      console.error('[ENV_CHECK] Error checking environment:', error);
      return {
        systemStatus: 'error',
        transcriptProcessingEnabled: false,
        supabaseConfigured: false,
        error: error.message
      };
    }
    
    console.log('[ENV_CHECK] Health check response:', data);
    
    // Return simplified status
    return {
      systemStatus: data.status === 'healthy' ? 'healthy' : 'error',
      transcriptProcessingEnabled: data.status === 'healthy',
      supabaseConfigured: !!data.details?.supabase_connection,
      environmentVariables: data.details?.environment_variables || {},
      timestamp: data.timestamp,
      details: data.details
    };
  } catch (error) {
    console.error('[ENV_CHECK] Error checking environment:', error);
    return {
      systemStatus: 'error',
      transcriptProcessingEnabled: false,
      supabaseConfigured: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Tests the transcript-webhook edge function
 */
export async function testWebhookEndpoint() {
  try {
    // Send a test request to the webhook endpoint
    const { data, error } = await supabase.functions.invoke('transcript-webhook', {
      body: { type: 'HEALTH_CHECK' }
    });
    
    if (error) {
      console.error('[ENV_CHECK] Error testing webhook endpoint:', error);
      return {
        success: false,
        error: error.message
      };
    }
    
    console.log('[ENV_CHECK] Webhook test response:', data);
    
    return {
      success: true,
      status: data?.status || 'ok',
      timestamp: data?.timestamp
    };
  } catch (error) {
    console.error('[ENV_CHECK] Error testing webhook endpoint:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
