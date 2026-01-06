/**
 * Tests for TemplateManager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TemplateManager } from '../../src/utils/template-manager.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('TemplateManager', () => {
  let tempDir: string;
  let customTemplateDir: string;
  let templateManager: TemplateManager;

  beforeEach(async () => {
    // Create temporary directory for custom templates
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'template-test-'));
    customTemplateDir = path.join(tempDir, 'custom-templates');
    await fs.mkdir(customTemplateDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should initialize with default template directory', () => {
      templateManager = new TemplateManager();
      expect(templateManager).toBeDefined();
    });

    it('should accept custom template directory', () => {
      templateManager = new TemplateManager({
        customTemplateDir,
      });
      expect(templateManager).toBeDefined();
    });

    it('should accept both template directories', () => {
      templateManager = new TemplateManager({
        templateDir: '/default/templates',
        customTemplateDir,
      });
      expect(templateManager).toBeDefined();
    });
  });

  describe('loadTemplate', () => {
    it('should load default templates', async () => {
      templateManager = new TemplateManager();
      const template = await templateManager.loadTemplate('readme');

      expect(template).toBeTruthy();
      expect(template).toContain('{{TITLE}}');
      expect(template).toContain('## Overview');
    });

    it('should load guide template', async () => {
      templateManager = new TemplateManager();
      const template = await templateManager.loadTemplate('guide');

      expect(template).toBeTruthy();
      expect(template).toContain('{{TITLE}}');
      expect(template).toContain('## Prerequisites');
    });

    it('should load changelog template', async () => {
      templateManager = new TemplateManager();
      const template = await templateManager.loadTemplate('changelog');

      expect(template).toBeTruthy();
      expect(template).toContain('# Changelog');
      expect(template).toContain('## [Unreleased]');
    });

    it('should load adr template', async () => {
      templateManager = new TemplateManager();
      const template = await templateManager.loadTemplate('adr');

      expect(template).toBeTruthy();
      expect(template).toContain('{{TITLE}}');
      expect(template).toContain('## Status');
      expect(template).toContain('## Context');
    });

    it('should cache templates after first load', async () => {
      templateManager = new TemplateManager();
      const template1 = await templateManager.loadTemplate('readme');
      const template2 = await templateManager.loadTemplate('readme');

      expect(template1).toBe(template2); // Same reference = cached
    });

    it('should throw error for non-existent template', async () => {
      templateManager = new TemplateManager();
      await expect(
        templateManager.loadTemplate('nonexistent'),
      ).rejects.toThrow();
    });

    it('should load custom template when available', async () => {
      const customContent = '# Custom {{TITLE}}\n\nCustom content';
      await fs.writeFile(
        path.join(customTemplateDir, 'readme.md'),
        customContent,
      );

      templateManager = new TemplateManager({ customTemplateDir });
      const template = await templateManager.loadTemplate('readme');

      expect(template).toBe(customContent);
    });

    it('should fall back to default when custom template not found', async () => {
      templateManager = new TemplateManager({ customTemplateDir });
      const template = await templateManager.loadTemplate('readme');

      expect(template).toBeTruthy();
      expect(template).toContain('{{TITLE}}');
    });

    it('should prefer custom template over default', async () => {
      const customContent = '# Override {{TITLE}}';
      await fs.writeFile(
        path.join(customTemplateDir, 'guide.md'),
        customContent,
      );

      templateManager = new TemplateManager({ customTemplateDir });
      const template = await templateManager.loadTemplate('guide');

      expect(template).toBe(customContent);
      expect(template).not.toContain('## Prerequisites');
    });
  });

  describe('renderTemplate', () => {
    beforeEach(() => {
      templateManager = new TemplateManager();
    });

    it('should render template with single variable', async () => {
      const rendered = await templateManager.renderTemplate('readme', {
        title: 'My Project',
      });

      expect(rendered).toContain('# My Project');
      expect(rendered).not.toContain('{{TITLE}}');
    });

    it('should render template with multiple occurrences of same variable', async () => {
      const customContent = '# {{TITLE}}\n\nWelcome to {{TITLE}}!';
      await fs.writeFile(
        path.join(customTemplateDir, 'test.md'),
        customContent,
      );

      templateManager = new TemplateManager({ customTemplateDir });
      const rendered = await templateManager.renderTemplate('test', {
        title: 'My App',
      });

      expect(rendered).toBe('# My App\n\nWelcome to My App!');
    });

    it('should handle templates with no variables', async () => {
      const rendered = await templateManager.renderTemplate('changelog', {
        title: 'Ignored',
      });

      expect(rendered).toContain('# Changelog');
      expect(rendered).not.toContain('{{');
    });

    it('should be case-insensitive for placeholder keys', async () => {
      const customContent = '# {{TITLE}}\n\nAuthor: {{AUTHOR}}';
      await fs.writeFile(
        path.join(customTemplateDir, 'test.md'),
        customContent,
      );

      templateManager = new TemplateManager({ customTemplateDir });
      const rendered = await templateManager.renderTemplate('test', {
        title: 'Project',
        author: 'John Doe', // lowercase key
      });

      expect(rendered).toContain('# Project');
      expect(rendered).toContain('Author: John Doe');
    });

    it('should leave unreplaced placeholders if variable not provided', async () => {
      const customContent = '# {{TITLE}}\n\nAuthor: {{AUTHOR}}';
      await fs.writeFile(
        path.join(customTemplateDir, 'test.md'),
        customContent,
      );

      templateManager = new TemplateManager({ customTemplateDir });
      const rendered = await templateManager.renderTemplate('test', {
        title: 'Project',
      });

      expect(rendered).toContain('# Project');
      expect(rendered).toContain('{{AUTHOR}}'); // Not replaced
    });
  });

  describe('getAvailableTemplates', () => {
    it('should return list of default templates', async () => {
      templateManager = new TemplateManager();
      const templates = await templateManager.getAvailableTemplates();

      expect(templates).toContain('readme');
      expect(templates).toContain('guide');
      expect(templates).toContain('changelog');
      expect(templates).toContain('adr');
      expect(templates).toContain('todo');
      expect(templates).toContain('issues');
    });

    it('should return sorted list', async () => {
      templateManager = new TemplateManager();
      const templates = await templateManager.getAvailableTemplates();

      const sorted = [...templates].sort();
      expect(templates).toEqual(sorted);
    });

    it('should include custom templates', async () => {
      await fs.writeFile(path.join(customTemplateDir, 'custom1.md'), '# Test');
      await fs.writeFile(path.join(customTemplateDir, 'custom2.md'), '# Test');

      templateManager = new TemplateManager({ customTemplateDir });
      const templates = await templateManager.getAvailableTemplates();

      expect(templates).toContain('custom1');
      expect(templates).toContain('custom2');
    });

    it('should deduplicate templates when custom overrides default', async () => {
      await fs.writeFile(path.join(customTemplateDir, 'readme.md'), '# Test');

      templateManager = new TemplateManager({ customTemplateDir });
      const templates = await templateManager.getAvailableTemplates();

      // Count occurrences of 'readme'
      const readmeCount = templates.filter((t) => t === 'readme').length;
      expect(readmeCount).toBe(1);
    });

    it('should filter out non-markdown files', async () => {
      await fs.writeFile(path.join(customTemplateDir, 'test.txt'), 'Test');
      await fs.writeFile(path.join(customTemplateDir, 'readme.md'), '# Test');

      templateManager = new TemplateManager({ customTemplateDir });
      const templates = await templateManager.getAvailableTemplates();

      expect(templates).toContain('readme');
      expect(templates).not.toContain('test');
    });
  });

  describe('clearCache', () => {
    it('should clear cached templates', async () => {
      templateManager = new TemplateManager();

      // Load and cache a template
      const template1 = await templateManager.loadTemplate('readme');

      // Clear cache
      templateManager.clearCache();

      // Load again - should be a new instance
      const template2 = await templateManager.loadTemplate('readme');

      expect(template1).toEqual(template2); // Same content
      // Note: We can't test reference equality after cache clear
      // because the content is the same string, which may be interned
    });

    it('should reload templates after cache clear', async () => {
      const customContent1 = '# Version 1 {{TITLE}}';
      await fs.writeFile(
        path.join(customTemplateDir, 'test.md'),
        customContent1,
      );

      templateManager = new TemplateManager({ customTemplateDir });
      const template1 = await templateManager.loadTemplate('test');
      expect(template1).toBe(customContent1);

      // Update template file
      const customContent2 = '# Version 2 {{TITLE}}';
      await fs.writeFile(
        path.join(customTemplateDir, 'test.md'),
        customContent2,
      );

      // Without cache clear, should get cached version
      const template2 = await templateManager.loadTemplate('test');
      expect(template2).toBe(customContent1);

      // After cache clear, should get new version
      templateManager.clearCache();
      const template3 = await templateManager.loadTemplate('test');
      expect(template3).toBe(customContent2);
    });
  });

  describe('templateExists', () => {
    beforeEach(() => {
      templateManager = new TemplateManager();
    });

    it('should return true for existing default templates', async () => {
      expect(await templateManager.templateExists('readme')).toBe(true);
      expect(await templateManager.templateExists('guide')).toBe(true);
      expect(await templateManager.templateExists('changelog')).toBe(true);
    });

    it('should return false for non-existent templates', async () => {
      expect(await templateManager.templateExists('nonexistent')).toBe(false);
    });

    it('should return true for custom templates', async () => {
      await fs.writeFile(
        path.join(customTemplateDir, 'custom.md'),
        '# Custom',
      );

      templateManager = new TemplateManager({ customTemplateDir });
      expect(await templateManager.templateExists('custom')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle missing custom template directory gracefully', async () => {
      const nonexistentDir = path.join(tempDir, 'does-not-exist');
      templateManager = new TemplateManager({
        customTemplateDir: nonexistentDir,
      });

      // Should fall back to default templates
      const template = await templateManager.loadTemplate('readme');
      expect(template).toBeTruthy();
    });

    it('should handle permission errors', async () => {
      const restrictedDir = path.join(tempDir, 'restricted');
      await fs.mkdir(restrictedDir);
      await fs.writeFile(path.join(restrictedDir, 'test.md'), '# Test');

      // Make directory unreadable
      await fs.chmod(restrictedDir, 0o000);

      templateManager = new TemplateManager({
        customTemplateDir: restrictedDir,
      });

      try {
        // Should fall back to default when custom dir is unreadable
        const template = await templateManager.loadTemplate('readme');
        expect(template).toBeTruthy();
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(restrictedDir, 0o755);
      }
    });

    it('should throw meaningful error for invalid template directory', async () => {
      const invalidDir = path.join(tempDir, 'invalid');
      // Create a file instead of directory
      await fs.writeFile(invalidDir, 'not a directory');

      templateManager = new TemplateManager({ templateDir: invalidDir });

      await expect(templateManager.loadTemplate('readme')).rejects.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should work with migration worker use case', async () => {
      templateManager = new TemplateManager();

      // Simulate what migration worker does
      const docTypes = [
        'readme',
        'guide',
        'adr',
        'spec',
        'changelog',
        'todo',
        'issues',
        'api',
        'architecture',
      ];

      for (const docType of docTypes) {
        const content = await templateManager.renderTemplate(docType, {
          title: `Test ${docType}`,
        });

        expect(content).toBeTruthy();
        expect(content).not.toContain('{{TITLE}}');
      }
    });

    it('should support custom project templates', async () => {
      // Create custom templates for a specific project
      await fs.writeFile(
        path.join(customTemplateDir, 'readme.md'),
        '# {{TITLE}}\n\n## Company Standard Header\n\n{{DESCRIPTION}}',
      );

      templateManager = new TemplateManager({ customTemplateDir });
      const rendered = await templateManager.renderTemplate('readme', {
        title: 'My Project',
        description: 'Project description here',
      });

      expect(rendered).toContain('# My Project');
      expect(rendered).toContain('## Company Standard Header');
      expect(rendered).toContain('Project description here');
    });

    it('should handle concurrent template loading', async () => {
      templateManager = new TemplateManager();

      const promises = [
        templateManager.loadTemplate('readme'),
        templateManager.loadTemplate('guide'),
        templateManager.loadTemplate('changelog'),
        templateManager.loadTemplate('readme'), // Duplicate
      ];

      const results = await Promise.all(promises);

      expect(results[0]).toBeTruthy();
      expect(results[1]).toBeTruthy();
      expect(results[2]).toBeTruthy();
      expect(results[3]).toBe(results[0]); // Cached
    });
  });
});
