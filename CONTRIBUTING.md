# Contributing to CoNest

Thank you for your interest in contributing to CoNest! This document provides guidelines and workflows for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branch Naming Convention](#branch-naming-convention)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Code Review Guidelines](#code-review-guidelines)
- [Story Points & Estimation](#story-points--estimation)
- [Definition of Done](#definition-of-done)
- [Security Guidelines](#security-guidelines)

---

## Code of Conduct

CoNest is a platform built to help single parents find safe housing. We expect all contributors to:

- Be respectful and inclusive
- Prioritize user safety and privacy in all decisions
- Never compromise on child safety principles
- Follow secure coding practices

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- React Native development environment (iOS/Android)
- PostgreSQL 14+ (via Docker)
- Redis 7+ (via Docker)

### Setup

```bash
# Clone the repository
git clone https://github.com/ghostmac/conest.git
cd conest

# Start infrastructure
docker-compose up -d

# Backend setup
cd backend
npm install
npm run migrate
npm run seed:dev
npm run dev

# Mobile setup (new terminal)
cd mobile
npm install
npx pod-install ios  # iOS only
npm start
```

---

## Development Workflow

We follow **GitHub Flow** - a simplified workflow that keeps `main` always deployable.

### Workflow Overview

```
main (always deployable)
  └── feature/123-add-profile-search
  └── bugfix/456-fix-login-error
  └── hotfix/789-security-patch
```

### Steps

1. **Create Issue** - All work starts with a GitHub Issue
2. **Create Branch** - Branch from `main` using naming convention
3. **Develop** - Make changes, commit frequently
4. **Open PR** - Create PR linking to the issue
5. **Review** - Get required approvals
6. **Merge** - Squash and merge to `main`
7. **Deploy** - Automated via CI/CD

---

## Branch Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/ISSUE-description` | `feature/123-add-profile-search` |
| Bug Fix | `bugfix/ISSUE-description` | `bugfix/456-fix-login-error` |
| Hotfix | `hotfix/ISSUE-description` | `hotfix/789-critical-security-fix` |
| Technical | `tech/ISSUE-description` | `tech/321-upgrade-dependencies` |
| Spike | `spike/ISSUE-description` | `spike/654-evaluate-caching` |

### Rules

- Always include the issue number
- Use lowercase with hyphens
- Keep descriptions brief but meaningful
- Use present tense (add, fix, update, not added, fixed, updated)

---

## Commit Message Format

We use **Conventional Commits** specification for commit messages.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons, etc. |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `build` | Build system or external dependencies |
| `ci` | CI/CD configuration |
| `chore` | Other changes that don't modify src or test files |
| `revert` | Reverts a previous commit |

### Scopes

| Scope | Description |
|-------|-------------|
| `backend` | Backend/API changes |
| `mobile` | Mobile app changes |
| `ios` | iOS-specific changes |
| `android` | Android-specific changes |
| `db` | Database migrations/models |
| `auth` | Authentication/authorization |
| `matching` | Matching algorithm |
| `messaging` | Real-time messaging |
| `payments` | Payment processing |
| `infra` | Infrastructure/DevOps |

### Examples

```bash
# Feature
feat(mobile): add profile search screen

# Bug fix
fix(backend): resolve null pointer in user service

# Breaking change
feat(api)!: change authentication endpoint response format

BREAKING CHANGE: The /api/auth/login endpoint now returns
tokens in a nested 'tokens' object instead of flat response.

# With issue reference
fix(matching): correct compatibility score calculation

Fixes #234
```

---

## Pull Request Process

### Before Opening a PR

1. ✅ Code compiles without errors
2. ✅ All tests pass locally
3. ✅ Linting passes (`npm run lint`)
4. ✅ Self-review completed
5. ✅ Commits follow conventional format
6. ✅ Branch is up to date with `main`

### PR Requirements

- **Title**: Follow commit convention (e.g., `feat(mobile): add profile search`)
- **Description**: Use the PR template completely
- **Issue Link**: Include `Closes #123` to auto-link
- **Labels**: Add appropriate labels
- **Assignees**: Assign yourself
- **Reviewers**: Add at least one reviewer

### Review Requirements

| Change Type | Required Approvals |
|-------------|-------------------|
| Standard changes | 1 approval |
| Security-related | 2 approvals |
| Database migrations | 2 approvals |
| Breaking changes | 2 approvals |
| Infrastructure | 2 approvals |

### Handling Merge Conflicts

```bash
# Fetch latest main
git fetch origin main

# Merge main into your branch
git merge origin/main

# Resolve conflicts manually
# Then commit the resolution
git add .
git commit -m "chore: resolve merge conflicts with main"

# Push updated branch
git push
```

⚠️ **Never** resolve complex merge conflicts via GitHub's web interface.

---

## Code Review Guidelines

### For Authors

- Respond to feedback promptly
- Don't take feedback personally
- Explain your reasoning if you disagree
- Re-request review after addressing comments

### For Reviewers

Focus on:

1. **Logic Correctness** - Does the code do what it's supposed to?
2. **Security** - Are there any vulnerabilities?
3. **Performance** - Any obvious bottlenecks?
4. **Maintainability** - Is the code readable and maintainable?
5. **Tests** - Are critical paths tested?

Avoid:
- Nitpicking style issues (let linters handle it)
- Blocking on personal preferences
- Vague comments without suggestions

### Comment Prefixes

| Prefix | Meaning |
|--------|---------|
| `blocking:` | Must be addressed before merge |
| `suggestion:` | Nice to have, not required |
| `question:` | Seeking clarification |
| `nit:` | Minor style issue |
| `praise:` | Highlighting good work |

---

## Story Points & Estimation

We use Fibonacci-like story points for estimation.

| Points | Time Estimate | Complexity |
|--------|---------------|------------|
| 1 | 2-4 hours | Trivial change |
| 2 | Half day | Simple change |
| 3 | 1 day | Moderate complexity |
| 5 | 2-3 days | Complex change |
| 8 | 1 week | Very complex |
| 13 | 1-2 weeks | Epic-level, should be broken down |

### Guidelines

- Points measure **complexity**, not just time
- Include time for testing and documentation
- If >8 points, consider breaking into smaller tasks
- Factor in unknowns and dependencies

---

## Definition of Done

A task is only "Done" when ALL of the following are true:

### Code Quality
- [ ] Code compiles without warnings
- [ ] All tests pass
- [ ] Linting passes
- [ ] No `TODO` comments left (or they reference issues)
- [ ] No `console.log` or debug statements

### Testing
- [ ] Unit tests added for new logic
- [ ] Integration tests for API changes
- [ ] E2E tests for critical user flows
- [ ] Manual testing completed

### Documentation
- [ ] Code is self-documenting with clear names
- [ ] Complex logic has inline comments
- [ ] API documentation updated if applicable
- [ ] README updated if setup changed

### Security
- [ ] No hardcoded secrets
- [ ] Input validation implemented
- [ ] Authentication/authorization correct
- [ ] **No child data collection** (CoNest requirement)

### Review
- [ ] PR approved by required reviewers
- [ ] All comments addressed
- [ ] Merged to `main`

---

## Security Guidelines

### CoNest-Specific Requirements

1. **No Child Data Storage** - The platform explicitly does NOT store any children's information. Never add fields for child names, photos, ages, or any identifying information.

2. **Parent-Only Interactions** - All features must be designed for adult users only.

3. **Verification Required** - All messaging features require verified users.

### General Security

- Never commit secrets, API keys, or passwords
- Use environment variables for configuration
- Validate all user input
- Use parameterized queries (no raw SQL)
- Follow OWASP Top 10 guidelines
- Report security issues privately to maintainers

---

## Need Help?

- 📖 Check the [Wiki](https://github.com/ghostmac/conest/wiki)
- 💬 Ask in [Discussions](https://github.com/ghostmac/conest/discussions)
- 🐛 Found a bug? [Create an issue](https://github.com/ghostmac/conest/issues/new/choose)

---

Thank you for contributing to CoNest! Together, we're building a safer housing solution for single parents. 🏠
