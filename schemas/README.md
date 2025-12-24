# PKF Schemas

> JSON Schema validation files for PKF documents.

## Contents

| Schema | Purpose |
|--------|---------|
| [pkf-config.schema.json](pkf-config.schema.json) | Project-level PKF configuration |
| [document-frontmatter.schema.json](document-frontmatter.schema.json) | Standard document frontmatter |
| [register-entry.schema.json](register-entry.schema.json) | Base register entry (abstract) |
| [todo-item.schema.json](todo-item.schema.json) | TODO register item |
| [issue-item.schema.json](issue-item.schema.json) | Issue register item |
| [changelog-entry.schema.json](changelog-entry.schema.json) | Changelog entry |
| [directory-structure.schema.json](directory-structure.schema.json) | Directory structure rules |
| [template-metadata.schema.json](template-metadata.schema.json) | Template placeholder metadata |

## Usage

### Validation with AJV (Node.js)

```bash
# Install ajv-cli
npm install -g ajv-cli

# Validate a TODO item
ajv validate -s todo-item.schema.json -d my-todo.json
```

### IDE Integration

Most IDEs support JSON Schema validation. Reference schemas in your documents:

```json
{
  "$schema": "./schemas/todo-item.schema.json",
  "id": "TODO-001",
  "type": "todo-item"
}
```

## Schema Hierarchy

```
register-entry.schema.json (base)
├── todo-item.schema.json
├── issue-item.schema.json
└── changelog-entry.schema.json

pkf-config.schema.json (standalone)
document-frontmatter.schema.json (standalone)
directory-structure.schema.json (standalone)
template-metadata.schema.json (standalone)
```

## See Also

- [PKF Specification](../docs/framework/specifications/PKF-SPECIFICATION.md) - Schema standards
- [Templates](../templates/) - Document templates

---

**Last Updated:** 2025-12-24
