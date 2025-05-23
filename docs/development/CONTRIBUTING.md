# Contributing Guidelines

## Development Workflow

1. Create a feature branch from `main`
2. Make your changes following the coding standards
3. Test your changes thoroughly
4. Commit with descriptive messages
5. Create a pull request

## Coding Standards

### TypeScript
- Use strict TypeScript mode
- Provide type annotations for all function parameters and returns
- Use interfaces for object shapes
- Prefer `const` assertions where appropriate

### React
- Use functional components with hooks
- Follow the existing component structure in `src/components/`
- Use proper prop typing with TypeScript interfaces
- Implement error boundaries for components that might fail

### Styling
- Use Tailwind CSS classes
- Follow Shadcn UI component patterns
- Maintain consistent spacing and typography
- Use CSS variables for theme values

### File Organization
- Components: One component per file, named exports
- Hooks: Organized by domain in `src/hooks/[domain]/`
- Utils: Grouped by functionality in `src/utils/`
- Types: Co-located with related code or in shared interfaces

## Testing

- Write unit tests for utility functions
- Test React components with user interactions
- Verify Edge Function logic with example payloads
- Test API integrations with proper mocking

## Edge Functions

- Use TypeScript for type safety
- Implement proper error handling and logging
- Validate input data thoroughly
- Return consistent response formats
- Document API endpoints with examples

## Database Changes

- Create migrations for schema changes
- Update TypeScript types to match database schema
- Consider RLS policies for new tables
- Document any new database patterns

## Performance

- Optimize React renders with proper memoization
- Minimize API calls with appropriate caching
- Use proper loading states for async operations
- Monitor Edge Function execution times

## Security

- Never commit secrets or API keys
- Use environment variables for configuration
- Implement proper authentication checks
- Validate all user inputs
- Follow principle of least privilege for database access