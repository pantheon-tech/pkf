# Contributing to {{PROJECT_NAME}}

Thank you for your interest in contributing to {{PROJECT_NAME}}! This document provides guidelines for contributing to this project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors.

### Expected Behavior

- Be respectful and considerate
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment or discriminatory language
- Trolling or insulting comments
- Personal or political attacks
- Publishing others' private information

---

## Getting Started

### Prerequisites

- {{PREREQUISITE_1}}
- {{PREREQUISITE_2}}
- {{PREREQUISITE_3}}

### Development Setup

```bash
# 1. Fork the repository
# Click "Fork" on GitHub

# 2. Clone your fork
git clone {{REPOSITORY_URL}}/{{YOUR_USERNAME}}/{{PROJECT_NAME}}.git
cd {{PROJECT_NAME}}

# 3. Add upstream remote
git remote add upstream {{REPOSITORY_URL}}

# 4. Install dependencies
{{INSTALL_COMMAND}}

# 5. Build the project
{{BUILD_COMMAND}}

# 6. Run tests to verify setup
{{TEST_COMMAND}}
```

---

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **Bug fixes** - Fix issues found in the codebase
- **Features** - Add new functionality
- **Documentation** - Improve or add documentation
- **Tests** - Add or improve test coverage
- **Performance** - Optimize existing code
- **Refactoring** - Improve code structure

### Finding Work

Good places to start:
- Issues labeled `good-first-issue`
- Issues labeled `help-wanted`
- Documentation improvements
- Test coverage gaps

---

## Coding Standards

### Code Style

- Follow {{STYLE_GUIDE}}
- Run linter before committing: `{{LINT_COMMAND}}`
- Format code: `{{FORMAT_COMMAND}}`

### Best Practices

- {{BEST_PRACTICE_1}}
- {{BEST_PRACTICE_2}}
- {{BEST_PRACTICE_3}}
- Write self-documenting code
- Add comments for complex logic
- Keep functions small and focused

### Testing Requirements

- Write tests for all new features
- Maintain or improve test coverage
- All tests must pass before submitting PR
- Include both positive and negative test cases

---

## Commit Guidelines

### Commit Message Format

```
{{COMMIT_TYPE}}: {{COMMIT_SUMMARY}}

{{COMMIT_BODY}}

{{COMMIT_FOOTER}}
```

### Commit Types

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only changes
- `style:` Formatting, missing semicolons, etc.
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `perf:` Performance improvement
- `test:` Adding or updating tests
- `chore:` Updating build tasks, package manager configs, etc.

### Examples

**Good commits:**
```
feat: add user authentication module

Implements JWT-based authentication with refresh tokens.
Includes login, logout, and token refresh endpoints.

Closes #123
```

```
fix: resolve memory leak in data processor

The processor was not properly releasing event listeners
after completion, causing memory to grow unbounded.

Fixes #456
```

**Bad commits:**
```
fixed stuff
```

```
WIP
```

---

## Pull Request Process

### Before Submitting

1. **Update from upstream**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks**
   ```bash
   {{LINT_COMMAND}}
   {{TEST_COMMAND}}
   {{BUILD_COMMAND}}
   ```

3. **Update documentation**
   - Update README if needed
   - Add/update API documentation
   - Update CHANGELOG.md

### Creating the PR

1. **Push your branch**
   ```bash
   git push origin {{BRANCH_NAME}}
   ```

2. **Create PR via GitHub**
   - Use a clear, descriptive title
   - Fill out the PR template completely
   - Link related issues
   - Add screenshots for UI changes

### PR Template

```markdown
## Description
{{DESCRIPTION}}

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
{{TESTING_PERFORMED}}

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] CHANGELOG.md updated

## Related Issues
Closes #{{ISSUE_NUMBER}}
```

### Review Process

- At least {{REQUIRED_REVIEWERS}} approval(s) required
- All automated checks must pass
- Address all review comments
- Maintainers may request changes

### After Approval

- Squash commits if requested
- Maintainer will merge when ready
- Delete your branch after merge

---

## Issue Guidelines

### Before Creating an Issue

1. Search existing issues (open and closed)
2. Check if it's already in the roadmap
3. Verify it's reproducible

### Bug Reports

Include:
- Clear, descriptive title
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, version, etc.)
- Screenshots/logs if applicable

**Template:**
```markdown
## Bug Description
A clear description of the bug.

## Steps to Reproduce
1. Step one
2. Step two
3. See error

## Expected Behavior
What should happen.

## Actual Behavior
What actually happens.

## Environment
- OS: {{OS}}
- Version: {{VERSION}}
- Node: {{NODE_VERSION}}

## Additional Context
Screenshots, logs, etc.
```

### Feature Requests

Include:
- Clear use case
- Proposed solution
- Alternatives considered
- Impact on existing features

**Template:**
```markdown
## Feature Description
Clear description of the proposed feature.

## Use Case
Why is this feature needed?

## Proposed Solution
How should it work?

## Alternatives
What other approaches did you consider?

## Additional Context
Any other relevant information.
```

---

## Development Workflow

### Branching Strategy

```
main                    # Production-ready code
  └── feature/xxx       # Your feature branch
```

### Workflow Steps

1. **Create feature branch**
   ```bash
   git checkout -b {{BRANCH_TYPE}}/{{FEATURE_NAME}}
   ```

2. **Make changes**
   - Write tests first (TDD approach)
   - Implement feature
   - Update documentation

3. **Commit frequently**
   - Small, logical commits
   - Clear commit messages

4. **Keep branch updated**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

5. **Submit PR**
   - Follow PR process above

---

## Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md` file
- Release notes
- Project README

Thank you for contributing to {{PROJECT_NAME}}!

---

## Questions?

- **Documentation:** [Developer Guide](docs/guides/DEVELOPER-GUIDE.md)
- **Chat:** {{CHAT_LINK}}
- **Issues:** [GitHub Issues]({{REPOSITORY_URL}}/issues)

---

**Template:** PKF Contributing Guide Template v1.0.0
**Version:** {{VERSION}} | **Last Updated:** {{DATE}}
