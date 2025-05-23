// Batch process all transcripts
// Run this script to process all unprocessed transcripts

async function batchProcessTranscripts() {
  const SUPABASE_URL = 'https://bfscrjrjwbzpldamcrbz.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';
  const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

  console.log('🚀 Starting batch transcript processing...\n');

  try {
    // Get all unprocessed transcripts
    console.log('1️⃣ Fetching unprocessed transcripts...');
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/transcripts?is_processed=eq.false&select=id,title`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch transcripts: ${response.status}`);
    }

    const transcripts = await response.json();
    console.log(`   Found ${transcripts.length} unprocessed transcripts\n`);

    if (transcripts.length === 0) {
      console.log('✅ All transcripts are already processed!');
      return;
    }

    // Process each transcript
    console.log('2️⃣ Processing transcripts...');
    let processed = 0;
    let failed = 0;

    for (const transcript of transcripts) {
      try {
        console.log(`   Processing: ${transcript.title}...`);
        
        const processResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/process-transcript`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${AUTH_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              transcript_id: transcript.id
            })
          }
        );

        if (processResponse.ok) {
          processed++;
          console.log(`   ✅ Processed successfully (${processed}/${transcripts.length})`);
        } else {
          failed++;
          const error = await processResponse.text();
          console.log(`   ❌ Failed: ${error}`);
        }

        // Add a small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        failed++;
        console.error(`   ❌ Error processing ${transcript.title}:`, error.message);
      }
    }

    // Summary
    console.log('\n3️⃣ Processing complete!');
    console.log(`   ✅ Successfully processed: ${processed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Total: ${transcripts.length}`);

    // Verify chunks were created
    console.log('\n4️⃣ Verifying chunks...');
    const chunksResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/chunks?select=count`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      }
    );
    
    if (chunksResponse.ok) {
      const chunksData = await chunksResponse.json();
      console.log(`   Total chunks in database: ${chunksData[0]?.count || 0}`);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

// Instructions
console.log('📋 INSTRUCTIONS:');
console.log('1. Set your environment variables:');
console.log('   export SUPABASE_ANON_KEY="your-anon-key"');
console.log('   export AUTH_TOKEN="your-auth-token"');
console.log('2. Run: node batch-process-transcripts.js\n');

// Uncomment to run
// batchProcessTranscripts();
