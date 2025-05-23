#!/bin/bash
# Deploy the updated webhook function

echo "Deploying transcript-webhook function..."

# Navigate to project directory
cd "/home/my_horizon/.claude/projects/DWS_Chatbot - BETA"

# Deploy the function
npx supabase functions deploy transcript-webhook

echo "Deployment complete!"
