# Gemini Chat Function Optimizations

## Current Issues
- The function has high token parsing overhead with complex transcript truncation
- No client-side retry mechanism if the function fails 
- Cache entries can expire with no TTL management
- Limited performance monitoring
- High token usage due to redundant messages in the transcript

## Optimizations

### 1. Token Efficiency
- Implement a more efficient transcript truncation algorithm
- Only send the minimal context needed for the AI
- Remove redundant processing of messages

```typescript
// More efficient truncation
function efficientTruncateTranscript(messages: ChatMessage[], maxTokens: number): ChatMessage[] {
  // Start with system messages (they're important context)
  const systemMessages = messages.filter(msg => msg.role === 'system');
  
  // Get user/model messages in reverse order (newest first)
  const conversationMessages = messages
    .filter(msg => msg.role === 'user' || msg.role === 'model')
    .reverse();
  
  let tokenCount = 0;
  const includedMessages: ChatMessage[] = [];
  
  // Add system messages first (they're usually short)
  for (const msg of systemMessages) {
    const msgTokens = estimateTokens(msg);
    tokenCount += msgTokens;
    includedMessages.push(msg);
  }
  
  // Then add conversation messages until we approach the token limit
  for (const msg of conversationMessages) {
    const msgTokens = estimateTokens(msg);
    
    // If adding this message would exceed the limit
    if (tokenCount + msgTokens > maxTokens) {
      break;
    }
    
    tokenCount += msgTokens;
    includedMessages.unshift(msg); // Add to front to maintain chronological order
  }
  
  return includedMessages;
}

// Fast token estimation without full encoding when possible
function estimateTokens(message: ChatMessage): number {
  const text = message.parts?.[0]?.text || '';
  
  // Fast approximation (usually ~1.3 tokens per word)
  if (text.length > 1000) {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }
  
  // Actual encoding for smaller messages
  try {
    return encode(text).length;
  } catch (e) {
    console.error("Tokenizer error:", e);
    return Math.ceil(text.length / 4); // Very rough fallback (4 chars ~= 1 token)
  }
}
```

### 2. Improved Caching

- Add TTL (Time-To-Live) to cache entries
- Implement cache invalidation for outdated entries
- Add cache compression for large responses

```typescript
// Cache with TTL support
async function cacheResponse(queryHash: string, response: string, modelId: string) {
  // Default TTL: 7 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  try {
    await supabaseAdmin
      .from(CACHE_TABLE_NAME)
      .insert({
        query_hash: queryHash,
        response: response,
        model_used: modelId,
        expires_at: expiresAt.toISOString()
      });
      
    console.log(`Cached response for hash: ${queryHash} (expires: ${expiresAt.toISOString()})`);
  } catch (error) {
    console.error("Cache write error:", error);
  }
}

// When retrieving cache, check expiration
async function getCachedResponse(queryHash: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from(CACHE_TABLE_NAME)
      .select('response, created_at, expires_at')
      .eq('query_hash', queryHash)
      .lte('expires_at', new Date().toISOString())
      .maybeSingle();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Cache read error:", error);
    return null;
  }
}
```

### 3. Enhanced Error Handling

- Add more specific error categories
- Implement structured error logging
- Return more helpful error messages to clients

```typescript
// Enhanced error handling
enum ErrorCategory {
  VALIDATION = 'validation_error',
  SERVICE_ACCOUNT = 'service_account_error',
  AI_PROVIDER = 'ai_provider_error',
  RATE_LIMIT = 'rate_limit_error',
  INTERNAL = 'internal_error'
}

interface StructuredError {
  category: ErrorCategory;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

function logStructuredError(error: StructuredError) {
  // Log to Supabase table for monitoring
  if (supabaseAdmin) {
    supabaseAdmin
      .from('function_errors')
      .insert({
        function_name: 'gemini-chat',
        error_category: error.category,
        error_message: error.message,
        error_details: error.details,
        occurred_at: error.timestamp,
        request_id: error.requestId
      })
      .then(() => console.log(`Error logged: ${error.category}`))
      .catch(e => console.error("Failed to log error:", e));
  }
  
  // Also log to console
  console.error(`[${error.category}] ${error.message}`, error.details || '');
}
```

### 4. Performance Monitoring

- Add detailed timing metrics
- Track token usage metrics
- Implement health metrics for the function

```typescript
// Performance monitoring
interface FunctionMetrics {
  requestId: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  phases: {
    validation?: number;
    cacheCheck?: number;
    aiRequest?: number;
    tokenization?: number;
    responseProcessing?: number;
  };
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  cacheHit: boolean;
  success: boolean;
}

// Usage in the main function
const metrics: FunctionMetrics = {
  requestId: requestId,
  startTime: Date.now(),
  phases: {},
  cacheHit: false,
  success: false
};

// Then at the end
metrics.endTime = Date.now();
metrics.totalDuration = metrics.endTime - metrics.startTime;
metrics.success = true;

// Log metrics asynchronously (don't block response)
supabaseAdmin
  .from('function_metrics')
  .insert(metrics)
  .then(() => console.log(`Metrics logged for request ${metrics.requestId}`))
  .catch(e => console.error("Failed to log metrics:", e));
```

### 5. Client-Side Implementation

- Add exponential backoff retry in the client
- Implement response streaming for faster first byte
- Cache frequent responses on the client side

```typescript
// Client-side implementation
const sendMessageWithRetry = async (message: string, retries = 3, backoffMs = 1000) => {
  try {
    // Generate a unique requestId for tracking
    const requestId = Date.now().toString();
    
    // Try to get from client cache first
    const cachedResponse = sessionStorage.getItem(`chat_${md5(message)}`);
    if (cachedResponse) {
      return JSON.parse(cachedResponse);
    }
    
    const response = await supabase.functions.invoke('gemini-chat', {
      body: {
        query: message,
        messages: formatMessages(),
        requestId
      }
    });
    
    // Cache successful responses
    if (response.data?.content) {
      sessionStorage.setItem(`chat_${md5(message)}`, JSON.stringify(response.data));
    }
    
    return response;
  } catch (error) {
    // If we have retries left, use exponential backoff
    if (retries > 0) {
      await new Promise(r => setTimeout(r, backoffMs));
      return sendMessageWithRetry(message, retries - 1, backoffMs * 2);
    }
    throw error;
  }
};
```

## Implementation Priority

1. Token Efficiency (Highest) - Reduces costs and improves performance
2. Enhanced Error Handling - Improves reliability
3. Improved Caching - Better user experience
4. Performance Monitoring - For long-term optimization
5. Client-Side Implementation - For better UX