
# SYNTHIOS - Standards and Best Practices

## Code Excellence Standards

- Components under 200 lines
- Functions under 50 lines
- Proper TypeScript typing
- Comprehensive error handling
- Regular refactoring of complex modules

## File Structure
- Keep files small and focused on a single responsibility
- Create new files rather than extending large ones
- Group related functionality in directories
- Maintain clear separation of concerns between components

## Component Design
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

## Decision Making Framework

### WRAP Framework (Heath & Heath)
1. **Widen Your Options**: Consider multiple alternatives
2. **Reality-Test Your Assumptions**: Look for evidence and counter-evidence
3. **Attain Distance**: Overcome short-term emotions
4. **Prepare to Be Wrong**: Consider how decisions might fail

### Technical Decision Making

#### Architecture Decision Records (ADRs)
Document important architectural decisions:
- **Context**: The situation and problem
- **Decision**: The change being proposed
- **Status**: Proposed, accepted, rejected, deprecated, superseded
- **Consequences**: Results of the decision, both positive and negative
- **Alternatives**: Other options considered

### Risk Assessment
Evaluate technical decisions based on:
- Performance impact
- Maintenance complexity
- Learning curve
- Future expandability
- Security implications
- Resource requirements

## Security Guidelines

### Authentication & Authorization
- Use secure authentication methods
- Implement proper authorization checks
- Never store sensitive data in code
- Use environment variables for secrets

### Data Protection
- Validate all user inputs
- Implement proper data sanitization
- Follow least privilege principle
- Use prepared statements for database queries
