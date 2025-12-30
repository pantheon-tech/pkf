---
title: PKF Peer Review Feedback
version: "1.0.0"
status: Archived
category: reference
created: 2025-12-28
author: External Peer Review
tags:
  - review
  - feedback
  - architecture
---

# PKF Peer Review Feedback

**Review ID:** PKF-REVIEW-001
**Date:** 2025-12-28
**Reviewer:** External Peer Review
**Status:** Requires Revision
**Documents Reviewed:**
- `PKF-ARCHITECTURE.md` (v1.0.0-draft)
- `PKF-ENFORCEMENT-RESEARCH.md` (v1.0.0)

---

## Review Summary

| Document | Verdict | Critical Issues | Major Issues | Minor Issues |
|----------|---------|-----------------|--------------|--------------|
| PKF-ARCHITECTURE.md | Revise | 2 | 4 | 3 |
| PKF-ENFORCEMENT-RESEARCH.md | Revise | 1 | 2 | 2 |
| Cross-Document | Revise | 1 | 0 | 0 |

**Overall Verdict:** REVISE AND RESUBMIT

The architecture is conceptually sound but has specification gaps that will cause implementation ambiguity. The research document contradicts the architecture on key implementation decisions.

---

## Critical Issues

Issues that block implementation or create fundamental ambiguity.

### CRIT-001: Missing Compiler/Runtime Specification

**Document:** PKF-ARCHITECTURE.md
**Location:** Section 4 (Architecture Overview), Section 13 (Implementation Roadmap)
**Severity:** Critical

**Problem:**
The specification defines `pkf.config.yaml` with complex features (_items inheritance, _lifecycle state machines, schema compilation) but never specifies what component parses this configuration. Section 13 mentions "Compose pattern parser" as a roadmap item but provides no architecture for this critical component.

**Impact:**
- Implementers cannot build PKF without inventing this component
- No defined interface between config and validation tools
- Ambiguous whether this is a build-time compiler or runtime interpreter

**Required Actions:**
1. Add new section "5.5 Configuration Processor" defining:
   - Input: `pkf.config.yaml`
   - Output: Generated JSON Schemas, directory structure expectations, remark config
   - Execution model: Build-time vs runtime
   - Error handling behavior
2. Update Architecture Diagram (Section 4.1) to show processor component
3. Define processor interface in TypeScript/Zod schema

**Acceptance Criteria:**
- [ ] New section documents processor input/output contract
- [ ] Architecture diagram includes processor component
- [ ] Processor interface schema exists in Appendix B

---

### CRIT-002: Unverified External Dependency

**Document:** PKF-ARCHITECTURE.md
**Location:** Section 9.2 (Validation Tools), line 699
**Severity:** Critical

**Problem:**
The specification lists `directory-schema-validator` as a core validation tool. This npm package appears to be unmaintained (last publish >2 years ago, minimal downloads, no active maintenance).

**Impact:**
- Core enforcement capability may not function
- Security risk from unmaintained dependency
- No fallback specified

**Required Actions:**
1. Verify package viability or identify alternative
2. If no viable alternative exists, specify custom implementation requirement
3. Add dependency health criteria to tool selection

**Recommended Alternatives:**
- Custom validator using `fast-glob` + `ajv`
- `folder-schema` package (verify maintenance status)
- Explicit custom implementation in Phase 1

**Acceptance Criteria:**
- [ ] All listed npm packages verified as actively maintained (commit within 12 months)
- [ ] Fallback strategy documented for each external tool
- [ ] Package health criteria added to Appendix C

---

### CRIT-003: Architecture vs Research Contradiction

**Document:** PKF-ARCHITECTURE.md, PKF-ENFORCEMENT-RESEARCH.md
**Location:** Architecture Section 3.1, Research Section 9
**Severity:** Critical

**Problem:**
The documents present contradictory implementation approaches:

| Aspect | Architecture Spec | Research Doc |
|--------|-------------------|--------------|
| Implementation | "No Custom Code Required" - pure config | CLI toolchain (`pkf init`, `pkf lint`, etc.) |
| Primary tools | ajv-cli, remark-cli direct invocation | Wrapper CLI with subcommands |
| User interaction | npm scripts in package.json | `pkf` command-line tool |

**Impact:**
- Implementers receive conflicting guidance
- Cannot determine canonical approach
- Resource allocation unclear

**Required Actions:**
1. Decide canonical implementation approach
2. Update losing document to align OR clearly mark as "future direction"
3. Add "Implementation Philosophy" section to Architecture spec clarifying the approach

**Options:**
- **Option A:** Architecture is current spec, Research is roadmap → Add "Future: CLI Toolchain" section to Architecture
- **Option B:** Research supersedes Architecture → Update Architecture Section 3 and Section 9 to specify CLI approach

**Acceptance Criteria:**
- [ ] Single canonical implementation approach documented
- [ ] Both documents aligned or explicitly marked as current vs future
- [ ] No contradictory guidance remains

---

## Major Issues

Issues that cause implementation difficulty or specification gaps.

### MAJ-001: Schema DSL Transformation Rules Undefined

**Document:** PKF-ARCHITECTURE.md
**Location:** Section 7.1 (Schema Hierarchy), Section 7.2 (JSON Schema Generation)
**Severity:** Major

**Problem:**
Section 7.1 defines schemas using a custom YAML DSL with features not native to JSON Schema:
- `extends: base-entry` (inheritance)
- `id.prefix`, `id.pattern`, `id.padding` (composite properties)
- `statuses: [...]` (shorthand for enum)
- `type: date` (non-JSON-Schema type)

Section 7.2 shows JSON Schema output but never defines transformation rules.

**Examples of undefined behavior:**
```yaml
# Input (Section 7.1)
todo-item:
  extends: base-entry
  id:
    prefix: "TODO"
    pattern: "^TODO-\\d{3,}$"
```
```json
// Output (Section 7.2) - How does this transform?
{
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^TODO-\\d{3,}$"
    }
  }
}
```

**Required Actions:**
1. Document all DSL keywords and their JSON Schema equivalents
2. Specify `extends` resolution order and conflict handling
3. Define error behavior for invalid DSL constructs
4. Add transformation examples for each DSL feature

**Acceptance Criteria:**
- [ ] New section "7.3 Schema DSL Reference" with keyword definitions
- [ ] Transformation rules for: `extends`, `id.*`, `statuses`, `type: date`
- [ ] At least one example per DSL keyword showing input → output

---

### MAJ-002: Lifecycle State Machine Incomplete

**Document:** PKF-ARCHITECTURE.md
**Location:** Section 5.2 (Tree Structure), Section 6.1 (Type Definitions)
**Severity:** Major

**Problem:**
The `_lifecycle` and `lifecycle-state` type introduce state machine semantics but leave critical behaviors undefined:

1. `_terminal: true` implies transitions are restricted, but no transition rules exist
2. No specification for what happens when files are manually moved between states
3. No validation that enforces state constraints
4. `_default: true` behavior when multiple defaults exist is undefined

**Required Actions:**
1. Define allowed state transitions (or explicitly state "no enforcement")
2. Specify behavior for manual file moves (error, warning, auto-correct, ignore)
3. Add transition validation to enforcement layer or document exclusion
4. Define `_default` conflict resolution

**Acceptance Criteria:**
- [ ] State transition matrix or explicit "transitions not enforced" statement
- [ ] Manual move behavior documented
- [ ] If transitions enforced: validation rule in Section 9

---

### MAJ-003: Filing Agent Scope Creep

**Document:** PKF-ARCHITECTURE.md
**Location:** Section 10 (Filing Agent Protocol)
**Severity:** Major

**Problem:**
The Filing Agent section (~200 lines, complex TypeScript schemas, multi-step protocol) represents a significant feature that:
- Is marked "Optional" in Layer 4 but has mandatory-looking schemas
- Has no clear boundary with OAF (references "OAF handoff system")
- Introduces concepts not used elsewhere (clarification loops, RAG integration)

This creates scope ambiguity: Is PKF a documentation framework or an AI orchestration system?

**Required Actions:**
Choose one:
1. **Extract:** Move Filing Agent to separate `PKF-FILING-AGENT.md` specification, reference from main spec
2. **Integrate:** Add Filing Agent to core architecture diagram, remove "Optional" designation
3. **Defer:** Move entire section to "Future Work" appendix

**Recommendation:** Option 1 (Extract) - keeps core spec focused while preserving the work.

**Acceptance Criteria:**
- [ ] Filing Agent scope clearly bounded
- [ ] Main spec stands alone without Filing Agent knowledge
- [ ] Integration points explicitly defined if extracted

---

### MAJ-004: Missing Prose Linting Layer

**Document:** PKF-ARCHITECTURE.md
**Location:** Section 9 (Enforcement Architecture)
**Severity:** Major

**Problem:**
The Research document (Section 2.1) identifies prose enforcement (Vale, terminology consistency) as Layer 2 of successful documentation frameworks. The Architecture spec omits this entirely.

**Impact:**
- Documentation quality limited to structure, not content
- Inconsistent with research findings
- Missing industry-standard tooling

**Required Actions:**
1. Add Vale to validation tools (Section 9.2)
2. Include prose validation in enforcement layers diagram (Section 9.1)
3. Add `.vale.ini` configuration example
4. Update package.json scripts (Section 9.3)

**Acceptance Criteria:**
- [ ] Vale listed in Section 9.2 tool table
- [ ] Prose validation layer in Section 9.1 diagram
- [ ] Configuration example provided

---

### MAJ-005: Research Timeline Optimism

**Document:** PKF-ENFORCEMENT-RESEARCH.md
**Location:** Section 9 (Implementation Roadmap)
**Severity:** Major

**Problem:**
Phase estimates appear optimistic:
- "Phase 1: Core CLI (2-3 weeks)" for init/lint/validate/check
- Production-quality CLI with error handling, edge cases, tests, and documentation typically requires 4-6 weeks minimum

**Impact:**
- Planning based on these estimates will fail
- Stakeholder expectations misaligned

**Required Actions:**
1. Revise estimates with explicit assumptions
2. Add "Estimates assume: [list conditions]"
3. Provide range estimates (optimistic/realistic/pessimistic)

**Acceptance Criteria:**
- [ ] Estimates include assumption list
- [ ] Range estimates provided
- [ ] Total timeline realistic for production quality

---

### MAJ-006: Uncited Statistics

**Document:** PKF-ENFORCEMENT-RESEARCH.md
**Location:** Section 1 (The Problem: Documentation Drift), line 53
**Severity:** Major

**Problem:**
The claim "75% of APIs do not conform to specifications (2025 API research)" lacks a citation. This undermines research credibility.

**Required Actions:**
1. Add proper citation with URL
2. If source cannot be found, remove or qualify claim
3. Review all statistics for proper attribution

**Acceptance Criteria:**
- [ ] All statistics have verifiable citations
- [ ] Citations include URLs where available

---

## Minor Issues

Issues that affect clarity or completeness but don't block implementation.

### MIN-001: Inconsistent Property Naming

**Document:** PKF-ARCHITECTURE.md
**Location:** Throughout

**Problem:**
Special properties use inconsistent conventions:
- Underscore prefix: `_type`, `_schema`, `_items`
- No prefix: `version`, `project`
- Mixed in same context

**Required Actions:**
1. Document naming convention in Section 5.4
2. State rule: "All PKF-reserved properties use underscore prefix"

---

### MIN-002: Missing Error Examples

**Document:** PKF-ARCHITECTURE.md
**Location:** Section 9 (Enforcement Architecture)

**Problem:**
No examples of validation failure output. Implementers and users need to understand error format.

**Required Actions:**
1. Add "9.6 Error Output Examples" showing sample failures
2. Include at least: schema validation error, structure error, link error

---

### MIN-003: Template Variable Escaping Undefined

**Document:** PKF-ARCHITECTURE.md
**Location:** Section 8.2 (Template Variables)

**Problem:**
Template variables use `{variable}` syntax but no escaping mechanism defined. What if content contains literal `{id}`?

**Required Actions:**
1. Define escape syntax (e.g., `\{id\}` or `{{id}}` for literal)
2. Add to Section 8.2

---

### MIN-004: Research Missing Tradeoffs Section

**Document:** PKF-ENFORCEMENT-RESEARCH.md
**Location:** General

**Problem:**
No discussion of enforcement costs: CI minutes, developer friction, legitimate bypass needs.

**Required Actions:**
1. Add "Tradeoffs and Costs" section
2. Address: CI compute cost, developer experience impact, escape hatches

---

### MIN-005: Diagram ASCII Art Alignment

**Document:** PKF-ARCHITECTURE.md
**Location:** Multiple sections

**Problem:**
Some ASCII diagrams have alignment issues that may render incorrectly in different viewers.

**Required Actions:**
1. Verify all diagrams render correctly in GitHub markdown preview
2. Consider adding Mermaid alternatives for complex diagrams

---

## Positive Findings

Elements that work well and should be preserved.

### POS-001: Compose Pattern Innovation
The config-mirrors-structure approach is intuitive and reduces cognitive overhead. Preserve this as core design principle.

### POS-002: Existing Tool Integration
Leveraging ajv, remark, husky rather than building custom validators is pragmatic. Maintain this philosophy.

### POS-003: Layered Validation Model (Research)
The four-layer validation model (structure → prose → content → contracts) is well-researched and actionable.

### POS-004: Clarification Loop Protocol
The Filing Agent's iterative clarification design handles real-world ambiguity well. Worth preserving even if extracted.

### POS-005: Immutability Patterns (Research)
The analysis of what should/shouldn't be mutable (ADRs immutable, TODOs mutable) is valuable guidance.

---

## Action Item Summary

### Immediate (Block v1.0 Release)
| ID | Action | Document |
|----|--------|----------|
| CRIT-001 | Define configuration processor | Architecture |
| CRIT-002 | Verify/replace directory-schema-validator | Architecture |
| CRIT-003 | Resolve architecture vs research contradiction | Both |

### Before Implementation
| ID | Action | Document |
|----|--------|----------|
| MAJ-001 | Document schema DSL transformation rules | Architecture |
| MAJ-002 | Define lifecycle state machine behavior | Architecture |
| MAJ-003 | Scope/extract Filing Agent | Architecture |
| MAJ-004 | Add prose linting (Vale) | Architecture |
| MAJ-006 | Add missing citations | Research |

### Before Publication
| ID | Action | Document |
|----|--------|----------|
| MAJ-005 | Revise timeline estimates | Research |
| MIN-001 | Document property naming convention | Architecture |
| MIN-002 | Add error output examples | Architecture |
| MIN-003 | Define template escaping | Architecture |
| MIN-004 | Add tradeoffs section | Research |
| MIN-005 | Fix diagram alignment | Architecture |

---

## Revision Checklist

Use this checklist when resubmitting for review:

```
[ ] All CRIT issues resolved
[ ] All MAJ issues resolved or deferred with justification
[ ] Cross-document consistency verified
[ ] Version numbers incremented
[ ] Document history updated
[ ] No new issues introduced by changes
```

---

## Reviewer Notes

This review focused on specification completeness and implementability. Code-level review will occur during implementation phase.

Questions during revision can reference issue IDs (e.g., "Regarding CRIT-001, we chose Option B because...").

**End of Review**
