import { MessageData } from './messageUtils';

interface QueuedMessage {
  userMessageContent: string;
  conversationId: string | null;
  userId: string;
  options: {
    isVoiceInput: boolean;
    enableOnlineSearch: boolean;
  };
  timestamp: number;
  attempts: number;
}

interface OfflineQueueConfig {
  maxRetries?: number;
  retryInterval?: number; // in milliseconds
  storageKey?: string;
}

/**
 * OfflineQueue - Manages message queue for offline/unreliable connections
 * Stores failed message requests locally and retries them when connection is restored
 */
class OfflineQueue {
  private queue: QueuedMessage[] = [];
  private isOnline: boolean = navigator.onLine;
  private isProcessing: boolean = false;
  private config: Required<OfflineQueueConfig>;
  
  // Default configuration
  private defaultConfig: Required<OfflineQueueConfig> = {
    maxRetries: 5,
    retryInterval: 30000, // 30 seconds
    storageKey: 'dws_offline_message_queue'
  };
  
  // The function to send messages
  private sendMessageFunction: ((message: string, isVoice: boolean) => Promise<void>) | null = null;
  
  constructor(config?: OfflineQueueConfig) {
    this.config = { ...this.defaultConfig, ...config };
    
    // Setup event listeners for online/offline status
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Load any persisted queue from local storage
    this.loadQueue();
  }
  
  /**
   * Register the function used to send messages
   */
  registerSendFunction(sendFn: (message: string, isVoice: boolean) => Promise<void>) {
    this.sendMessageFunction = sendFn;
  }
  
  /**
   * Handle going online
   */
  private handleOnline = () => {
    console.log('Connection restored. Processing message queue...');
    this.isOnline = true;
    this.processQueue();
  };
  
  /**
   * Handle going offline
   */
  private handleOffline = () => {
    console.log('Connection lost. Messages will be queued.');
    this.isOnline = false;
  };
  
  /**
   * Add a message to the queue
   */
  enqueue(
    userMessageContent: string, 
    conversationId: string | null, 
    userId: string, 
    options: { isVoiceInput: boolean; enableOnlineSearch: boolean; }
  ) {
    const queuedMessage: QueuedMessage = {
      userMessageContent,
      conversationId,
      userId,
      options,
      timestamp: Date.now(),
      attempts: 0
    };
    
    this.queue.push(queuedMessage);
    this.persistQueue();
    
    // If we're online, try to process the queue immediately
    if (this.isOnline) {
      this.processQueue();
    }
    
    return queuedMessage;
  }
  
  /**
   * Process the queue by sending messages
   */
  async processQueue() {
    // If already processing or not online, or no send function registered, exit
    if (this.isProcessing || !this.isOnline || !this.sendMessageFunction) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Process each message in the queue (from oldest to newest)
      for (let i = 0; i < this.queue.length; i++) {
        const message = this.queue[i];
        
        // Skip messages that have exceeded max retries
        if (message.attempts >= this.config.maxRetries) {
          console.log(`Message exceeded retry limit (${this.config.maxRetries}), removing from queue:`, message);
          this.queue.splice(i, 1);
          i--;
          continue;
        }
        
        // Attempt to send the message
        try {
          await this.sendMessageFunction(
            message.userMessageContent, 
            message.options.isVoiceInput
          );
          
          // Message sent successfully, remove from queue
          this.queue.splice(i, 1);
          i--;
        } catch (error) {
          console.error('Failed to send queued message:', error);
          
          // Increment attempts
          message.attempts++;
          
          // If we've reached max retries, remove this message
          if (message.attempts >= this.config.maxRetries) {
            console.log(`Message exceeded retry limit, removing from queue:`, message);
            this.queue.splice(i, 1);
            i--;
          }
        }
      }
    } catch (error) {
      console.error('Error processing message queue:', error);
    } finally {
      this.isProcessing = false;
      this.persistQueue();
    }
  }
  
  /**
   * Get the current queue state
   */
  getQueue(): QueuedMessage[] {
    return [...this.queue];
  }
  
  /**
   * Check if there are messages in the queue
   */
  hasMessages(): boolean {
    return this.queue.length > 0;
  }
  
  /**
   * Get the count of queued messages
   */
  getCount(): number {
    return this.queue.length;
  }
  
  /**
   * Clear the queue
   */
  clearQueue() {
    this.queue = [];
    this.persistQueue();
  }
  
  /**
   * Persist the queue to localStorage
   */
  private persistQueue() {
    try {
      localStorage.setItem(
        this.config.storageKey, 
        JSON.stringify(this.queue)
      );
    } catch (error) {
      console.error('Error persisting offline queue:', error);
    }
  }
  
  /**
   * Load the queue from localStorage
   */
  private loadQueue() {
    try {
      const storedQueue = localStorage.getItem(this.config.storageKey);
      if (storedQueue) {
        this.queue = JSON.parse(storedQueue);
        
        // If we have queued messages and we're online, process them
        if (this.queue.length > 0 && this.isOnline && this.sendMessageFunction) {
          setTimeout(() => this.processQueue(), 3000); // Small delay to ensure app is fully loaded
        }
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
      this.queue = [];
    }
  }
  
  /**
   * Clean up event listeners on destroy
   */
  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}

// Create and export a singleton instance
export const offlineQueue = new OfflineQueue();

export default offlineQueue;