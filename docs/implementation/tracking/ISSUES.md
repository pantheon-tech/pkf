# PKF Implementation Issues

> Identified issues, unclear requirements, and implementation risks.

**Last Updated:** 2025-12-27

---

## Open Issues

### ISSUE-001: Template Placeholder Convention Mismatch

**Severity:** Minor
**Status:** Open
**Component:** Template System

**Description:**
Existing PKF template files use `{{PLACEHOLDER}}` (double-brace, uppercase) convention for manual placeholders. Architecture Section 8.2 specifies:
- `{var}` for auto-substitution
- `{{var}}` for escaping (produces literal `{var}`)

**Impact:**
- Existing templates may not work with new system
- Potential user confusion about placeholder syntax

**Proposed Resolution:**
1. Document clear distinction: `{var}` = auto, `{{VAR}}` = manual placeholder (different casing)
2. Or: migrate existing templates to use `{VAR}` style
3. Or: add third syntax for manual placeholders

**Assigned:** Unassigned

---

### ISSUE-002: Missing Template Variable Schema

**Severity:** Minor
**Status:** Open
**Component:** Schema System

**Description:**
Architecture Section 8.2 lists standard variables (`{id}`, `{title}`, etc.) but does not define:
- Which variables are required vs optional
- Variable type constraints (e.g., date format)
- Custom variable extension mechanism

**Impact:**
- Unclear validation rules for template content
- May allow invalid variable references

**Proposed Resolution:**
Add variable schema to templates.yaml allowing explicit variable declarations per template.

**Assigned:** Unassigned

---

### ISSUE-003: Frontmatter Type Coercion

**Severity:** Low
**Status:** Open
**Component:** Template System

**Description:**
When generating frontmatter with defaults and variables:
- YAML types (string, number, boolean) may not match schema expectations
- Date fields specified as strings in variables

**Impact:**
- Generated frontmatter may fail schema validation
- Type mismatches between template and schema

**Proposed Resolution:**
Add type hints to frontmatter config allowing explicit type coercion.

**Assigned:** Unassigned

---

## Closed Issues

None.

---

## Risk Register

| Risk | Probability | Impact | Mitigation | Status |
|------|-------------|--------|------------|--------|
| YAML parsing edge cases | Medium | Medium | Comprehensive test suite | Active |
| Variable collision | Low | Medium | Clear escape syntax | Active |
| File permission errors | Low | High | Dry-run mode, clear errors | Active |

---

**Version:** 1.0.0
