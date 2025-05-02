
// Hierarchical Chunking Edge Function
// This function processes a transcript with hierarchical chunking strategy

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body
    const { transcriptId } = await req.json();

    if (!transcriptId) {
      return new Response(
        JSON.stringify({ error: 'Transcript ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[HIERARCHICAL] Received request to process transcript ${transcriptId} with hierarchical chunking`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[HIERARCHICAL] Missing Supabase environment variables');
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Get the transcript
    const { data: transcript, error: getError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('id', transcriptId)
      .single();
    
    if (getError || !transcript) {
      console.error(`[HIERARCHICAL] Error fetching transcript ${transcriptId}:`, getError?.message || 'Not found');
      return new Response(
        JSON.stringify({ error: getError?.message || 'Transcript not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log(`[HIERARCHICAL] Found transcript ${transcriptId}: "${transcript.title}"`);

    // Clear existing chunks
    const { error: deleteError } = await supabase
      .from('chunks')
      .delete()
      .eq('transcript_id', transcriptId);
    
    if (deleteError) {
      console.error(`[HIERARCHICAL] Error clearing existing chunks for ${transcriptId}:`, deleteError);
      return new Response(
        JSON.stringify({ error: `Failed to clear existing chunks: ${deleteError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`[HIERARCHICAL] Cleared existing chunks for transcript ${transcriptId}`);

    // Create parent chunks (simplified algorithm)
    const content = transcript.content || '';
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
    
    if (paragraphs.length === 0) {
      console.error(`[HIERARCHICAL] No content to chunk for transcript ${transcriptId}`);
      return new Response(
        JSON.stringify({ error: 'No content to chunk' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Determine how many parent chunks to create (aim for ~3-5 paragraphs per parent)
    const numParents = Math.max(3, Math.ceil(paragraphs.length / 5));
    const parentChunks = [];
    const allChunks = [];
    
    for (let i = 0; i < numParents; i++) {
      const startIdx = Math.floor((i * paragraphs.length) / numParents);
      const endIdx = Math.floor(((i + 1) * paragraphs.length) / numParents);
      const parentParagraphs = paragraphs.slice(startIdx, endIdx);
      
      const parentContent = parentParagraphs.join('\n\n');
      // Use proper UUIDs instead of concatenating strings
      const parentId = uuidv4();
      const topic = `Topic ${i + 1}`;
      
      // Add parent chunk
      parentChunks.push({
        id: parentId,
        content: parentContent,
        transcript_id: transcriptId,
        chunk_type: 'parent',
        topic: topic,
        metadata: {
          position: i,
          parent_id: null,
          chunk_strategy: 'hierarchical',
          implementation: 'edge-function'
        }
      });
      allChunks.push({
        id: parentId,
        content: parentContent,
        transcript_id: transcriptId,
        chunk_type: 'parent',
        topic: topic,
        metadata: {
          position: i,
          parent_id: null,
          chunk_strategy: 'hierarchical',
          implementation: 'edge-function'
        }
      });
      
      // Create child chunks by sentences
      const sentences = parentContent.match(/[^.!?]+[.!?]+/g) || [];
      const numChildren = Math.min(5, sentences.length);
      
      for (let j = 0; j < numChildren; j++) {
        const sentence = sentences[j] ? sentences[j].trim() : `Child chunk ${j + 1} content`;
        
        allChunks.push({
          id: uuidv4(), // Generate proper UUID for child chunks
          content: sentence,
          transcript_id: transcriptId,
          chunk_type: 'child',
          topic: null,
          metadata: {
            position: j,
            parent_id: parentId,
            chunk_strategy: 'hierarchical',
            implementation: 'edge-function'
          }
        });
      }
    }

    // Insert all chunks
    if (allChunks.length > 0) {
      // Store in batches to avoid payload limits
      const BATCH_SIZE = 20;
      let insertErrors = [];
      
      for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
        const batch = allChunks.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
          .from('chunks')
          .insert(batch);
          
        if (insertError) {
          console.error(`[HIERARCHICAL] Error inserting chunk batch for ${transcriptId}:`, insertError);
          insertErrors.push(insertError.message);
        }
      }
      
      if (insertErrors.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false,
            errors: insertErrors,
            message: `Failed to insert some chunks: ${insertErrors[0]}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    // Update transcript metadata with hierarchical chunking info
    const { error: updateError } = await supabase
      .from('transcripts')
      .update({
        is_processed: true,
        metadata: {
          ...transcript.metadata,
          hierarchical_chunking_processed_at: new Date().toISOString(),
          chunking_strategy: 'hierarchical',
          parent_chunks: parentChunks.length,
          child_chunks: allChunks.length - parentChunks.length,
          total_chunks: allChunks.length
        }
      })
      .eq('id', transcriptId);
      
    if (updateError) {
      console.error(`[HIERARCHICAL] Error updating transcript ${transcriptId} metadata:`, updateError);
      return new Response(
        JSON.stringify({ error: `Failed to update transcript metadata: ${updateError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`[HIERARCHICAL] Successfully processed transcript ${transcriptId} with hierarchical chunking`);
    console.log(`[HIERARCHICAL] Created ${parentChunks.length} parent chunks and ${allChunks.length - parentChunks.length} child chunks`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Transcript processed with hierarchical chunking',
        parentChunks: parentChunks.length,
        childChunks: allChunks.length - parentChunks.length,
        totalChunks: allChunks.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[HIERARCHICAL] Error in hierarchical chunking:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
