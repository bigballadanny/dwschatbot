
// Export all diagnostic utilities from a single entry point
export * from './environmentCheck';
export * from './transcriptIssues';
export * from './transcriptRepair';

// We had conflicts with the legacy exports, so we'll rename them when re-exporting
import { 
  checkEnvironmentVariables as legacyCheckEnvironmentVariables,
  checkForTranscriptIssues as legacyCheckForTranscriptIssues,
  fixTranscriptIssues as legacyFixTranscriptIssues,
  manuallyProcessTranscripts as legacyManuallyProcessTranscripts,
  retryStuckTranscripts as legacyRetryStuckTranscripts,
  updateTranscriptSourceType as legacyUpdateTranscriptSourceType,
  markTranscriptAsProcessed as legacyMarkTranscriptAsProcessed
} from '@/utils/transcriptDiagnostics';

// Re-export with renamed functions to avoid conflicts
export {
  legacyCheckEnvironmentVariables,
  legacyCheckForTranscriptIssues,
  legacyFixTranscriptIssues,
  legacyManuallyProcessTranscripts,
  legacyRetryStuckTranscripts,
  legacyUpdateTranscriptSourceType,
  legacyMarkTranscriptAsProcessed
};
