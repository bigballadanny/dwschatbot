# Dependency Cleanup Plan

## Overview

This document outlines a plan to clean up and remove unnecessary dependencies from the DWS Chatbot project, focusing on removing Firebase and other redundant packages, as well as renaming the Supabase functions to be more technology-agnostic.

## Current Issues

1. **Unused Firebase Dependencies**: 
   - The project contains Firebase dependencies that are causing security vulnerabilities
   - These dependencies don't appear to be actively used in the core application
   - The app seems to have migrated to Supabase but still contains Firebase code

2. **Gemini-specific Naming**:
   - The main chat function is named "gemini-chat" which ties it to a specific AI provider
   - We want a more generic naming convention to allow flexibility in AI providers

3. **Dependency Bloat**:
   - The package.json contains packages that may no longer be necessary
   - These extra dependencies increase security surface area and build times

## Action Plan

### 1. Remove Firebase Dependencies

We can safely remove the following packages:
- firebase
- @firebase/auth
- @firebase/firestore
- @firebase/functions
- @firebase/storage
- @genkit-ai/firebase

**Files to Remove**:
- `/src/hooks/useChatApi.ts` (replaced by Supabase functions)
- `/functions/src/index.ts` (and related Firebase Cloud Functions)

**Implementation Steps**:
1. Remove Firebase packages from package.json
2. Remove any Firebase configuration in environment files
3. Delete any Firebase-specific code files
4. Verify the application still functions without Firebase dependencies

### 2. Rename Supabase Functions

Rename the Supabase functions to be more generic:

| Current Name | New Name |
|--------------|----------|
| gemini-chat | ai-chat |
| text-to-speech | tts |
| speech-to-text | stt |

**Implementation Steps**:
1. Rename function folders in the Supabase project
2. Update all references in the code
3. Redeploy the functions with the new names
4. Verify functionality after renaming

### 3. Update Client Code

Update client code to match the new function names:

**Files to Update**:
- `/src/contexts/ChatContext.tsx`: Update the function invoke calls
- Any other files referencing these function names

### 4. Remove Other Unnecessary Dependencies

Review other dependencies for potential removal:

1. **Duplicate UI Libraries**:
   - Check for overlapping UI component libraries

2. **Unused Development Dependencies**:
   - Look for dev dependencies that aren't being used in the build process

3. **Outdated Packages**:
   - Identify and remove/replace outdated packages

## Implementation Priority

1. **High Priority**:
   - Remove Firebase dependencies (resolves security vulnerabilities)
   - Update ChatContext.tsx to use generic function names

2. **Medium Priority**:
   - Rename Supabase functions 
   - Remove other unused dependencies

3. **Low Priority**:
   - Refactor any remaining code that might reference removed dependencies
   - Add documentation about the new architecture

## Testing Plan

After making these changes, thoroughly test:

1. **Core Chat Functionality**:
   - Sending and receiving messages
   - Message history
   - Conversation management

2. **Voice Features**:
   - Text-to-speech conversion
   - Speech-to-text recognition

3. **Search Functionality**:
   - Searching through transcripts
   - Online search integration

## Benefits

By implementing this cleanup plan:

1. **Improved Security**: Remove vulnerabilities from unused dependencies
2. **Reduced Bundle Size**: Smaller application bundle with fewer dependencies
3. **Simplified Codebase**: Cleaner, more maintainable code with fewer abstractions
4. **Better Flexibility**: More generic function names allow for easier AI provider switching
5. **Improved Performance**: Fewer dependencies means faster load times and builds

## Conclusion

This dependency cleanup will significantly improve the project's security posture while also making it more maintainable and flexible for future development. By removing unused Firebase dependencies and adopting more generic naming conventions, we'll be better positioned to adapt to changes in AI technologies.