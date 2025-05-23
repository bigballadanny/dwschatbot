// Test RAG Functionality
// Run this after deploying functions and processing transcripts

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bfscrjrjwbzpldamcrbz.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';

async function testRAG() {
  console.log('🧪 Testing RAG functionality...\n');

  // Test 1: Check if chunks exist
  console.log('1️⃣ Checking chunks table...');
  const chunksResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/chunks?select=count`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );
  const chunksData = await chunksResponse.json();
  console.log(`   Found ${chunksData[0]?.count || 0} chunks\n`);

  // Test 2: Test search_chunks function
  console.log('2️⃣ Testing search_chunks function...');
  const searchResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/search_chunks`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query_text: 'business',
        match_count: 5
      })
    }
  );
  const searchData = await searchResponse.json();
  console.log(`   Found ${searchData.length} matching chunks\n`);

  // Test 3: Check processing status
  console.log('3️⃣ Checking transcript processing status...');
  const transcriptsResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/transcripts?select=id,title,is_processed`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );
  const transcripts = await transcriptsResponse.json();
  const processed = transcripts.filter(t => t.is_processed).length;
  console.log(`   ${processed}/${transcripts.length} transcripts processed\n`);

  // Test 4: Sample questions to try
  console.log('4️⃣ Sample questions to test in chat:');
  console.log('   - "What does Carl Allen say about finding businesses to buy?"');
  console.log('   - "How do you value a business according to the transcripts?"');
  console.log('   - "What are the best strategies for negotiating a deal?"');
  console.log('   - "Tell me about SBA loans for acquisitions"');
  console.log('   - "What mistakes do people make when buying businesses?"');
  
  console.log('\n✅ RAG system test complete!');
}

// Run the test
testRAG().catch(console.error);
