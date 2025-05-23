#!/bin/bash

echo "🚀 Deploying RAG functionality for M&A Chatbot..."

# Deploy the search_chunks SQL function
echo "📊 Creating search_chunks function in database..."
supabase db push

# Deploy the updated edge functions
echo "🔧 Deploying process-transcript function..."
supabase functions deploy process-transcript

echo "🤖 Deploying ai-chat function with RAG integration..."
supabase functions deploy ai-chat

echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Go to the Transcripts page in your app"
echo "2. Click 'Reprocess All Transcripts' to process your 120 transcripts"
echo "3. Once processed, test the chat with questions about your M&A content"
echo ""
echo "🧪 Test SQL query after processing:"
echo "SELECT * FROM search_chunks('business', 5);"