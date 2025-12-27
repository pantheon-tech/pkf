# PKF Implementation Notes

> Implementation decisions, patterns, and observations.

**Last Updated:** 2025-12-27

---

## Patterns

### PATTERN: Result Type for Error Handling

All Template System functions use the Result pattern for type-safe error handling:

```typescript
type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };
```

**Rationale:** Explicit error handling, no exceptions, discriminated unions for type narrowing.

---

### PATTERN: Variable Escaping Order

Variable substitution processes escapes before substitution:

1. Replace `{{` with temporary placeholder
2. Replace `}}` with temporary placeholder
3. Substitute `{variable}` patterns
4. Restore placeholders to literal braces

**Rationale:** Prevents double-substitution bugs and ensures predictable output.

---

### PATTERN: Template vs Document Mode

Frontmatter generation supports two modes:

- **template**: Uses `{field}` placeholders for required fields without values
- **document**: Requires all required fields to have actual values

**Rationale:** Same generator serves both template creation and document instantiation.

---

## Decisions

### DECISION: YAML for Template Definitions

Templates are defined in YAML rather than JSON.

**Rationale:**
- YAML supports multiline strings without escaping
- More readable for body placeholders and item formats
- Consistent with PKF config format

---

### DECISION: Zod for Schema Validation

Using Zod instead of JSON Schema for template definition validation.

**Rationale:**
- TypeScript integration with inferred types
- Runtime validation with detailed error messages
- Composable schemas for inheritance

---

### DECISION: Template Filename Convention

Generated template files use `.template.md` extension.

**Rationale:**
- Distinguishes templates from actual documents
- Pattern matches existing PKF templates
- Clear signal for tooling to ignore

---

## Observations

### OBSERVATION: Existing PKF Templates Use Double-Brace

Current templates in `/mnt/devbox/skip/project/pkf/templates/` use `{{PLACEHOLDER}}` (double-brace) for manual placeholders.

Architecture Section 8.2 specifies:
- Single-brace `{var}` for auto-substitution
- Double-brace `{{var}}` for escaping (produces literal `{var}`)

**Action:** Existing templates follow different convention. May need migration guide or backward compatibility handling in future.

---

### OBSERVATION: Register Format Differs from Document Format

Architecture Section 8.1 defines two template formats:

1. **document**: frontmatter + body sections with headings
2. **register**: header + itemFormat for repeating entries

Implementation must handle both formats in generator.

---

**Version:** 1.0.0
