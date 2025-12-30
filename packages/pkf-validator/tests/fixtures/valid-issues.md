# ISSUES Register

This is a test ISSUES register with valid items.

---

## Open Issues

### ISSUE-001: Memory leak in data processing

```yaml
id: ISSUE-001
type: issue-item
status: investigating
severity: high
priority: high
created: 2025-01-10
updated: 2025-01-15
reported_by: "user-1"
assignee: "developer-1"
labels:
  - bug
  - performance
affects_version: "0.5.0"
summary: "Memory consumption grows over time during batch processing"
steps_to_reproduce:
  - "Start a batch job with 10,000+ items"
  - "Monitor memory usage"
  - "Observe continuous growth"
expected_behavior: "Memory should be stable or grow minimally"
actual_behavior: "Memory grows by ~10MB per 1000 items"
environment:
  os: "Linux Ubuntu 22.04"
  nodejs_version: "20.10.0"
  package_version: "0.5.0"
root_cause: null
workaround: "Restart the process after every 5000 items"
```

Investigation ongoing.

---

### ISSUE-002: Incorrect date formatting in reports

```yaml
id: ISSUE-002
type: issue-item
status: open
severity: medium
priority: medium
created: 2025-01-12
reported_by: "user-2"
labels:
  - bug
  - ui
affects_version: "0.5.1"
summary: "Dates display in wrong format for non-US locales"
expected_behavior: "Dates should respect user locale"
actual_behavior: "All dates shown as MM/DD/YYYY"
related_issues:
  - ISSUE-001
```

Minor display issue.

---

## Resolved Issues

### ISSUE-003: Login failure with special characters in password

```yaml
id: ISSUE-003
type: issue-item
status: resolved
severity: critical
priority: critical
created: 2025-01-05
updated: 2025-01-08
reported_by: "user-3"
assignee: "developer-2"
labels:
  - bug
  - security
affects_version: "0.4.0"
fixed_in_version: "0.4.1"
summary: "Users with special characters in password cannot log in"
resolution: "Fixed URL encoding of password in auth request"
```

Fixed in version 0.4.1.
