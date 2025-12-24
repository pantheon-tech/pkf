# PKF Agent Definitions

> AI agent definitions for PKF documentation tasks.

## Contents

| Agent | Purpose |
|-------|---------|
| [documentation-analyst.md](documentation-analyst.md) | Documentation auditing, gap analysis, quality assessment |
| [documentation-writer.md](documentation-writer.md) | Documentation creation and maintenance |
| [codebase-doc-comparator.md](codebase-doc-comparator.md) | Doc/code drift detection |

## Agent Overview

### documentation-analyst

Analyzes documentation coverage, quality, and standards compliance:

- Coverage audits
- Gap identification
- Quality assessment
- Standards validation

### documentation-writer

Creates and maintains documentation:

- API documentation
- README files
- User guides
- Register entries

### codebase-doc-comparator

Detects drift between documentation and implementation:

- Architecture drift
- API specification drift
- Feature completeness analysis
- Register synchronization

## Usage

### With Claude Code

Reference agents in your CLAUDE.md:

```markdown
## AI Agent Integration

For documentation tasks, use these agents:
- `documentation-analyst` - For audits and gap analysis
- `documentation-writer` - For creating documentation
- `codebase-doc-comparator` - For drift detection
```

### Agent Workflow Patterns

**Sequential Analysis:**
```
documentation-analyst → codebase-doc-comparator → documentation-writer
(Audit gaps → Verify drift → Fill gaps)
```

**Parallel Audit:**
```
├─> documentation-analyst (coverage)
├─> codebase-doc-comparator (drift)
└─> [aggregate findings]
```

## See Also

- [PKF Specification](../docs/framework/specifications/PKF-SPECIFICATION.md) - Agent integration standards
- [CLAUDE.md](../CLAUDE.md) - Project AI guidance

---

**Last Updated:** 2025-12-24
