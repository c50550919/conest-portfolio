# Coding Style and Conventions

## TypeScript Configuration
- **Target**: ES2020
- **Module**: CommonJS (backend), ESNext (mobile)
- **Strict Mode**: Disabled (`strict: false`)
- **No Unused Locals/Parameters**: Disabled
- **Implicit Returns**: Error on missing returns
- **Fallthrough Cases**: Error on switch fallthrough

## Code Quality Rules (ESLint)

### Complexity Limits
- **Cyclomatic Complexity**: Max 15
- **Nesting Depth**: Max 4 levels
- **File Length**: Max 300 lines (warnings)
- **Function Length**: Max 50 lines (warnings)
- **Function Parameters**: Max 5 parameters
- **Statements per Function**: Max 30 (warnings)

### Code Quality
- **console.log**: Warnings (allow console.warn and console.error)
- **Unused Variables**: Warnings (prefix with `_` to ignore)
- **Explicit any**: Warnings
- **Async Functions**: Must return promises
- **Boolean Comparisons**: Simplify unnecessary comparisons

## Naming Conventions
- **Files**: camelCase for utilities, PascalCase for components/models
- **Classes**: PascalCase (e.g., `UserModel`, `AuthService`)
- **Functions**: camelCase (e.g., `getUserById`, `validateToken`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `JWT_SECRET`, `MAX_RETRIES`)
- **Interfaces/Types**: PascalCase with descriptive names
- **Private Methods**: Prefix with `_` (e.g., `_validateInput`)

## Code Organization

### Imports Order
1. Node.js built-ins
2. External dependencies
3. Internal utilities/config
4. Models/services
5. Types/interfaces

### Function Structure
```typescript
/**
 * Brief description of function purpose
 * @param paramName - Description
 * @returns Description of return value
 */
async function exampleFunction(param: Type): Promise<ReturnType> {
  // Input validation
  // Business logic
  // Return result
}
```

## TypeScript Patterns
- Use **interfaces** for object shapes
- Use **types** for unions/intersections
- Prefer **async/await** over raw promises
- Use **optional chaining** (`?.`) and **nullish coalescing** (`??`)
- Type inference preferred over explicit types where obvious

## Error Handling
- Use try-catch for async operations
- Never suppress errors silently
- Include context in error messages
- Use custom error classes for specific scenarios
- Log errors with Winston (backend) or console.error (mobile)

## Comments & Documentation
- JSDoc for public functions and exported components
- Inline comments for complex logic only
- Constitution principles noted in comments where applicable
- No commented-out code in commits

## React Native Specific
- Functional components with hooks (no class components)
- Use `React.memo` for performance optimization
- Custom hooks for reusable logic
- Style objects defined outside component scope
- Use TypeScript for prop types (no PropTypes)
