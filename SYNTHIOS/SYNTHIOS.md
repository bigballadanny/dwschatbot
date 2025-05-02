
# SYNTHIOS - Master System Documentation

## 🔒 CORE PROTECTION PROTOCOL 🔒

This system is fundamental to project integrity. Changes require:
1. Explicit user confirmation with passcode: "SYNTHIOS"
2. Version backup before structural changes
3. All task implementations must reference an approved task ID

## Documentation Structure

This repository uses a focused documentation approach with five key files:

1. **[WORKFLOW.md](./WORKFLOW.md)** - Core workflow processes, communication frameworks, and problem-solving protocols
2. **[TASKS.md](./TASKS.md)** - Active task tracking and backlog management
3. **[CHANGELOG.md](./CHANGELOG.md)** - Archive of completed tasks and system changes
4. **[STANDARDS.md](./STANDARDS.md)** - Coding, quality, and technical standards
5. **[REFERENCE.md](./REFERENCE.md)** - Technical reference documentation

## Project Overview

SYNTHIOS is a comprehensive transcript processing and RAG (Retrieval-Augmented Generation) system designed to efficiently process, chunk, and retrieve content from transcripts. Key features include:

- **Hierarchical Chunking**: Parent-child relationships between content chunks preserve context
- **Advanced RAG Search**: Enhanced search mechanisms leverage hierarchical structure
- **Diagnostic Tools**: Comprehensive utilities for monitoring and maintaining system health
- **File Status Tracking**: Systematic approach to monitoring file usage and status

## First Principles Framework

### Core Philosophy
We approach all problems using first principles thinking:
1. Question all assumptions and conventional approaches
2. Break down complex problems to fundamental truths
3. Rebuild solutions from these fundamental elements
4. Evaluate ideas on merit, not authority or convention

### Elon Musk's 5-Step Optimization Method
1. **Question requirements**: Remove unnecessary constraints
2. **Delete parts/processes**: Simplify ruthlessly
3. **Optimize remaining elements**: Only after simplification
4. **Accelerate cycle time**: Speed up development after optimization
5. **Automate**: Only automate already-simplified processes

## System Architecture

### Core Components
1. **Transcript Processing Pipeline**: Edge functions for processing raw transcript content
2. **Chunking System**: Hierarchical document chunking with parent-child relationships
3. **RAG Pipeline**: Enhanced search with context-aware retrieval
4. **Diagnostic System**: Tools for monitoring and maintaining system health
5. **File Status Tracking**: System for tracking file usage and status

## Key Technical Decisions

1. **Shifted from Python to TypeScript**: Eliminated Python dependency for simpler deployment
2. **Implemented PGVector in Supabase**: Replaced external vector store with integrated solution
3. **Hierarchical Chunking Strategy**: Enhanced context preservation in chunking
4. **Standardized File Structure**: Improved maintainability with consistent organization
5. **Implemented File Status Tracking**: Better visibility into codebase health
