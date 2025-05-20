#!/bin/bash

# Cleanup script for handling duplicate TranscriptDiagnostics component
# This script keeps the page version and removes the component version

echo "Starting duplicate TranscriptDiagnostics cleanup process..."

# Define backup directory with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/tmp/diagnostics_backup_${TIMESTAMP}"

# Create backup directory
mkdir -p "${BACKUP_DIR}/src/components"

# Check if component version exists
if [ -f "src/components/TranscriptDiagnostics.tsx" ]; then
    echo "Found component version at src/components/TranscriptDiagnostics.tsx"
    echo "Backing up to ${BACKUP_DIR}/src/components/"
    cp "src/components/TranscriptDiagnostics.tsx" "${BACKUP_DIR}/src/components/"
    
    # Check if page version exists
    if [ -f "src/pages/TranscriptDiagnostics.tsx" ]; then
        echo "Page version exists at src/pages/TranscriptDiagnostics.tsx"
        echo "Removing component version as the page version will be kept"
        rm "src/components/TranscriptDiagnostics.tsx"
        echo "✅ Removed component version of TranscriptDiagnostics"
    else
        echo "⚠️ Page version not found, keeping component version"
        echo "Please manually review and update App.tsx routes"
    fi
else
    echo "⚠️ Component version not found at src/components/TranscriptDiagnostics.tsx"
    echo "No duplicate cleanup required"
fi

# Check for imports of the component in App.tsx
if grep -q "import TranscriptDiagnostics from '@/components/TranscriptDiagnostics'" "src/App.tsx"; then
    echo "⚠️ IMPORTANT: App.tsx imports the component version."
    echo "⚠️ You'll need to manually update src/App.tsx to use the page version"
    echo "⚠️ Change: import TranscriptDiagnostics from '@/components/TranscriptDiagnostics'"
    echo "⚠️ To:     import TranscriptDiagnostics from '@/pages/TranscriptDiagnostics'"
fi

echo "Duplicate component cleanup completed."
echo "Backup created at: ${BACKUP_DIR}"