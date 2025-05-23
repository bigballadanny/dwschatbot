#!/bin/bash

# M&A Chatbot - Edge Function Deployment Script
# This script deploys the necessary edge functions without Supabase CLI

echo "🚀 Deploying edge functions for M&A Chatbot..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Try different approaches to find Supabase CLI
if command_exists supabase; then
    SUPABASE_CMD="supabase"
elif command_exists npx && npx supabase --version >/dev/null 2>&1; then
    SUPABASE_CMD="npx supabase"
elif [ -f "./node_modules/.bin/supabase" ]; then
    SUPABASE_CMD="./node_modules/.bin/supabase"
else
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
    if command_exists supabase; then
        SUPABASE_CMD="supabase"
    else
        echo "❌ Failed to install Supabase CLI"
        echo "Please install manually: npm install -g supabase"
        exit 1
    fi
fi

echo "✅ Found Supabase CLI: $SUPABASE_CMD"

# Deploy functions
echo "📦 Deploying process-transcript function..."
$SUPABASE_CMD functions deploy process-transcript

echo "📦 Deploying ai-chat function..."
$SUPABASE_CMD functions deploy ai-chat

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Go to the Transcripts page in your app"
echo "2. Click 'Reprocess All Transcripts' button"
echo "3. Wait for processing to complete (~2-3 minutes for 120 transcripts)"
echo "4. Test the chat with M&A questions"
