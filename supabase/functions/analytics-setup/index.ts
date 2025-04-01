
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

    console.log('Creating analytics table...');
    
    // Execute SQL to create the table
    const { error: sqlError } = await supabase.rpc('execute_sql', {
      sql: `
      -- Enable UUID extension if not already enabled
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      
      -- Create the chat_analytics table
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
      
      -- Create indexes for better query performance
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
      
      -- Create generic execute_sql function if it doesn't exist
      CREATE OR REPLACE FUNCTION execute_sql(sql text) RETURNS void AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });

    if (sqlError) {
      console.error('Error executing SQL:', sqlError);
      
      // Try a different approach if the execute_sql function doesn't exist
      const createTableQuery = `
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
      `;
      
      // Execute each statement separately
      const { error: tableError } = await supabase.rpc('execute_sql', { sql: createTableQuery });
      
      if (tableError) {
        console.error('Error creating table:', tableError);
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Failed to create analytics table', 
          error: tableError 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
      
      // Create indexes
      await supabase.rpc('execute_sql', { 
        sql: `CREATE INDEX IF NOT EXISTS chat_analytics_conversation_id_idx ON public.chat_analytics(conversation_id);` 
      });
      await supabase.rpc('execute_sql', { 
        sql: `CREATE INDEX IF NOT EXISTS chat_analytics_source_type_idx ON public.chat_analytics(source_type);` 
      });
      await supabase.rpc('execute_sql', { 
        sql: `CREATE INDEX IF NOT EXISTS chat_analytics_created_at_idx ON public.chat_analytics(created_at);` 
      });
      
      // Create get_top_queries function
      await supabase.rpc('execute_sql', { 
        sql: `
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
        $$;`
      });
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
      message: 'Analytics table created successfully',
      tableExists: false
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
