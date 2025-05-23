# Pydantic Integration Guide

## Overview

This guide explains how to use Pydantic for data validation and serialization in the DWS Chatbot project. Pydantic offers type checking, data validation, and clean serialization for your TypeScript and Python code.

## Why Pydantic?

Pydantic provides several benefits for our AI-powered chatbot:

1. **Type Safety**: Ensures that data matches expected formats, reducing runtime errors
2. **Validation**: Automatically validates data against schemas with clear error messages
3. **Serialization**: Simplifies conversion between API responses and application models
4. **Documentation**: Generates OpenAPI schemas for API documentation
5. **Cross-language Compatibility**: Works in both Python and TypeScript environments

## Installation

### TypeScript (Frontend)

```bash
npm install pydantic
```

### Python (Edge Functions)

```bash
pip install pydantic
```

## Basic Usage

### TypeScript Example

```typescript
import { BaseModel, Field } from 'pydantic';

// Define a model for transcript data
class Transcript extends BaseModel {
  id: string = Field(..., description: "Unique identifier");
  title: string = Field(..., description: "Transcript title");
  content: string = Field(..., description: "Full transcript content");
  createdAt: Date = Field(..., description: "Creation timestamp");
  isProcessed: boolean = Field(false, description: "Processing status");
  
  // Optional fields with defaults
  metadata: Record<string, any> = Field({}, description: "Additional metadata");
  source: string = Field("user_upload", description: "Source of transcript");
}

// Create a transcript instance with validation
try {
  const transcript = new Transcript({
    id: "123",
    title: "Business Summit 2025",
    content: "Full transcript text...",
    createdAt: new Date(),
    metadata: { keywords: ["business", "acquisition"] }
  });
  
  // Use validated data
  console.log(transcript.json());
} catch (error) {
  // Handle validation errors
  console.error("Validation error:", error);
}
```

### Python (Edge Functions) Example

```python
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime

# Define a model for chat messages
class ChatMessage(BaseModel):
    role: str = Field(..., description="The role of the message sender (user/assistant)")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.now)
    citation: Optional[List[str]] = Field(None, description="Citation sources if any")
    
    # Custom validation
    def validate_role(self):
        if self.role not in ["user", "assistant", "system"]:
            raise ValueError(f"Invalid role: {self.role}. Must be 'user', 'assistant', or 'system'")
        return self.role

# Example use in edge function
def handle_request(req):
    try:
        # Parse and validate incoming data
        message_data = req.json()
        chat_message = ChatMessage(**message_data)
        chat_message.validate_role()
        
        # Process validated data
        return {"success": True, "message": chat_message.model_dump()}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

## Integration with Supabase Edge Functions

Pydantic is particularly useful for validating data in Supabase Edge Functions:

```typescript
// Supabase Edge Function with Pydantic
import { serve } from 'https://deno.land/std/http/server.ts';
import { BaseModel, Field } from 'https://esm.sh/pydantic/lib/index.js';

// Define request validation model
class TranscriptProcessRequest extends BaseModel {
  transcriptId: string = Field(..., { description: "ID of transcript to process" });
  options: {
    chunkSize: number;
    overlapSize: number;
    reprocessExisting: boolean;
  } = Field({
    chunkSize: 1000,
    overlapSize: 100,
    reprocessExisting: false
  }, { description: "Processing options" });
}

serve(async (req) => {
  try {
    // Validate request
    const requestData = await req.json();
    const validatedRequest = new TranscriptProcessRequest(requestData);
    
    // Process with validated data
    const result = await processTranscript(
      validatedRequest.transcriptId,
      validatedRequest.options
    );
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
```

## Best Practices

1. **Define Clear Models**: Create separate model classes for API requests, responses, and database entities
2. **Use Field Annotations**: Add descriptions and constraints to fields for better documentation
3. **Implement Custom Validators**: Add custom validation methods for complex business rules
4. **Handle Validation Errors**: Catch and process validation errors to provide clear feedback
5. **Generate API Documentation**: Use Pydantic models to generate OpenAPI documentation

## Advanced Features

### Nested Models

```typescript
class User extends BaseModel {
  id: string;
  name: string;
}

class Message extends BaseModel {
  content: string;
  sender: User;  // Nested model
}
```

### Model Inheritance

```typescript
class BaseChatMessage extends BaseModel {
  content: string;
  timestamp: Date;
}

class UserMessage extends BaseChatMessage {
  userId: string;
}

class AssistantMessage extends BaseChatMessage {
  source: string;
  citation: string[];
}
```

## Resources

- [Pydantic Documentation](https://docs.pydantic.dev/)
- [Pydantic for TypeScript](https://github.com/pydantic/pydantic-ts)
- [Supabase Edge Function Examples](https://supabase.com/docs/guides/functions/examples)