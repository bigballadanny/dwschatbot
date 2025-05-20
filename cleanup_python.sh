#!/bin/bash

# Cleanup script for removing Python implementation
# This script safely removes the LightRAG directory and Python test files

echo "Starting Python cleanup process..."

# Define backup directory with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/tmp/lightrag_backup_${TIMESTAMP}"

# Check if LightRAG directory exists
if [ -d "LightRAG" ]; then
    echo "LightRAG directory found. Creating backup at ${BACKUP_DIR}"
    
    # Create backup
    mkdir -p "${BACKUP_DIR}"
    cp -r LightRAG "${BACKUP_DIR}/"
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup created successfully at ${BACKUP_DIR}"
        
        # Remove LightRAG directory
        echo "Removing LightRAG directory..."
        rm -rf LightRAG
        echo "✅ LightRAG directory removed"
    else
        echo "❌ Backup failed. Aborting cleanup process."
        exit 1
    fi
else
    echo "⚠️ LightRAG directory not found. Skipping backup and removal."
fi

# Remove Python test files
echo "Checking for Python test files in tests/ directory..."

if [ -d "tests" ]; then
    # Count Python test files before removal
    PYTHON_TEST_FILES=$(find tests -name "*.py" | wc -l)
    
    if [ "${PYTHON_TEST_FILES}" -gt 0 ]; then
        echo "Found ${PYTHON_TEST_FILES} Python test files. Creating backup..."
        
        # Backup test files
        mkdir -p "${BACKUP_DIR}/tests"
        find tests -name "*.py" -exec cp {} "${BACKUP_DIR}/tests/" \;
        
        echo "Removing Python test files..."
        find tests -name "*.py" -delete
        
        echo "✅ Python test files removed"
    else
        echo "No Python test files found in tests/ directory."
    fi
else
    echo "⚠️ tests/ directory not found. Skipping test file cleanup."
fi

echo "Python cleanup process completed."
echo "Backup created at: ${BACKUP_DIR}"