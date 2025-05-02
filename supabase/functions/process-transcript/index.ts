
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

// Create a Supabase client with the Auth context of the function
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Define proper types for metadata and chunks
interface ChunkMetadata {
  position: number;
  parent_id: string | null;
  chunk_strategy: string;
  [key: string]: any;
}

interface TranscriptChunk {
  id: string;
  content: string;
  transcript_id: string;
  chunk_type: 'parent' | 'child';
  topic: string | null;
  metadata: ChunkMetadata;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    // Handle health check requests with enhanced details
    if (payload.health_check === true) {
      console.log("[PROCESS] Received health check request");
      
      // Check Supabase connection as part of health check
      const dbHealthy = await checkDatabaseConnection();
      
      return new Response(JSON.stringify({
        status: dbHealthy ? "healthy" : "database_connection_error",
        timestamp: new Date().toISOString(),
        details: {
          supabase_connection: dbHealthy,
          environment_variables: {
            supabase_url: !!Deno.env.get('SUPABASE_URL'),
            service_role_key: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
          }
        }
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Continue with normal processing
    const { transcript_id } = payload;
    
    if (!transcript_id) {
      console.error("[PROCESS] No transcript ID provided");
      return new Response(JSON.stringify({ 
        error: "No transcript ID provided" 
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`[PROCESS] Starting processing for transcript ${transcript_id}`);
    
    // Fetch the transcript
    const { data: transcript, error: fetchError } = await supabaseAdmin
      .from('transcripts')
      .select('*')
      .eq('id', transcript_id)
      .single();
      
    if (fetchError || !transcript) {
      console.error(`[PROCESS] Error fetching transcript ${transcript_id}:`, fetchError);
      return new Response(JSON.stringify({ 
        error: `Failed to fetch transcript: ${fetchError?.message || 'Not found'}` 
      }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    try {
      // Process the transcript content
      console.log(`[PROCESS] Processing transcript content for ${transcript_id}`);
      
      // 1. If content is missing but file_path exists, try to get content from storage
      if (!transcript.content && transcript.file_path) {
        const fileContent = await getFileContent(transcript.file_path);
        if (fileContent) {
          // Update transcript with content from file
          await supabaseAdmin
            .from('transcripts')
            .update({ content: fileContent })
            .eq('id', transcript_id);
          
          console.log(`[PROCESS] Updated transcript ${transcript_id} with content from file`);
          
          // Update our local copy of the transcript with the new content
          transcript.content = fileContent;
        }
      }
      
      // 2. Apply basic cleanup and standardization to content if needed
      let processedContent = transcript.content || '';
      
      // Simple processing example: Remove excessive whitespace
      processedContent = processedContent
        .replace(/\s+/g, ' ')
        .trim();
      
      // 3. NEW: Apply hierarchical chunking to the transcript
      if (processedContent) {
        console.log(`[PROCESS] Applying hierarchical chunking to transcript ${transcript_id}`);
        
        try {
          // First, remove any existing chunks for this transcript
          const { error: deleteError } = await supabaseAdmin
            .from('chunks')
            .delete()
            .eq('transcript_id', transcript_id);
            
          if (deleteError) {
            console.error(`[PROCESS] Error deleting existing chunks for transcript ${transcript_id}:`, deleteError);
            throw new Error(`Failed to delete existing chunks: ${deleteError.message}`);
          }
          
          // Create parent chunks
          const parentChunks = await createParentChunks(processedContent);
          console.log(`[PROCESS] Created ${parentChunks.length} parent chunks for transcript ${transcript_id}`);
          
          // Create hierarchical chunks (parents and children)
          const hierarchicalChunks = await createHierarchicalChunks(parentChunks, transcript);
          console.log(`[PROCESS] Created ${hierarchicalChunks.length} total hierarchical chunks for transcript ${transcript_id}`);
          
          // Store the chunks in batches
          const BATCH_SIZE = 50;
          for (let i = 0; i < hierarchicalChunks.length; i += BATCH_SIZE) {
            const batch = hierarchicalChunks.slice(i, i + BATCH_SIZE);
            const { error } = await supabaseAdmin
              .from('chunks')
              .insert(batch);
            
            if (error) {
              console.error(`[PROCESS] Error storing chunks batch ${i / BATCH_SIZE + 1}:`, error);
              throw new Error(`Failed to store chunks: ${error.message}`);
            }
          }
          
          console.log(`[PROCESS] Successfully stored all chunks for transcript ${transcript_id}`);
        } catch (chunkError) {
          console.error(`[PROCESS] Chunking error for transcript ${transcript_id}:`, chunkError);
          // Proceed even if chunking fails, to ensure the transcript is marked as processed
        }
      }
      
      // Update the transcript as processed
      const updatedMetadata = {
        ...(transcript.metadata as Record<string, any> || {}),
        processing_completed_at: new Date().toISOString(),
        chunking_strategy: 'hierarchical',
        processing_success: true
      };
      
      const { error: updateError } = await supabaseAdmin
        .from('transcripts')
        .update({ 
          is_processed: true,
          content: processedContent,
          metadata: updatedMetadata
        })
        .eq('id', transcript_id);
        
      if (updateError) {
        throw new Error(`Failed to update transcript: ${updateError.message}`);
      }
      
      console.log(`[PROCESS] Successfully processed transcript ${transcript_id}`);
      
      return new Response(JSON.stringify({ 
        success: true,
        transcript_id,
        processing_status: "completed"
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (processingError) {
      console.error(`[PROCESS] Error processing transcript ${transcript_id}:`, processingError);
      
      // Mark as processed with error
      try {
        await supabaseAdmin
          .from('transcripts')
          .update({ 
            is_processed: true,
            metadata: { 
              ...(transcript.metadata as Record<string, any> || {}),
              processing_completed_at: new Date().toISOString(),
              processing_error: processingError.message,
              processing_failed: true
            } 
          })
          .eq('id', transcript_id);
      } catch (markError) {
        console.error(`[PROCESS] Failed to mark transcript ${transcript_id} as failed:`, markError);
      }
      
      return new Response(JSON.stringify({ 
        error: processingError.message,
        transcript_id
      }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    console.error('[PROCESS] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper function to check database connection
async function checkDatabaseConnection() {
  try {
    // Simple query to check if database connection works
    const { data, error } = await supabaseAdmin.from('transcripts').select('id').limit(1);
    return error === null;
  } catch (e) {
    console.error("Database connection check failed:", e);
    return false;
  }
}

// Helper function to get file content from storage
async function getFileContent(filePath: string): Promise<string | null> {
  try {
    console.log(`[PROCESS] Fetching file content for path: ${filePath}`);
    
    // Ensure the file path is correctly formatted for storage
    let storagePath = filePath;
    if (storagePath.startsWith('transcripts/')) {
      storagePath = storagePath.slice('transcripts/'.length);
    }
    
    // Get file URL
    const { data } = supabaseAdmin.storage
      .from('transcripts')
      .getPublicUrl(storagePath);
    
    if (!data || !data.publicUrl) {
      console.error(`[PROCESS] Error generating public URL for file: No URL returned`);
      return null;
    }
    
    // Fetch the file content
    const response = await fetch(data.publicUrl);
    
    if (!response.ok) {
      console.error(`[PROCESS] Error fetching file: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const content = await response.text();
    console.log(`[PROCESS] Successfully fetched file content (${content.length} characters)`);
    
    return content;
  } catch (error) {
    console.error(`[PROCESS] Error getting file content:`, error);
    return null;
  }
}

/**
 * Create large, topically coherent parent chunks
 */
async function createParentChunks(content: string): Promise<any[]> {
  // Create large, topically coherent parent chunks
  // This is a simplified implementation - in production, you'd use more sophisticated NLP
  const paragraphs = content.split('\n\n');
  
  // Group paragraphs into topically related sections
  let currentTopic = '';
  let currentChunk = '';
  const parentChunks = [];
  
  for (const paragraph of paragraphs) {
    // For this simplified implementation, we'll just use paragraph breaks
    // In a real system, you'd use NLP to detect topic changes
    if (currentChunk.length > 1500) {
      parentChunks.push({
        content: currentChunk,
        topic: currentTopic || 'Unknown',
      });
      currentChunk = paragraph;
      // Extract topic from first sentence for demo purposes
      currentTopic = paragraph.split('.')[0];
    } else {
      currentChunk += '\n\n' + paragraph;
    }
  }
  
  // Add the last chunk
  if (currentChunk) {
    parentChunks.push({
      content: currentChunk,
      topic: currentTopic || 'Unknown',
    });
  }
  
  return parentChunks;
}

/**
 * Create child chunks for each parent
 */
async function createHierarchicalChunks(parentChunks: any[], transcript: any): Promise<TranscriptChunk[]> {
  // Create child chunks for each parent
  const hierarchicalChunks: TranscriptChunk[] = [];
  
  for (let i = 0; i < parentChunks.length; i++) {
    const parentChunk = parentChunks[i];
    const parentId = `${transcript.id}-parent-${i}`;
    
    // Add parent chunk
    hierarchicalChunks.push({
      id: parentId,
      content: parentChunk.content,
      transcript_id: transcript.id,
      chunk_type: 'parent',
      topic: parentChunk.topic,
      metadata: {
        position: i,
        parent_id: null,
        chunk_strategy: 'hierarchical',
      }
    });
    
    // Create child chunks
    const sentences = parentChunk.content.match(/[^.!?]+[.!?]+/g) || [];
    for (let j = 0; j < sentences.length; j++) {
      const sentence = sentences[j].trim();
      if (sentence.split(' ').length > 5) { // Only include substantive sentences
        hierarchicalChunks.push({
          id: `${transcript.id}-child-${i}-${j}`,
          content: sentence,
          transcript_id: transcript.id,
          chunk_type: 'child',
          topic: parentChunk.topic,
          metadata: {
            position: j,
            parent_id: parentId,
            chunk_strategy: 'hierarchical',
          }
        });
      }
    }
  }
  
  return hierarchicalChunks;
}
