
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role (admin privileges)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase URL or service role key');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if chat_analytics table already exists
    const { data: existingTableData, error: existingTableError } = await supabase
      .from('chat_analytics')
      .select('id')
      .limit(1);

    // If we get a response (even empty), the table exists
    if (!existingTableError) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Analytics table already exists',
        tableExists: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create the chat_analytics table
    // Note: We need to use the Postgres REST API for table creation
    const { error: createTableError } = await supabase.rpc('create_analytics_table');

    if (createTableError) {
      console.error('Error creating analytics table:', createTableError);
      
      // Execute raw SQL if RPC function doesn't exist
      const { error: sqlError } = await supabase.rpc('execute_sql', {
        sql: `
        CREATE TABLE IF NOT EXISTS public.chat_analytics (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
          query TEXT NOT NULL,
          response_length INTEGER,
          source_type TEXT,
          relevance_score NUMERIC,
          search_time_ms INTEGER,
          api_time_ms INTEGER,
          transcript_title TEXT,
          successful BOOLEAN DEFAULT true,
          error_message TEXT,
          used_online_search BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS chat_analytics_conversation_id_idx ON public.chat_analytics(conversation_id);
        CREATE INDEX IF NOT EXISTS chat_analytics_source_type_idx ON public.chat_analytics(source_type);
        CREATE INDEX IF NOT EXISTS chat_analytics_created_at_idx ON public.chat_analytics(created_at);
        
        -- Create RPC function for getting top queries
        CREATE OR REPLACE FUNCTION get_top_queries(time_period TEXT, limit_count INTEGER)
        RETURNS TABLE(query TEXT, count BIGINT) 
        LANGUAGE SQL
        AS $$
          SELECT 
            query, 
            COUNT(*) as count
          FROM 
            public.chat_analytics
          WHERE 
            successful = true AND
            CASE
              WHEN time_period = 'day' THEN created_at > NOW() - INTERVAL '1 day'
              WHEN time_period = 'week' THEN created_at > NOW() - INTERVAL '7 days'
              WHEN time_period = 'month' THEN created_at > NOW() - INTERVAL '30 days'
              ELSE TRUE
            END
          GROUP BY 
            query
          ORDER BY 
            count DESC
          LIMIT 
            limit_count;
        $$;
        `
      });

      if (sqlError) {
        console.error('Error executing SQL:', sqlError);
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Failed to create analytics table using SQL', 
          error: sqlError 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    // Verify the table was created
    const { data: verifyData, error: verifyError } = await supabase
      .from('chat_analytics')
      .select('id')
      .limit(1);

    if (verifyError) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Table creation verification failed', 
        error: verifyError
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Analytics table created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in analytics-setup function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      message: 'Failed to set up analytics',
      error: error.message || "An unexpected error occurred"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
