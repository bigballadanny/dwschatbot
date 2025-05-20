// src/utils/feedbackUtils.ts
import { supabase } from '@/integrations/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Submits feedback for a specific message to the database.
 *
 * @param messageId - The UUID of the message being rated.
 * @param conversationId - The UUID of the conversation the message belongs to.
 * @param userId - The UUID of the user submitting the feedback.
 * @param rating - The rating value (-1 for negative, 1 for positive).
 * @param comment - Optional textual comment.
 * @returns An object containing the submitted data or the error.
 */
export async function submitMessageFeedback(
  messageId: string,
  conversationId: string | null, // Allow null conversationId just in case
  userId: string,
  rating: 1 | -1,
  comment?: string | null
): Promise<{ data: any | null; error: PostgrestError | null }> {
  if (!userId) {
    console.error('User ID is required to submit feedback.');
    return { data: null, error: { message: 'User ID is required.', details: '', hint: '', code: '400' } as PostgrestError };
  }
   if (!messageId) {
    console.error('Message ID is required to submit feedback.');
    return { data: null, error: { message: 'Message ID is required.', details: '', hint: '', code: '400' } as PostgrestError };
  }

  console.log(`Submitting feedback for message ${messageId} by user ${userId} with rating ${rating}`);

  try {
    const feedbackData = {
      message_id: messageId,
      conversation_id: conversationId,
      user_id: userId,
      rating: rating,
      comment: comment ?? null, // Ensure comment is null if undefined or empty string
    };

    const { data, error } = await supabase
      .from('message_feedback')
      .insert([feedbackData])
      .select(); // Select the inserted data to confirm

    if (error) {
      console.error('Error submitting message feedback:', error);
      return { data: null, error };
    }

    console.log('Feedback submitted successfully:', data);
    return { data: data?.[0] ?? null, error: null }; // Return the first inserted record

  } catch (err) {
    console.error('Unexpected error during feedback submission:', err);
    const error = err instanceof Error ? err : new Error('An unexpected error occurred');
     return { data: null, error: { message: error.message, details: '', hint: '', code: '500' } as PostgrestError };
  }
}