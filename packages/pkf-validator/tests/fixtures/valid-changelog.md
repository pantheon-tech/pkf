# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

```yaml
version: unreleased
type: changelog-entry
status: unreleased
date: null
```

### Added
- New feature in development

---

## [1.0.0] - 2025-01-15

```yaml
version: 1.0.0
type: changelog-entry
status: released
date: 2025-01-15
release_type: major
breaking_changes: true
migration_required: true
migration_notes: "Update all API calls to use v2 endpoint"
highlights:
  - "First stable release"
  - "Complete API overhaul"
contributors:
  - "developer-1"
  - "developer-2"
```

### Added
- Initial stable API
- User authentication system
- Data export functionality

### Changed
- Migrated to new database schema
- Updated all dependencies

### Deprecated
- Old v1 API endpoints (will be removed in 2.0.0)

### Security
- Fixed XSS vulnerability in user inputs

---

## [0.5.0] - 2025-01-01

```yaml
version: 0.5.0
type: changelog-entry
status: released
date: 2025-01-01
release_type: minor
breaking_changes: false
```

### Added
- Beta features for testing
- Experimental API endpoints

### Fixed
- Memory leak in data processing
- Date formatting issues

---

## [0.1.0-alpha.1] - 2024-12-01

```yaml
version: 0.1.0-alpha.1
type: changelog-entry
status: released
date: 2024-12-01
release_type: alpha
breaking_changes: false
```

### Added
- Initial project scaffold
- Basic functionality
