# Code Complexity Management Guidelines

This document defines code complexity standards and best practices for the CoNest backend.

## Complexity Metrics

### Cyclomatic Complexity
- **Maximum**: 15 per function
- **Target**: < 10 per function
- **Critical**: Functions with complexity > 15 must be refactored

### Cognitive Complexity
- **Maximum**: 20 per function
- **Target**: < 15 per function
- **Focus**: Human readability and maintainability

### Function Length
- **Maximum**: 50 lines per function (excluding comments and whitespace)
- **Target**: < 30 lines per function
- **Exception**: Test files and integration tests

### File Length
- **Maximum**: 300 lines per file (excluding comments and whitespace)
- **Target**: < 200 lines per file
- **Exception**: Configuration files and type definitions

### Nesting Depth
- **Maximum**: 4 levels
- **Target**: < 3 levels
- **Recommendation**: Use early returns and guard clauses

## Code Quality Standards

### Function Parameters
- **Maximum**: 5 parameters
- **Recommendation**: Use object parameters for > 3 parameters
- **Example**:
```typescript
// ❌ Too many parameters
function createUser(name: string, email: string, phone: string, address: string, age: number) {}

// ✅ Use object parameter
function createUser(params: { name: string; email: string; phone: string; address: string; age: number }) {}
```

### Maximum Statements
- **Maximum**: 30 statements per function
- **Target**: < 20 statements
- **Recommendation**: Extract complex logic into separate functions

### Class Complexity
- **Maximum Methods**: 20 per class
- **Maximum Properties**: 15 per class
- **Target**: Follow Single Responsibility Principle

## Complexity Reduction Strategies

### 1. Extract Functions
Break down complex functions into smaller, focused functions:

```typescript
// ❌ Complex function
function processUser(user: User) {
  // 50+ lines of validation, transformation, and processing
}

// ✅ Extracted functions
function processUser(user: User) {
  validateUser(user);
  transformUser(user);
  saveUser(user);
}
```

### 2. Use Guard Clauses
Reduce nesting with early returns:

```typescript
// ❌ Nested conditions
function processPayment(payment: Payment) {
  if (payment.isValid) {
    if (payment.amount > 0) {
      if (payment.user.isVerified) {
        // Process payment
      }
    }
  }
}

// ✅ Guard clauses
function processPayment(payment: Payment) {
  if (!payment.isValid) return;
  if (payment.amount <= 0) return;
  if (!payment.user.isVerified) return;

  // Process payment
}
```

### 3. Strategy Pattern
Replace complex conditionals with strategy pattern:

```typescript
// ❌ Complex switch statement
function calculatePrice(type: string, amount: number) {
  switch(type) {
    case 'premium': return amount * 1.2;
    case 'standard': return amount;
    case 'discount': return amount * 0.8;
    // ... many more cases
  }
}

// ✅ Strategy pattern
interface PricingStrategy {
  calculate(amount: number): number;
}

const strategies: Record<string, PricingStrategy> = {
  premium: { calculate: (amt) => amt * 1.2 },
  standard: { calculate: (amt) => amt },
  discount: { calculate: (amt) => amt * 0.8 },
};

function calculatePrice(type: string, amount: number) {
  return strategies[type].calculate(amount);
}
```

### 4. Composition Over Inheritance
Use composition to reduce class complexity:

```typescript
// ❌ Deep inheritance
class User extends BaseEntity {
  // ...
}
class VerifiedUser extends User {
  // ...
}
class PremiumUser extends VerifiedUser {
  // ...
}

// ✅ Composition
interface User {
  profile: UserProfile;
  verification: Verification;
  subscription: Subscription;
}
```

## Monitoring and Enforcement

### ESLint Rules
- `complexity`: Max cyclomatic complexity 15
- `max-depth`: Max nesting depth 4
- `max-lines-per-function`: Max 50 lines
- `max-params`: Max 5 parameters
- `max-statements`: Max 30 statements

### SonarQube Quality Gates
- **Complexity**: Must be ≤ 15 per function
- **Cognitive Complexity**: Must be ≤ 20 per function
- **Code Coverage**: Minimum 80%
- **Code Duplication**: Maximum 5%
- **Technical Debt Ratio**: Maximum 5%

### Code Review Checklist
- [ ] All functions have complexity < 15
- [ ] No functions exceed 50 lines
- [ ] No files exceed 300 lines
- [ ] No nesting depth > 4
- [ ] No function has > 5 parameters
- [ ] Complex logic is documented with JSDoc comments
- [ ] Tests cover all complex functions

## Refactoring Guidelines

### When to Refactor
1. Function complexity > 10
2. File length > 200 lines
3. Code duplication detected
4. Difficult to test
5. Difficult to understand

### How to Refactor
1. **Identify**: Run complexity analysis
2. **Plan**: Determine refactoring strategy
3. **Test**: Ensure existing tests pass
4. **Refactor**: Apply changes incrementally
5. **Verify**: Confirm complexity reduction
6. **Document**: Update comments and docs

## Documentation Requirements

### JSDoc Comments
All functions with complexity > 5 must have JSDoc comments:

```typescript
/**
 * Process user verification
 * @param userId - Unique user identifier
 * @param verificationType - Type of verification (id, background, income)
 * @returns Verification result with status and details
 * @throws {ValidationError} If user not found or verification type invalid
 */
async function processVerification(
  userId: string,
  verificationType: string
): Promise<VerificationResult> {
  // Implementation
}
```

### Inline Comments
Complex logic should have inline comments explaining the "why":

```typescript
// Calculate pro-rated amount based on days remaining in billing cycle
// to ensure users only pay for actual usage period
const proratedAmount = calculateProration(amount, daysRemaining);
```

## Automated Quality Checks

### Pre-commit Hooks
```bash
# Run ESLint
npm run lint

# Run tests
npm test

# Check complexity
npm run complexity-check
```

### CI/CD Pipeline
1. **Lint**: ESLint with complexity rules
2. **Test**: Jest with coverage requirements
3. **SonarQube**: Quality gate analysis
4. **Complexity Report**: Generate and review

## Resources

- [Cyclomatic Complexity](https://en.wikipedia.org/wiki/Cyclomatic_complexity)
- [Cognitive Complexity](https://www.sonarsource.com/docs/CognitiveComplexity.pdf)
- [Clean Code by Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [Refactoring by Martin Fowler](https://refactoring.com/)
