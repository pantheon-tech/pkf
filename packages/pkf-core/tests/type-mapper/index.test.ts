/**
 * Type Mapper Module Tests
 *
 * Comprehensive test suite for document type detection, path resolution,
 * and schema mapping functionality.
 */

import { describe, it, expect } from 'vitest';
import {
  PKF_TYPE_TO_DIRECTORY,
  DOC_TYPE_TO_SCHEMA,
  ROOT_LEVEL_FILES,
  PACKAGE_ROOT_FILES,
  detectDocumentType,
  resolveTargetPath,
  getRequiredDirectories,
  shouldExcludeFromReorganization,
  normalizeDocType,
  getSchemaForDocType,
} from '../../src/type-mapper/index.js';

describe('Type Mapper Module', () => {
  describe('PKF_TYPE_TO_DIRECTORY constant', () => {
    it('should map readme types to root', () => {
      expect(PKF_TYPE_TO_DIRECTORY['readme']).toBe('');
      expect(PKF_TYPE_TO_DIRECTORY['project-readme']).toBe('');
    });

    it('should map guide types to docs/guides', () => {
      expect(PKF_TYPE_TO_DIRECTORY['guide']).toBe('docs/guides');
      expect(PKF_TYPE_TO_DIRECTORY['tutorial']).toBe('docs/guides');
      expect(PKF_TYPE_TO_DIRECTORY['getting-started']).toBe('docs/guides');
    });

    it('should map api types to docs/api', () => {
      expect(PKF_TYPE_TO_DIRECTORY['api']).toBe('docs/api');
      expect(PKF_TYPE_TO_DIRECTORY['api-reference']).toBe('docs/api');
      expect(PKF_TYPE_TO_DIRECTORY['rest-api']).toBe('docs/api');
    });

    it('should map architecture types to docs/architecture', () => {
      expect(PKF_TYPE_TO_DIRECTORY['architecture']).toBe('docs/architecture');
      expect(PKF_TYPE_TO_DIRECTORY['design-doc']).toBe('docs/architecture');
    });

    it('should map adr types to docs/architecture/decisions', () => {
      expect(PKF_TYPE_TO_DIRECTORY['adr']).toBe('docs/architecture/decisions');
      expect(PKF_TYPE_TO_DIRECTORY['decision-record']).toBe('docs/architecture/decisions');
    });

    it('should map proposal types to docs/proposals/active', () => {
      expect(PKF_TYPE_TO_DIRECTORY['proposal']).toBe('docs/proposals/active');
      expect(PKF_TYPE_TO_DIRECTORY['rfc']).toBe('docs/proposals/active');
    });

    it('should map register types to docs/registers', () => {
      expect(PKF_TYPE_TO_DIRECTORY['register']).toBe('docs/registers');
      expect(PKF_TYPE_TO_DIRECTORY['todo']).toBe('docs/registers');
      expect(PKF_TYPE_TO_DIRECTORY['changelog']).toBe('docs/registers');
    });

    it('should have fallback mappings', () => {
      expect(PKF_TYPE_TO_DIRECTORY['generic']).toBe('docs');
      expect(PKF_TYPE_TO_DIRECTORY['other']).toBe('docs');
    });
  });

  describe('DOC_TYPE_TO_SCHEMA constant', () => {
    it('should map readme types to base-doc schema', () => {
      expect(DOC_TYPE_TO_SCHEMA['readme']).toBe('base-doc');
      expect(DOC_TYPE_TO_SCHEMA['project-readme']).toBe('base-doc');
    });

    it('should map guide types to guide schema', () => {
      expect(DOC_TYPE_TO_SCHEMA['guide']).toBe('guide');
      expect(DOC_TYPE_TO_SCHEMA['tutorial']).toBe('guide');
      expect(DOC_TYPE_TO_SCHEMA['getting-started']).toBe('guide');
    });

    it('should map api types to spec schema', () => {
      expect(DOC_TYPE_TO_SCHEMA['api']).toBe('spec');
      expect(DOC_TYPE_TO_SCHEMA['api-reference']).toBe('spec');
    });

    it('should map adr types to adr schema', () => {
      expect(DOC_TYPE_TO_SCHEMA['adr']).toBe('adr');
      expect(DOC_TYPE_TO_SCHEMA['decision-record']).toBe('adr');
    });

    it('should map proposal types to proposal schema', () => {
      expect(DOC_TYPE_TO_SCHEMA['proposal']).toBe('proposal');
      expect(DOC_TYPE_TO_SCHEMA['rfc']).toBe('proposal');
    });

    it('should have fallback schema mappings', () => {
      expect(DOC_TYPE_TO_SCHEMA['generic']).toBe('base-doc');
      expect(DOC_TYPE_TO_SCHEMA['other']).toBe('base-doc');
    });
  });

  describe('ROOT_LEVEL_FILES constant', () => {
    it('should contain standard root-level files', () => {
      expect(ROOT_LEVEL_FILES.has('README.md')).toBe(true);
      expect(ROOT_LEVEL_FILES.has('CHANGELOG.md')).toBe(true);
      expect(ROOT_LEVEL_FILES.has('CONTRIBUTING.md')).toBe(true);
      expect(ROOT_LEVEL_FILES.has('LICENSE.md')).toBe(true);
      expect(ROOT_LEVEL_FILES.has('CLAUDE.md')).toBe(true);
    });

    it('should not contain non-root files', () => {
      expect(ROOT_LEVEL_FILES.has('guide.md')).toBe(false);
      expect(ROOT_LEVEL_FILES.has('api.md')).toBe(false);
    });
  });

  describe('PACKAGE_ROOT_FILES constant', () => {
    it('should contain package-level files', () => {
      expect(PACKAGE_ROOT_FILES.has('README.md')).toBe(true);
      expect(PACKAGE_ROOT_FILES.has('CHANGELOG.md')).toBe(true);
      expect(PACKAGE_ROOT_FILES.has('CLAUDE.md')).toBe(true);
    });

    it('should not contain CONTRIBUTING.md', () => {
      expect(PACKAGE_ROOT_FILES.has('CONTRIBUTING.md')).toBe(false);
    });
  });

  describe('detectDocumentType()', () => {
    describe('README detection', () => {
      it('should detect README.md as readme', () => {
        expect(detectDocumentType('README.md')).toBe('readme');
        expect(detectDocumentType('readme.md')).toBe('readme');
      });

      it('should detect README in subdirectories', () => {
        expect(detectDocumentType('packages/core/README.md')).toBe('readme');
        expect(detectDocumentType('docs/api/readme.md')).toBe('readme');
      });
    });

    describe('Changelog detection', () => {
      it('should detect changelog files', () => {
        expect(detectDocumentType('CHANGELOG.md')).toBe('changelog');
        expect(detectDocumentType('changelog.md')).toBe('changelog');
        expect(detectDocumentType('CHANGES.md')).toBe('changelog');
        expect(detectDocumentType('HISTORY.md')).toBe('changelog');
      });
    });

    describe('Contributing detection', () => {
      it('should detect contributing files', () => {
        expect(detectDocumentType('CONTRIBUTING.md')).toBe('contributing');
        expect(detectDocumentType('contributing.md')).toBe('contributing');
      });

      it('should detect code of conduct', () => {
        expect(detectDocumentType('CODE_OF_CONDUCT.md')).toBe('code-of-conduct');
        expect(detectDocumentType('code-of-conduct.md')).toBe('code-of-conduct');
      });
    });

    describe('License detection', () => {
      it('should detect license files', () => {
        expect(detectDocumentType('LICENSE.md')).toBe('license');
        expect(detectDocumentType('license.md')).toBe('license');
      });
    });

    describe('ADR detection', () => {
      it('should detect ADR files', () => {
        expect(detectDocumentType('adr/001-architecture.md')).toBe('adr');
        expect(detectDocumentType('decisions/use-typescript.md')).toBe('adr');
        expect(detectDocumentType('ADR-001-decision.md')).toBe('adr');
      });
    });

    describe('Proposal detection', () => {
      it('should detect proposal files', () => {
        expect(detectDocumentType('proposals/new-feature.md')).toBe('proposal');
        expect(detectDocumentType('rfcs/rfc-123.md')).toBe('rfc');
        expect(detectDocumentType('PROP-001-feature.md')).toBe('proposal');
      });
    });

    describe('API documentation detection', () => {
      it('should detect API documentation by path', () => {
        expect(detectDocumentType('api/reference.md')).toBe('api-reference');
        expect(detectDocumentType('api-reference.md')).toBe('api-reference');
        expect(detectDocumentType('api_docs.md')).toBe('api-reference');
      });

      it('should detect API documentation by content', () => {
        const apiContent = '## API\n\n### Endpoints\n\nGET /users';
        expect(detectDocumentType('unknown.md', apiContent)).toBe('api-reference');
      });
    });

    describe('Architecture documentation detection', () => {
      it('should detect architecture docs by path', () => {
        expect(detectDocumentType('architecture/overview.md')).toBe('architecture');
        expect(detectDocumentType('design/system.md')).toBe('architecture');
      });

      it('should detect architecture docs by content', () => {
        const archContent = '## Architecture\n\n### System Overview';
        expect(detectDocumentType('unknown.md', archContent)).toBe('architecture');
      });
    });

    describe('Guide detection', () => {
      it('should detect guides by path', () => {
        expect(detectDocumentType('guides/installation.md')).toBe('guide');
        expect(detectDocumentType('tutorials/getting-started.md')).toBe('tutorial');
        expect(detectDocumentType('getting-started.md')).toBe('getting-started');
        expect(detectDocumentType('quickstart.md')).toBe('quickstart');
      });

      it('should detect guides by content', () => {
        const guideContent = '## Getting Started\n\n## Prerequisites';
        expect(detectDocumentType('unknown.md', guideContent)).toBe('guide');
      });
    });

    describe('Examples and samples detection', () => {
      it('should detect examples', () => {
        expect(detectDocumentType('examples/basic.md')).toBe('example');
        expect(detectDocumentType('samples/advanced.md')).toBe('sample');
      });
    });

    describe('Register detection', () => {
      it('should detect register files', () => {
        expect(detectDocumentType('registers/tasks.md')).toBe('register');
        expect(detectDocumentType('TODO.md')).toBe('todo');
        expect(detectDocumentType('ISSUES.md')).toBe('issues');
      });
    });

    describe('Template detection', () => {
      it('should detect template files', () => {
        expect(detectDocumentType('templates/doc.md')).toBe('template');
        expect(detectDocumentType('guide.template.md')).toBe('template');
      });
    });

    describe('Specification detection', () => {
      it('should detect specification files', () => {
        expect(detectDocumentType('specifications/api.md')).toBe('specification');
        expect(detectDocumentType('specs/protocol.md')).toBe('spec');
      });
    });

    describe('Research detection', () => {
      it('should detect research files', () => {
        expect(detectDocumentType('research/analysis.md')).toBe('research');
      });
    });

    describe('Implementation plan detection', () => {
      it('should detect implementation plans', () => {
        expect(detectDocumentType('implementation/phase1.md')).toBe('implementation-plan');
        expect(detectDocumentType('workstreams/auth.md')).toBe('workstream');
        expect(detectDocumentType('ws-001-feature.md')).toBe('workstream');
      });
    });

    describe('Fallback detection', () => {
      it('should return generic for unrecognized files', () => {
        expect(detectDocumentType('unknown.md')).toBe('generic');
        expect(detectDocumentType('some/random/file.md')).toBe('generic');
      });
    });

    describe('Case insensitivity', () => {
      it('should handle uppercase file names', () => {
        expect(detectDocumentType('README.MD')).toBe('readme');
        expect(detectDocumentType('GUIDES/INSTALLATION.MD')).toBe('guide');
      });
    });
  });

  describe('resolveTargetPath()', () => {
    const rootDir = '/project';

    describe('Root-level files', () => {
      it('should keep README.md at root', () => {
        expect(resolveTargetPath('README.md', 'readme', rootDir)).toBe('README.md');
      });

      it('should keep standard root files at root', () => {
        expect(resolveTargetPath('CHANGELOG.md', 'changelog', rootDir)).toBe('CHANGELOG.md');
        expect(resolveTargetPath('CONTRIBUTING.md', 'contributing', rootDir)).toBe('CONTRIBUTING.md');
        expect(resolveTargetPath('LICENSE.md', 'license', rootDir)).toBe('LICENSE.md');
        expect(resolveTargetPath('CLAUDE.md', 'readme', rootDir)).toBe('CLAUDE.md');
      });
    });

    describe('Package files in monorepo', () => {
      it('should keep package README at package root', () => {
        const result = resolveTargetPath('packages/core/README.md', 'readme', rootDir);
        expect(result).toBe('packages/core/README.md');
      });

      it('should keep package CHANGELOG at package root', () => {
        const result = resolveTargetPath('packages/core/CHANGELOG.md', 'changelog', rootDir);
        expect(result).toBe('packages/core/CHANGELOG.md');
      });

      it('should work with libs directory', () => {
        const result = resolveTargetPath('libs/utils/README.md', 'readme', rootDir);
        expect(result).toBe('libs/utils/README.md');
      });
    });

    describe('Guide files', () => {
      it('should move guides to docs/guides', () => {
        expect(resolveTargetPath('guide.md', 'guide', rootDir)).toBe('docs/guides/guide.md');
        expect(resolveTargetPath('installation.md', 'installation-guide', rootDir))
          .toBe('docs/guides/installation.md');
      });
    });

    describe('API documentation', () => {
      it('should move API docs to docs/api', () => {
        expect(resolveTargetPath('api.md', 'api-reference', rootDir)).toBe('docs/api/api.md');
        expect(resolveTargetPath('rest-api.md', 'rest-api', rootDir)).toBe('docs/api/rest-api.md');
      });
    });

    describe('Architecture files', () => {
      it('should move architecture docs to docs/architecture', () => {
        expect(resolveTargetPath('system.md', 'architecture', rootDir))
          .toBe('docs/architecture/system.md');
      });

      it('should move ADRs to docs/architecture/decisions', () => {
        expect(resolveTargetPath('adr-001.md', 'adr', rootDir))
          .toBe('docs/architecture/decisions/adr-001.md');
      });
    });

    describe('Proposal files', () => {
      it('should move proposals to docs/proposals/active', () => {
        expect(resolveTargetPath('feature.md', 'proposal', rootDir))
          .toBe('docs/proposals/active/feature.md');
      });
    });

    describe('Register files', () => {
      it('should move registers to docs/registers', () => {
        expect(resolveTargetPath('tasks.md', 'register', rootDir))
          .toBe('docs/registers/tasks.md');
      });
    });

    describe('Example files', () => {
      it('should preserve subdirectory structure for examples', () => {
        const result = resolveTargetPath('examples/basic/intro.md', 'example', rootDir);
        expect(result).toBe('docs/examples/basic/intro.md');
      });

      it('should handle examples without subdirectories', () => {
        const result = resolveTargetPath('example.md', 'example', rootDir);
        expect(result).toBe('docs/examples/example.md');
      });
    });

    describe('Generic files', () => {
      it('should move generic files to docs', () => {
        expect(resolveTargetPath('notes.md', 'generic', rootDir)).toBe('docs/notes.md');
      });
    });

    describe('Type normalization', () => {
      it('should handle types with underscores', () => {
        expect(resolveTargetPath('guide.md', 'user_guide', rootDir))
          .toBe('docs/guides/guide.md');
      });

      it('should handle types with spaces', () => {
        expect(resolveTargetPath('guide.md', 'User Guide', rootDir))
          .toBe('docs/guides/guide.md');
      });
    });
  });

  describe('getRequiredDirectories()', () => {
    it('should always include base directories', () => {
      const dirs = getRequiredDirectories(new Set());
      expect(dirs).toContain('docs');
      expect(dirs).toContain('docs/registers');
    });

    it('should include directories for guide types', () => {
      const dirs = getRequiredDirectories(new Set(['guide']));
      expect(dirs).toContain('docs/guides');
    });

    it('should include directories for API types', () => {
      const dirs = getRequiredDirectories(new Set(['api-reference']));
      expect(dirs).toContain('docs/api');
    });

    it('should include parent directories for nested paths', () => {
      const dirs = getRequiredDirectories(new Set(['adr']));
      expect(dirs).toContain('docs');
      expect(dirs).toContain('docs/architecture');
      expect(dirs).toContain('docs/architecture/decisions');
    });

    it('should handle multiple document types', () => {
      const dirs = getRequiredDirectories(new Set(['guide', 'api-reference', 'adr']));
      expect(dirs).toContain('docs/guides');
      expect(dirs).toContain('docs/api');
      expect(dirs).toContain('docs/architecture/decisions');
    });

    it('should return sorted array', () => {
      const dirs = getRequiredDirectories(new Set(['adr', 'guide', 'api-reference']));
      const sorted = [...dirs].sort();
      expect(dirs).toEqual(sorted);
    });

    it('should handle types that map to root', () => {
      const dirs = getRequiredDirectories(new Set(['readme']));
      // Should still include base directories
      expect(dirs).toContain('docs');
      expect(dirs).toContain('docs/registers');
    });
  });

  describe('shouldExcludeFromReorganization()', () => {
    it('should exclude node_modules', () => {
      expect(shouldExcludeFromReorganization('node_modules/package/readme.md')).toBe(true);
    });

    it('should exclude .git directory', () => {
      expect(shouldExcludeFromReorganization('.git/config')).toBe(true);
    });

    it('should exclude build directories', () => {
      expect(shouldExcludeFromReorganization('dist/index.js')).toBe(true);
      expect(shouldExcludeFromReorganization('build/output.js')).toBe(true);
    });

    it('should exclude .next and .nuxt', () => {
      expect(shouldExcludeFromReorganization('.next/cache/file.js')).toBe(true);
      expect(shouldExcludeFromReorganization('.nuxt/dist/index.js')).toBe(true);
    });

    it('should exclude coverage directory', () => {
      expect(shouldExcludeFromReorganization('coverage/lcov.info')).toBe(true);
    });

    it('should exclude cache directories', () => {
      expect(shouldExcludeFromReorganization('.cache/data.json')).toBe(true);
      expect(shouldExcludeFromReorganization('.turbo/cache.json')).toBe(true);
    });

    it('should exclude vendor directory', () => {
      expect(shouldExcludeFromReorganization('vendor/lib/code.php')).toBe(true);
    });

    it('should exclude Python directories', () => {
      expect(shouldExcludeFromReorganization('__pycache__/module.pyc')).toBe(true);
      expect(shouldExcludeFromReorganization('.venv/lib/python')).toBe(true);
      expect(shouldExcludeFromReorganization('venv/bin/python')).toBe(true);
    });

    it('should exclude .pkf-backup directory', () => {
      expect(shouldExcludeFromReorganization('.pkf-backup/file.md')).toBe(true);
    });

    it('should not exclude documentation directories', () => {
      expect(shouldExcludeFromReorganization('docs/guide.md')).toBe(false);
      expect(shouldExcludeFromReorganization('documentation/api.md')).toBe(false);
    });

    it('should not exclude source directories', () => {
      expect(shouldExcludeFromReorganization('src/readme.md')).toBe(false);
      expect(shouldExcludeFromReorganization('lib/docs.md')).toBe(false);
    });

    it('should handle Windows-style paths', () => {
      expect(shouldExcludeFromReorganization('node_modules\\package\\readme.md')).toBe(true);
      expect(shouldExcludeFromReorganization('dist\\index.js')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(shouldExcludeFromReorganization('NODE_MODULES/package/readme.md')).toBe(true);
      expect(shouldExcludeFromReorganization('DIST/index.js')).toBe(true);
    });
  });

  describe('normalizeDocType()', () => {
    it('should convert to lowercase', () => {
      expect(normalizeDocType('Guide')).toBe('guide');
      expect(normalizeDocType('API')).toBe('api');
    });

    it('should replace underscores with hyphens', () => {
      expect(normalizeDocType('api_reference')).toBe('api-reference');
      expect(normalizeDocType('user_guide')).toBe('guide-user');
    });

    it('should replace spaces with hyphens', () => {
      expect(normalizeDocType('User Guide')).toBe('guide-user');
      expect(normalizeDocType('API Docs')).toBe('api-reference');
    });

    it('should resolve type aliases', () => {
      expect(normalizeDocType('user-guide')).toBe('guide-user');
      expect(normalizeDocType('developer-guide')).toBe('guide-developer');
      expect(normalizeDocType('dev-guide')).toBe('guide-developer');
      expect(normalizeDocType('api-docs')).toBe('api-reference');
      expect(normalizeDocType('decision')).toBe('adr');
      expect(normalizeDocType('todo-list')).toBe('todo');
    });

    it('should handle combined transformations', () => {
      expect(normalizeDocType('User_Guide')).toBe('guide-user');
      expect(normalizeDocType('API DOCS')).toBe('api-reference');
    });

    it('should return normalized type if no alias exists', () => {
      expect(normalizeDocType('custom-type')).toBe('custom-type');
      expect(normalizeDocType('unknown')).toBe('unknown');
    });
  });

  describe('getSchemaForDocType()', () => {
    it('should return guide schema for guide types', () => {
      expect(getSchemaForDocType('guide')).toBe('guide');
      expect(getSchemaForDocType('tutorial')).toBe('guide');
    });

    it('should return spec schema for API types', () => {
      expect(getSchemaForDocType('api')).toBe('spec');
      expect(getSchemaForDocType('api-reference')).toBe('spec');
    });

    it('should return adr schema for ADR types', () => {
      expect(getSchemaForDocType('adr')).toBe('adr');
      expect(getSchemaForDocType('decision-record')).toBe('adr');
    });

    it('should return proposal schema for proposal types', () => {
      expect(getSchemaForDocType('proposal')).toBe('proposal');
      expect(getSchemaForDocType('rfc')).toBe('proposal');
    });

    it('should normalize types before looking up schema', () => {
      expect(getSchemaForDocType('User Guide')).toBe('guide');
      expect(getSchemaForDocType('api_docs')).toBe('spec');
      expect(getSchemaForDocType('decision')).toBe('adr');
    });

    it('should return base-doc as fallback', () => {
      expect(getSchemaForDocType('unknown')).toBe('base-doc');
      expect(getSchemaForDocType('custom-type')).toBe('base-doc');
    });

    it('should return base-doc for architecture types', () => {
      expect(getSchemaForDocType('architecture')).toBe('base-doc');
      expect(getSchemaForDocType('design-doc')).toBe('base-doc');
    });
  });

  describe('Integration tests', () => {
    it('should handle complete workflow for guide document', () => {
      const filePath = 'getting-started.md';
      const docType = detectDocumentType(filePath);
      expect(docType).toBe('getting-started');

      const targetPath = resolveTargetPath(filePath, docType, '/project');
      expect(targetPath).toBe('docs/guides/getting-started.md');

      const schema = getSchemaForDocType(docType);
      expect(schema).toBe('guide');
    });

    it('should handle complete workflow for API documentation', () => {
      const filePath = 'api/reference.md';
      const docType = detectDocumentType(filePath);
      expect(docType).toBe('api-reference');

      const targetPath = resolveTargetPath(filePath, docType, '/project');
      expect(targetPath).toBe('docs/api/reference.md');

      const schema = getSchemaForDocType(docType);
      expect(schema).toBe('spec');
    });

    it('should handle complete workflow for ADR', () => {
      const filePath = 'decisions/001-use-typescript.md';
      const docType = detectDocumentType(filePath);
      expect(docType).toBe('adr');

      const targetPath = resolveTargetPath(filePath, docType, '/project');
      expect(targetPath).toBe('docs/architecture/decisions/001-use-typescript.md');

      const schema = getSchemaForDocType(docType);
      expect(schema).toBe('adr');

      const dirs = getRequiredDirectories(new Set([docType]));
      expect(dirs).toContain('docs/architecture/decisions');
    });

    it('should handle package README in monorepo', () => {
      const filePath = 'packages/core/README.md';
      const docType = detectDocumentType(filePath);
      expect(docType).toBe('readme');

      const targetPath = resolveTargetPath(filePath, docType, '/project');
      expect(targetPath).toBe('packages/core/README.md');

      const schema = getSchemaForDocType(docType);
      expect(schema).toBe('base-doc');
    });
  });
});
