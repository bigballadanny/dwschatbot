
# Coding Standards & Development Guidelines

## Code Organization

### File Structure
- Keep files small and focused on a single responsibility
- Create new files rather than extending large ones
- Group related functionality in directories
- Maintain clear separation of concerns between components

### Component Design
- Components should be reusable and focused
- Aim for less than 200 lines per file
- Extract complex logic to custom hooks
- Prefer composition over inheritance
- Implement proper TypeScript typing

## Development Practices

### Best Practices
- Write responsive designs using Tailwind's responsive utilities
- Use shadcn/ui components for consistent UI
- Implement proper error handling
- Add meaningful console logs for debugging
- Document complex logic with comments

### Testing Guidelines
- Write unit tests for all core functionality
- Test edge cases and error scenarios
- Keep tests focused and independent
- Mock external dependencies appropriately

## Performance Guidelines

- Optimize expensive calculations with useMemo
- Use useCallback for functions passed to child components
- Implement proper React key usage for lists
- Avoid unnecessary rerenders
- Consider code splitting for large components

## TypeScript Standards

- Always define proper interfaces and types
- Use explicit return types for functions
- Leverage TypeScript's utility types (Pick, Omit, etc.)
- Avoid using 'any' type where possible
- Use proper discriminated unions for state management
