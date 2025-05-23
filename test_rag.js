// Test script to verify RAG functionality
const fetch = require('node-fetch'); // You might need to install: npm install node-fetch

const SUPABASE_URL = 'https://bfscrjrjwbzpldamcrbz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmc2NyanJqd2J6cGxkYW1jcmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NDQwMTMsImV4cCI6MjA1ODQyMDAxM30.k_3L-f1nzP8zwrKFD5NY1BBiSsTymT8dDqM-fVOcW7I';

// Test 1: Process a single transcript
const testProcessTranscript = async (transcriptId) => {
  console.log(`\n📄 Testing process-transcript for ID: ${transcriptId}`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ transcript_id: transcriptId })
    });

    const result = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', result);
    return response.status === 200;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
};

// Test 2: Test search_chunks function
const testSearchChunks = async (query) => {
  console.log(`\n🔍 Testing search_chunks with query: "${query}"`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_chunks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        query_text: query,
        match_count: 5
      })
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Found chunks:', result.length);
    
    if (result.length > 0) {
      console.log('\nFirst chunk preview:');
      console.log('- ID:', result[0].id);
      console.log('- Content:', result[0].content.substring(0, 100) + '...');
      console.log('- Similarity:', result[0].similarity);
    }
    
    return result;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};

// Test 3: Test AI chat with RAG
const testAIChatWithRAG = async (question) => {
  console.log(`\n🤖 Testing AI chat with question: "${question}"`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        query: question,
        messages: [
          {
            role: 'user',
            parts: [{ text: question }]
          }
        ],
        enableOnlineSearch: false
      })
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('\nAI Response:');
    console.log(result.content?.substring(0, 200) + '...');
    
    if (result.citation) {
      console.log('\nSources cited:', result.citation);
    }
    
    return result;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
};

// Main test flow
const runTests = async () => {
  console.log('🧪 Starting RAG functionality tests...\n');
  
  // Get some transcript IDs to test with
  console.log('📋 Fetching transcript list...');
  const transcriptsResponse = await fetch(`${SUPABASE_URL}/rest/v1/transcripts?limit=5&is_processed=eq.false`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY
    }
  });
  
  const transcripts = await transcriptsResponse.json();
  console.log(`Found ${transcripts.length} unprocessed transcripts`);
  
  // Test 1: Process a transcript
  if (transcripts.length > 0) {
    const success = await testProcessTranscript(transcripts[0].id);
    if (success) {
      console.log('✅ Transcript processing successful!');
      
      // Wait a bit for processing to complete
      console.log('\n⏳ Waiting 5 seconds for chunks to be indexed...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Test 2: Search chunks
  const searchResults = await testSearchChunks('business acquisition');
  if (searchResults.length > 0) {
    console.log('✅ Chunk search successful!');
  } else {
    console.log('❌ No chunks found. Make sure transcripts are processed first.');
  }
  
  // Test 3: AI chat with RAG
  const aiResponse = await testAIChatWithRAG('What are the key factors for a successful business acquisition?');
  if (aiResponse && aiResponse.content) {
    console.log('✅ AI chat with RAG successful!');
  } else {
    console.log('❌ AI chat failed or returned no content.');
  }
  
  console.log('\n🎉 Tests complete!');
};

// Run the tests
runTests().catch(console.error);