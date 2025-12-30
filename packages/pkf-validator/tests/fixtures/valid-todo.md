# TODO Register

This is a test TODO register with valid items.

---

## Active Items

### TODO-001: Implement user authentication

```yaml
id: TODO-001
type: todo-item
status: in-progress
priority: high
created: 2025-01-10
updated: 2025-01-15
assignee: "developer-1"
labels:
  - feature
  - authentication
depends_on: []
blocks:
  - TODO-002
description: "Implement OAuth2 authentication flow"
```

This task involves setting up the authentication system.

---

### TODO-002: Add user profile page

```yaml
id: TODO-002
type: todo-item
status: pending
priority: medium
created: 2025-01-12
assignee: null
labels:
  - feature
  - ui
depends_on:
  - TODO-001
description: "Create user profile page with settings"
```

Profile page depends on authentication being completed.

---

### TODO-003: Write documentation

```yaml
id: TODO-003
type: todo-item
status: completed
priority: low
created: 2025-01-08
updated: 2025-01-14
labels:
  - documentation
description: "Write API documentation"
```

Documentation task completed.

---

## Completed Items

_See TODO-003 above._
