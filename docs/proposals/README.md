# Proposals

> Design proposals, architecture documents, and RFCs for PKF.

## Overview

This directory contains proposals for new features, architectural decisions, and research documents that guide PKF development. Documents are organized by lifecycle state.

## Lifecycle States

| Directory | Description |
|-----------|-------------|
| [draft/](draft/) | Proposals in development, not yet reviewed |
| [active/](active/) | Approved and in-progress proposals |
| [archived/](archived/) | Superseded or rejected proposals |
| [research/](research/) | Research and analysis documents |

## Active Proposals

### PKF AI-Assisted Initialization

A feature to enable AI-powered initialization of PKF in existing projects.

- [PKF-AI-INIT-ARCHITECTURE-v1.1.md](active/PKF-AI-INIT-ARCHITECTURE-v1.1.md) - Revised architecture (approved, score 9.25/10)
- [PKF-AI-INIT-IMPLEMENTATION-PLAN.md](active/PKF-AI-INIT-IMPLEMENTATION-PLAN.md) - Implementation plan (approved, score 9.7/10)
- [PKF-PEER-REVIEW-FOLLOWUP.md](active/PKF-PEER-REVIEW-FOLLOWUP.md) - Final review approval

### Research

- [PKF-ENFORCEMENT-RESEARCH.md](research/PKF-ENFORCEMENT-RESEARCH.md) - Enforcement mechanisms research

## Archived

- [PKF-AI-INIT-ARCHITECTURE.md](archived/PKF-AI-INIT-ARCHITECTURE.md) - Original architecture (superseded by v1.1)
- [PKF-PEER-REVIEW-FEEDBACK.md](archived/PKF-PEER-REVIEW-FEEDBACK.md) - Initial peer review

---

## Contributing

New proposals should:
1. Start in `draft/` during development
2. Include YAML frontmatter with `category: proposal` and `status: Draft`
3. Move to `active/` after approval
4. Move to `archived/` when superseded

---

**Last Updated:** 2025-12-29
