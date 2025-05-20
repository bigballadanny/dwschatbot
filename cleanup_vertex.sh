#!/bin/bash

# Cleanup script for removing Vertex AI related files
# This script removes the Vertex AI setup and test pages

echo "Starting Vertex AI files cleanup process..."

# Define backup directory with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/tmp/vertex_backup_${TIMESTAMP}"

# Create backup directory
mkdir -p "${BACKUP_DIR}/src/pages"
mkdir -p "${BACKUP_DIR}/src/components"

# Check for VertexAISetup.tsx and VertexTest.tsx
if [ -f "src/pages/VertexAISetup.tsx" ]; then
    echo "Backing up src/pages/VertexAISetup.tsx"
    cp "src/pages/VertexAISetup.tsx" "${BACKUP_DIR}/src/pages/"
    echo "Removing src/pages/VertexAISetup.tsx"
    rm "src/pages/VertexAISetup.tsx"
    echo "✅ VertexAISetup.tsx removed"
else
    echo "⚠️ src/pages/VertexAISetup.tsx not found"
fi

if [ -f "src/pages/VertexTest.tsx" ]; then
    echo "Backing up src/pages/VertexTest.tsx"
    cp "src/pages/VertexTest.tsx" "${BACKUP_DIR}/src/pages/"
    echo "Removing src/pages/VertexTest.tsx"
    rm "src/pages/VertexTest.tsx"
    echo "✅ VertexTest.tsx removed"
else
    echo "⚠️ src/pages/VertexTest.tsx not found"
fi

# Check for VertexAIValidator component
if [ -f "src/components/VertexAIValidator.tsx" ]; then
    echo "Backing up src/components/VertexAIValidator.tsx"
    cp "src/components/VertexAIValidator.tsx" "${BACKUP_DIR}/src/components/"
    echo "Removing src/components/VertexAIValidator.tsx"
    rm "src/components/VertexAIValidator.tsx"
    echo "✅ VertexAIValidator.tsx removed"
else
    echo "⚠️ src/components/VertexAIValidator.tsx not found"
fi

# Check for service account utilities
if [ -f "src/utils/serviceAccountUtils.ts" ]; then
    echo "Backing up src/utils/serviceAccountUtils.ts"
    mkdir -p "${BACKUP_DIR}/src/utils"
    cp "src/utils/serviceAccountUtils.ts" "${BACKUP_DIR}/src/utils/"
    echo "Removing src/utils/serviceAccountUtils.ts"
    rm "src/utils/serviceAccountUtils.ts"
    echo "✅ serviceAccountUtils.ts removed"
else
    echo "⚠️ src/utils/serviceAccountUtils.ts not found"
fi

# Remove routes from App.tsx (would need to be updated manually)
echo "⚠️ IMPORTANT: You'll need to manually remove Vertex-related routes from src/App.tsx"
echo "⚠️ Look for routes to '/vertex-setup' and '/vertex-test'"

echo "Vertex AI files cleanup completed."
echo "Backup created at: ${BACKUP_DIR}"