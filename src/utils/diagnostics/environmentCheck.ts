
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

/**
 * Check the health of transcript processing systems
 */
export async function checkSystemHealth() {
  console.log('Checking system health...');
  
  try {
    // Check if webhook function is accessible
    const webhookCheck = await checkWebhookFunction();
    
    // Check if process-transcript function is accessible
    const processCheck = await checkProcessFunction();
    
    // Check storage bucket configuration
    const storageCheck = await checkStorageBucket();
    
    // Check transcript statistics
    const transcriptStats = await getTranscriptStatistics();
    
    // Compile health report
    const health = {
      healthy: webhookCheck.healthy && processCheck.healthy && storageCheck.exists,
      issues: [
        ...(!webhookCheck.healthy ? [`Webhook function issue: ${webhookCheck.message}`] : []),
        ...(!processCheck.healthy ? [`Process function issue: ${processCheck.message}`] : []),
        ...(!storageCheck.exists ? ['Storage bucket does not exist'] : []),
        ...(!storageCheck.isPublic ? ['Storage bucket is not public'] : []),
        ...(transcriptStats.unprocessed > 0 ? [`${transcriptStats.unprocessed} unprocessed transcripts`] : [])
      ],
      details: {
        webhook: webhookCheck,
        processFunction: processCheck,
        storage: storageCheck,
        statistics: transcriptStats
      }
    };
    
    console.log('Health check result:', health);
    
    return health;
  } catch (error: any) {
    console.error('Error checking system health:', error);
    return {
      healthy: false,
      issues: [`Error checking system health: ${error.message}`],
      details: { error: error.message }
    };
  }
}

/**
 * Check if webhook function is accessible
 */
async function checkWebhookFunction() {
  try {
    console.log('Checking webhook function...');
    const { data, error } = await supabase.functions.invoke('transcript-webhook', {
      body: { type: 'HEALTH_CHECK' }
    });
    
    if (error) {
      console.error('Webhook function error:', error);
      return {
        healthy: false,
        message: error.message,
        error
      };
    }
    
    return {
      healthy: true,
      status: data?.status || 'ok',
      timestamp: data?.timestamp
    };
  } catch (error: any) {
    console.error('Error checking webhook function:', error);
    return {
      healthy: false,
      message: error.message,
      error
    };
  }
}

/**
 * Check if process-transcript function is accessible
 */
async function checkProcessFunction() {
  try {
    console.log('Checking process-transcript function...');
    const { data, error } = await supabase.functions.invoke('process-transcript', {
      body: { health_check: true }
    });
    
    if (error) {
      console.error('Process function error:', error);
      return {
        healthy: false,
        message: error.message,
        error
      };
    }
    
    return {
      healthy: true,
      status: data?.status || 'ok',
      timestamp: data?.timestamp
    };
  } catch (error: any) {
    console.error('Error checking process function:', error);
    return {
      healthy: false,
      message: error.message,
      error
    };
  }
}

/**
 * Check storage bucket configuration
 */
async function checkStorageBucket() {
  try {
    console.log('Checking storage bucket...');
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      return {
        exists: false,
        isPublic: false,
        error: error.message
      };
    }
    
    const transcriptsBucket = buckets?.find(bucket => bucket.name === 'transcripts');
    
    return {
      exists: !!transcriptsBucket,
      isPublic: transcriptsBucket ? !!transcriptsBucket.public : false
    };
  } catch (error: any) {
    console.error('Error checking storage bucket:', error);
    return {
      exists: false,
      isPublic: false,
      error: error.message
    };
  }
}

/**
 * Get transcript statistics
 */
async function getTranscriptStatistics() {
  try {
    console.log('Getting transcript statistics...');
    const { data, error } = await supabase
      .from('transcripts')
      .select('is_processed, is_summarized');
    
    if (error) {
      console.error('Error getting transcript statistics:', error);
      return {
        total: 0,
        processed: 0,
        unprocessed: 0,
        summarized: 0,
        processedPercent: 0
      };
    }
    
    const total = data?.length || 0;
    const processed = data?.filter(t => t.is_processed).length || 0;
    const unprocessed = total - processed;
    const summarized = data?.filter(t => t.is_summarized).length || 0;
    
    return {
      total,
      processed,
      unprocessed,
      summarized,
      processedPercent: total > 0 ? Math.round((processed / total) * 100) : 0
    };
  } catch (error) {
    console.error('Error getting transcript statistics:', error);
    return {
      total: 0,
      processed: 0,
      unprocessed: 0,
      summarized: 0,
      processedPercent: 0
    };
  }
}
