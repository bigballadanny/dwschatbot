#!/bin/bash

# Push critical authentication fix to GitHub
echo "Pushing critical authentication fix to GitHub..."
git push origin main

# Check the result
if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed authentication fix to GitHub!"
    echo "The login system should now work once deployed."
else
    echo "❌ Failed to push changes. Please check your GitHub credentials."
fi
