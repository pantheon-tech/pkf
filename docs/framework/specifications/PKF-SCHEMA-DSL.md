# PKF Schema DSL Specification

**Version:** 1.0.0-draft
**Status:** Draft
**Created:** 2025-12-28

---

## 1. Overview

The PKF Schema DSL (Domain-Specific Language) is a YAML-based language for defining document type schemas within PKF. It extends JSON Schema with PKF-specific features like composition via `_extends`, frontmatter mapping, and validation rules.

### Purpose

- Define document type schemas (api-doc, guide, architecture, etc.)
- Enable schema composition and reuse via `_extends`
- Specify frontmatter requirements and validation
- Generate JSON Schema artifacts for remark validation

---

## 2. File Format

PKF schemas are defined in a single `schemas.yaml` file in the project root.

**Basic Structure:**
```yaml
version: "1.0"
schemas:
  base-doc:
    # Base schema definition

  api-doc:
    _extends: base-doc
    # Specific schema definition
```

---

## 3. Schema Definition Syntax

### 3.1 Basic Schema

```yaml
schemas:
  my-doc-type:
    _description: "Human-readable description of this document type"
    _examples:
      - "docs/api/users.md"
      - "docs/api/products.md"

    properties:
      title:
        type: string
        required: true
        description: "Document title"

      status:
        type: string
        enum: [draft, review, published]
        required: true
        default: draft
```

### 3.2 Property Types

| Type | Description | Example |
|------|-------------|---------|
| `string` | Text value | `title: "My Doc"` |
| `number` | Numeric value | `version: 2` |
| `boolean` | True/false | `published: true` |
| `date` | ISO 8601 date | `created: 2025-12-28` |
| `array` | List of values | `tags: [api, guide]` |
| `object` | Nested structure | `author: {name, email}` |

### 3.3 Composition via `_extends`

Schemas can inherit from other schemas:

```yaml
schemas:
  # Base schema
  base-doc:
    properties:
      title:
        type: string
        required: true
      created:
        type: date
        required: true
      updated:
        type: date
        required: false

  # Extends base-doc
  api-doc:
    _extends: base-doc
    properties:
      endpoint:
        type: string
        required: true
        pattern: "^/api/.*"
      method:
        type: string
        enum: [GET, POST, PUT, DELETE, PATCH]
        required: true
```

**Resolution:** Properties from base schema are merged. Child schema properties override parent.

### 3.4 Validation Rules

#### Required Fields
```yaml
properties:
  title:
    type: string
    required: true  # Must be present
```

#### Enums
```yaml
properties:
  status:
    type: string
    enum: [draft, active, archived]
```

#### Patterns (Regex)
```yaml
properties:
  id:
    type: string
    pattern: "^[A-Z]{3}-[0-9]{3}$"  # e.g., DOC-001
```

#### Min/Max
```yaml
properties:
  version:
    type: number
    minimum: 1
    maximum: 999
```

#### Array Constraints
```yaml
properties:
  tags:
    type: array
    items:
      type: string
    minItems: 1
    maxItems: 10
    uniqueItems: true
```

### 3.5 Default Values

```yaml
properties:
  status:
    type: string
    default: draft
  created:
    type: date
    default: "{{TODAY}}"  # Special: current date
  author:
    type: string
    default: "{{GIT_USER}}"  # Special: git user.name
```

**Supported Placeholders:**
- `{{TODAY}}` - Current date (ISO 8601)
- `{{GIT_USER}}` - Git user.name from config
- `{{GIT_EMAIL}}` - Git user.email from config

---

## 4. Complete Example

```yaml
version: "1.0"

schemas:
  # Base schema for all documents
  base-doc:
    _description: "Base schema with common fields"
    properties:
      title:
        type: string
        required: true
        description: "Document title"

      created:
        type: date
        required: true
        default: "{{TODAY}}"
        description: "Creation date"

      updated:
        type: date
        required: false
        description: "Last updated date"

      author:
        type: string
        required: false
        default: "{{GIT_USER}}"
        description: "Document author"

  # API documentation schema
  api-doc:
    _extends: base-doc
    _description: "API endpoint documentation"
    _examples:
      - "docs/api/users.md"
      - "docs/api/products.md"

    properties:
      endpoint:
        type: string
        required: true
        pattern: "^/api/.*"
        description: "API endpoint path"

      method:
        type: string
        required: true
        enum: [GET, POST, PUT, DELETE, PATCH]
        description: "HTTP method"

      version:
        type: string
        required: true
        pattern: "^v[0-9]+$"
        description: "API version (e.g., v1)"

      deprecated:
        type: boolean
        default: false
        description: "Whether endpoint is deprecated"

  # User guide schema
  guide:
    _extends: base-doc
    _description: "User guide documentation"
    _examples:
      - "docs/guides/getting-started.md"
      - "docs/guides/advanced.md"

    properties:
      difficulty:
        type: string
        enum: [beginner, intermediate, advanced]
        required: true
        default: beginner
        description: "Guide difficulty level"

      topics:
        type: array
        items:
          type: string
        minItems: 1
        description: "Topics covered in guide"

      estimated_time:
        type: string
        pattern: "^[0-9]+ (minutes|hours)$"
        description: "Estimated completion time"
```

---

## 5. JSON Schema Generation

PKF Schema DSL compiles to JSON Schema for remark validation.

**DSL Input:**
```yaml
schemas:
  api-doc:
    properties:
      endpoint:
        type: string
        required: true
        pattern: "^/api/.*"
```

**Generated JSON Schema:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["endpoint"],
  "properties": {
    "endpoint": {
      "type": "string",
      "pattern": "^/api/.*"
    }
  }
}
```

---

## 6. Reserved Properties

Properties starting with `_` are reserved for PKF metadata:

| Property | Purpose |
|----------|---------|
| `_extends` | Schema inheritance |
| `_description` | Human-readable description |
| `_examples` | Example file paths |
| `_deprecated` | Mark schema as deprecated |
| `_version` | Schema version |

---

## 7. Validation

The DSL itself is validated via JSON Schema:

**Location:** `schemas/pkf-schema-dsl.schema.json`

**Validation:**
```bash
npm run pkf:validate:schema-dsl
```

---

## 8. Best Practices

### 8.1 Use Composition
Avoid duplicating common fields. Create base schemas.

**Bad:**
```yaml
api-doc:
  properties:
    title: {type: string, required: true}
    created: {type: date, required: true}

guide:
  properties:
    title: {type: string, required: true}
    created: {type: date, required: true}
```

**Good:**
```yaml
base-doc:
  properties:
    title: {type: string, required: true}
    created: {type: date, required: true}

api-doc:
  _extends: base-doc
  properties:
    endpoint: {type: string, required: true}

guide:
  _extends: base-doc
  properties:
    difficulty: {type: string, enum: [beginner, intermediate, advanced]}
```

### 8.2 Descriptive Enums
Use clear enum values:

**Bad:**
```yaml
status:
  enum: [0, 1, 2]
```

**Good:**
```yaml
status:
  enum: [draft, published, archived]
```

### 8.3 Document Schemas
Add descriptions and examples:

```yaml
api-doc:
  _description: "API endpoint documentation with versioning support"
  _examples:
    - "docs/api/users.md"
    - "docs/api/authentication.md"
```

---

**Version:** 1.0.0-draft
**Last Updated:** 2025-12-28
