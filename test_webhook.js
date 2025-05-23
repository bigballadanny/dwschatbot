// Test script to verify your webhook is working
const fetch = require('node-fetch'); // You might need to install: npm install node-fetch

const testWebhook = async () => {
  const testPayload = {
    type: "INSERT",
    record: {
      id: "test-transcript-123",
      title: "Test Transcript",
      content: "This is a test transcript content.",
      metadata: {
        test: true,
        created_via: "n8n_test"
      }
    }
  };

  try {
    const response = await fetch('https://bfscrjrjwbzpldamcrbz.supabase.co/functions/v1/transcript-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmc2NyanJqd2J6cGxkYW1jcmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NDQwMTMsImV4cCI6MjA1ODQyMDAxM30.k_3L-f1nzP8zwrKFD5NY1BBiSsTymT8dDqM-fVOcW7I'
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
};

// Health check test
const healthCheck = async () => {
  try {
    const response = await fetch('https://bfscrjrjwbzpldamcrbz.supabase.co/functions/v1/transcript-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmc2NyanJqd2J6cGxkYW1jcmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NDQwMTMsImV4cCI6MjA1ODQyMDAxM30.k_3L-f1nzP8zwrKFD5NY1BBiSsTymT8dDqM-fVOcW7I'
      },
      body: JSON.stringify({ type: "HEALTH_CHECK" })
    });

    const result = await response.text();
    console.log('Health Check Status:', response.status);
    console.log('Health Check Response:', result);
  } catch (error) {
    console.error('Health Check Error:', error);
  }
};

console.log('Testing webhook health...');
healthCheck().then(() => {
  console.log('\nTesting webhook with sample data...');
  testWebhook();
});
