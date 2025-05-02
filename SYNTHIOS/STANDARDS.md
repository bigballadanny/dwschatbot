
# SYNTHIOS - Coding and Documentation Standards

## 🔒 CORE PROTECTION PROTOCOL 🔒

This system is fundamental to project integrity. Changes require:
1. Explicit user confirmation with passcode: "SYNTHIOS"
2. Version backup before structural changes
3. All task implementations must reference an approved task ID

## Code Structure and Organization

### File Organization
- Group related components in feature-specific directories
- Keep components under 200 lines of code
- Separate business logic from presentation components
- Organize utils by domain rather than generic functionality

### Component Structure
```typescript
/**
 * @file ComponentName description
 * @status active|deprecated|experimental
 * @lastUsed YYYY-MM-DD
 * @version 1.0
 * @tags tag1,tag2,tag3
 * @dependencies path/to/dependency1,path/to/dependency2
 */

// Imports sorted: React, External Libraries, Internal Components, Types, Styles
import React from 'react';
import { someLibrary } from 'some-library';
import { MyComponent } from '@/components/MyComponent';
import type { MyType } from '@/types';

// TypeScript interface definitions
interface ComponentProps {
  // Props with descriptive comments
}

// Component implementation
export const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // Component logic...
  
  return (
    // JSX...
  );
};
```

### Naming Conventions
- Components: PascalCase (e.g., TranscriptViewer)
- Functions/Hooks: camelCase with verb prefix (e.g., useTranscriptData, fetchTranscript)
- Constants: UPPER_SNAKE_CASE for true constants, camelCase for variables that don't change
- Files: Match the main export (e.g., TranscriptViewer.tsx)
- CSS classes: kebab-case (e.g., transcript-viewer-container)

## TypeScript Standards

### Type Definitions
- Prefer interfaces for object types that will be extended
- Use type for unions, intersections, and mapped types
- Always define return types for non-React functions
- Use proper generics for reusable components and functions

### Type Safety
- Avoid `any` type - use `unknown` when type is truly indeterminate
- Use non-null assertions only when truly necessary
- Always handle null/undefined cases properly
- Use discriminated unions for complex state management

## Edge Function Standards

### Structure
- Organize by feature in separate folders
- Follow the single responsibility principle
- Implement proper error handling and logging
- Use TypeScript for all edge functions

### Error Handling
- Use try/catch blocks for all async operations
- Return standardized error responses
- Log errors with appropriate context
- Implement retry mechanisms for transient failures

## Database Standards

### Table Design
- Use UUIDs for primary keys
- Include created_at and updated_at timestamps
- Implement proper indexes for frequently queried columns
- Use proper foreign key constraints

### Row Level Security
- Implement RLS policies for all tables
- Use security definer functions for complex permission logic
- Test RLS policies thoroughly with different user roles

## File Status Tracking

### Status Tags
- **active**: Currently in use and maintained
- **deprecated**: Scheduled for removal in future updates
- **experimental**: Testing new approaches, not production-ready

### File Documentation Format
```typescript
/**
 * @file Component description
 * @status active|deprecated|experimental
 * @lastUsed YYYY-MM-DD
 * @version 1.0
 * @tags tag1,tag2,tag3
 * @dependencies path/to/dependency1,path/to/dependency2
 */
```

### Review Process
1. Monthly review of file status
2. Update status tags based on usage and relevance
3. Archive or remove deprecated files after 3 months
4. Document status changes in CHANGELOG.md

## Documentation Standards

### Component Documentation
- Document props with JSDoc comments
- Include usage examples
- Document side effects and important behaviors
- Note any performance considerations

### README Standards
- Include clear project description
- Document setup and installation steps
- Provide usage examples
- List dependencies and requirements
- Include troubleshooting section

### Code Comments
- Comment "why" not "what"
- Comment complex algorithms and business rules
- Keep comments up-to-date with code changes
- Remove commented-out code

## Testing Standards

### Unit Tests
- Test individual functions and components
- Mock external dependencies
- Aim for high coverage of business logic
- Test edge cases and error conditions

### Integration Tests
- Test component interactions
- Test database operations
- Test API endpoints
- Verify end-to-end workflows

## Commit Standards

### Commit Structure
- Use imperative mood (e.g., "Add feature" not "Added feature")
- Include task ID when implementing approved tasks
- Keep commits focused on a single change
- Use conventional commits format (e.g., feat:, fix:, docs:)

### PR Process
1. Reference relevant task ID
2. Include description of changes
3. List any breaking changes
4. Note any performance impacts
5. Include testing instructions
