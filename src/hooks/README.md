# Hooks Directory

This directory contains all custom hooks organized by their functionality.

## Directory Structure

- **audio/**: Hooks related to audio recording, playback, and voice input
  - `useAudioManager.ts`: Unified hook for audio playback and recording
  - `useVoiceInput.ts`: Hook for voice recording and transcription

- **chat/**: Hooks related to chat functionality and message handling
  - `useConversation.ts`: Hook for managing conversation state and operations
  - `useMessages.ts`: Hook for message state management
  - `useMessageApi.ts`: Hook for message API operations
  - `useMessageCreation.ts`: Hook for creating and formatting message objects

- **transcripts/**: Hooks related to transcript handling
  - `useTranscriptDetails.ts`: Hook for loading and managing transcript details
  - `useTranscriptSummaries.tsx`: Hook for managing transcript summaries

- **ui/**: Hooks related to UI functionality
  - `use-toast.ts`: Hook for toast notifications
  - `use-mobile.tsx`: Hook for detecting mobile devices
  - `useSearchConfig.ts`: Hook for search configuration

- **services/**: Hooks related to external services
  - `useServiceAccountCheck.ts`: Hook for validating service account configuration

## Usage

Import hooks directly from their specific module to utilize tree-shaking:

```tsx
import { useAudioManager } from '@/hooks/audio';
import { useConversation, useMessages } from '@/hooks/chat';
```

Or import from the main hooks index for convenience:

```tsx
import { useAudioManager, useConversation, useMessages } from '@/hooks';
```