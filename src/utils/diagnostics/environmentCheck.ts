
import { supabase } from '@/integrations/supabase/client';

/**
 * Check the status of various environment components
 * @returns Object with status of database, storage, and edge functions
 */
export const checkEnvironmentStatus = async (): Promise<{
  database: boolean;
  storage: boolean;
  edgeFunctions: boolean;
}> => {
  try {
    // Test database connection
    const { error: dbError } = await supabase
      .from('transcripts')
      .select('id')
      .limit(1);

    // Test storage connection
    const { error: storageError } = await supabase.storage
      .from('transcripts')
      .list('', { limit: 1 });

    // Test edge functions connection using a simple health check
    let edgeFunctionTest = false;
    try {
      const { error: funcError } = await supabase.functions.invoke('transcript-processing-health');
      edgeFunctionTest = !funcError;
    } catch (e) {
      edgeFunctionTest = false;
    }

    return {
      database: !dbError,
      storage: !storageError,
      edgeFunctions: edgeFunctionTest,
    };
  } catch (error) {
    console.error('Error checking environment:', error);
    return {
      database: false,
      storage: false,
      edgeFunctions: false,
    };
  }
};
