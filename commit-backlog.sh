#!/bin/bash

echo "📋 Organizing and committing backlog changes..."

# First, let's commit the documentation reorganization
echo "1️⃣ Committing documentation reorganization..."
git add REORGANIZATION_SUMMARY.md docs/
git add -u # This stages all deleted files
git commit -m "docs: Major documentation reorganization

- Removed 700+ redundant markdown files
- Consolidated docs into logical structure under docs/
- Kept only essential root documentation
- See REORGANIZATION_SUMMARY.md for details"

# Second, commit the hooks reorganization
echo "2️⃣ Committing hooks reorganization..."
git add src/hooks/ src/contexts/
git add "src/hooks/useAudioManager.ts" "src/hooks/useConversation.ts" "src/hooks/useMessageApi.ts" "src/hooks/useMessageCreation.ts" "src/hooks/useMessages.ts" "src/hooks/useSearchConfig.ts" "src/hooks/useServiceAccountCheck.ts" "src/hooks/useTranscriptDetails.ts" "src/hooks/useTranscriptSummaries.tsx" "src/hooks/useVoiceInput.ts" "src/hooks/use-mobile.tsx" "src/hooks/use-toast.ts" 2>/dev/null || true
git commit -m "refactor: Reorganize hooks into modular structure

- Created organized hooks directory with subdirectories
- Moved hooks to appropriate categories (audio, chat, transcripts, ui, services)
- Added barrel exports for easier imports
- Updated import paths in components"

# Third, commit UI improvements
echo "3️⃣ Committing UI improvements..."
git add src/components/AudioPlayer.tsx src/components/ChatInterface.tsx src/components/ChatSidebar.tsx src/components/Header.tsx src/components/PopularQuestions.tsx src/components/ProtectedRoute.tsx src/components/TranscriptUploader.tsx src/components/VoiceConversation.tsx src/components/VoiceInput.tsx src/components/WelcomeScreen.tsx src/components/chat/ src/components/ui/ai-input-with-search.tsx src/pages/
git commit -m "ui: Enhance chat experience and UI components

- Improve ChatInterface with welcome guidance
- Add mobile optimization across components
- Enhance authentication flow with better loading states
- Add intuitive input controls with tooltips
- Create modern welcome screen with feature cards
- Improve button and badge aesthetics"

# Fourth, commit utility scripts
echo "4️⃣ Committing utility scripts..."
git add deploy_webhook.sh test_webhook.js deploy-functions.sh batch-process-transcripts.js RUN_APP_WSL.md
git add supabase/migrations/create_n8n*.sql 2>/dev/null || true
git commit -m "feat: Add deployment and utility scripts

- Add webhook deployment and testing scripts
- Add batch processing utilities
- Add n8n integration migrations
- Add WSL development guide"

# Fifth, commit remaining configuration files
echo "5️⃣ Committing configuration and project files..."
git add .claude.json .claude/ vite.config.ts.backup README.md
git add CLAUDE_CODE*.md PROJECT_STATUS.md QUICK_START.md SUCCESS_DEPLOYMENT.md claude_code_tasks.md
git commit -m "chore: Update project configuration and documentation

- Add Claude Code configuration
- Update README with current project status
- Add quick start guides and deployment docs
- Update vite configuration for better port handling"

# Show final status
echo ""
echo "✅ Backlog commits complete!"
echo ""
git log --oneline -5
echo ""
echo "📊 Remaining changes:"
git status --short