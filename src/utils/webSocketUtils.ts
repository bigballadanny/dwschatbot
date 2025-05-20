/**
 * WebSocket utility for real-time communication
 * Provides a clean interface for working with WebSockets to handle real-time updates
 */

import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

// Channel type enum
export enum WebSocketChannelType {
  CONVERSATION = 'conversation',
  MESSAGE = 'message',
  SYSTEM = 'system',
  USER = 'user'
}

// Channel subscription options
interface ChannelSubscriptionOptions {
  event?: string;
  filter?: string;
  userId?: string;
  conversationId?: string;
}

// WebSocket state and error handling
export enum WebSocketStatus {
  CONNECTING = 'connecting',
  OPEN = 'open',
  CLOSED = 'closed',
  ERROR = 'error'
}

/**
 * Creates a Supabase real-time subscription to a specific channel
 * @param channelType The type of channel to subscribe to
 * @param options Subscription options (event, filters)
 * @param callback Callback function to handle received messages
 * @returns Cleanup function to unsubscribe
 */
export function subscribeToChannel(
  channelType: WebSocketChannelType,
  options: ChannelSubscriptionOptions,
  callback: (payload: any) => void
): () => void {
  const { event = '*', filter, userId, conversationId } = options;
  
  // Create a unique channel name based on the type and filters
  let channelName = channelType;
  if (userId) channelName += `:user=${userId}`;
  if (conversationId) channelName += `:conversation=${conversationId}`;
  if (filter) channelName += `:${filter}`;
  
  // Generate a table name based on channel type
  let tableName: string;
  switch (channelType) {
    case WebSocketChannelType.CONVERSATION:
      tableName = 'conversations';
      break;
    case WebSocketChannelType.MESSAGE:
      tableName = 'messages';
      break;
    case WebSocketChannelType.USER:
      tableName = 'profiles';
      break;
    case WebSocketChannelType.SYSTEM:
      tableName = 'system_notifications';
      break;
    default:
      tableName = 'messages';
  }
  
  // Create the channel and subscribe
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event, // 'INSERT', 'UPDATE', 'DELETE', or '*'
        schema: 'public',
        table: tableName,
        // Add filters if provided
        ...(conversationId && { filter: `conversation_id=eq.${conversationId}` }),
        ...(userId && { filter: `user_id=eq.${userId}` }),
        ...(filter && { filter }),
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
  
  // Return a cleanup function that unsubscribes from the channel
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Hook for subscribing to real-time message updates
 * @param conversationId The conversation ID to subscribe to
 * @param userId Optional user ID to filter messages
 * @returns Status of the WebSocket connection
 */
export function useMessageSubscription(
  conversationId: string | null,
  callback: (newMessage: any) => void,
  userId?: string
): WebSocketStatus {
  const [status, setStatus] = useState<WebSocketStatus>(WebSocketStatus.CLOSED);
  
  useEffect(() => {
    if (!conversationId) {
      setStatus(WebSocketStatus.CLOSED);
      return;
    }
    
    setStatus(WebSocketStatus.CONNECTING);
    
    try {
      // Subscribe to message inserts for this conversation
      const unsubscribe = subscribeToChannel(
        WebSocketChannelType.MESSAGE,
        {
          event: 'INSERT',
          conversationId,
          userId
        },
        (payload) => {
          // Update status on first message
          setStatus(WebSocketStatus.OPEN);
          
          // Process new message
          if (payload.new) {
            callback(payload.new);
          }
        }
      );
      
      // Cleanup function
      return () => {
        unsubscribe();
        setStatus(WebSocketStatus.CLOSED);
      };
    } catch (error) {
      console.error('Error setting up WebSocket subscription:', error);
      setStatus(WebSocketStatus.ERROR);
      
      // Return a no-op cleanup
      return () => {};
    }
  }, [conversationId, userId, callback]);
  
  return status;
}

/**
 * Hook for subscribing to real-time conversation updates
 * @param userId User ID to get conversations for
 * @returns Status of the WebSocket connection
 */
export function useConversationSubscription(
  userId: string | undefined,
  callback: (payload: any) => void
): WebSocketStatus {
  const [status, setStatus] = useState<WebSocketStatus>(WebSocketStatus.CLOSED);
  
  useEffect(() => {
    if (!userId) {
      setStatus(WebSocketStatus.CLOSED);
      return;
    }
    
    setStatus(WebSocketStatus.CONNECTING);
    
    try {
      // Subscribe to conversation changes for this user
      const unsubscribe = subscribeToChannel(
        WebSocketChannelType.CONVERSATION,
        {
          event: '*', // All events (INSERT, UPDATE, DELETE)
          userId
        },
        (payload) => {
          // Update status on first message
          setStatus(WebSocketStatus.OPEN);
          
          // Process conversation change
          callback(payload);
        }
      );
      
      // Cleanup function
      return () => {
        unsubscribe();
        setStatus(WebSocketStatus.CLOSED);
      };
    } catch (error) {
      console.error('Error setting up conversation subscription:', error);
      setStatus(WebSocketStatus.ERROR);
      
      // Return a no-op cleanup
      return () => {};
    }
  }, [userId, callback]);
  
  return status;
}

export default {
  subscribeToChannel,
  useMessageSubscription,
  useConversationSubscription,
  WebSocketChannelType,
  WebSocketStatus
};