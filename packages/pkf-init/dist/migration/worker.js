/**
 * PKF Init Migration Worker
 * Migrates individual documents by adding PKF frontmatter and handling file moves
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { safeLoad, safeDump } from '../utils/yaml.js';
import { ReferenceUpdater } from '../utils/reference-updater.js';
import { getSchemaForDocType } from '@pantheon-tech/pkf-core/type-mapper';
import { TemplateManager } from '@pantheon-tech/pkf-core/templates';
/**
 * Migration Worker
 * Handles the migration of individual documents by adding PKF frontmatter
 * and reorganizing files to PKF-compliant structure
 */
export class MigrationWorker {
    orchestrator;
    schemasYaml;
    rootDir;
    parsedSchemas = null;
    referenceUpdater;
    pathMapping = new Map();
    templateManager;
    /**
     * Create a new MigrationWorker
     *
     * @param orchestrator - Agent orchestrator for AI operations
     * @param schemasYaml - YAML string containing schema definitions
     * @param rootDir - Root directory of the project
     * @param customTemplateDir - Optional custom template directory
     */
    constructor(orchestrator, schemasYaml, rootDir, customTemplateDir) {
        this.orchestrator = orchestrator;
        this.schemasYaml = schemasYaml;
        this.rootDir = rootDir;
        this.referenceUpdater = new ReferenceUpdater(rootDir);
        this.templateManager = new TemplateManager({
            customTemplateDir: customTemplateDir || null,
        });
    }
    /**
     * Set the path mapping for cross-reference updates
     * Maps old paths to new paths for all files being migrated
     *
     * @param mapping - Map of source paths to target paths
     */
    setPathMapping(mapping) {
        this.pathMapping = mapping;
    }
    /**
     * Migrate a document by adding PKF frontmatter and optionally moving it
     *
     * @param task - Migration task to execute (can be ExtendedMigrationTask)
     * @returns MigrationResult with outcome and statistics
     */
    async migrate(task) {
        const operations = [];
        const extTask = task;
        // Check if this is a creation task (file doesn't exist)
        const needsCreation = extTask.needsCreation ?? false;
        if (needsCreation) {
            return this.createNewFile(extTask);
        }
        // Determine if file needs to be moved
        const normalizedSource = path.normalize(task.sourcePath).replace(/\\/g, '/');
        const normalizedTarget = path.normalize(task.targetPath).replace(/\\/g, '/');
        const needsMove = extTask.needsMove ?? (normalizedSource !== normalizedTarget);
        const needsFrontmatter = extTask.needsFrontmatter ?? true;
        try {
            // Read source file content
            const content = await this.readSourceFile(task.sourcePath);
            let migratedContent = content;
            let frontmatter = null;
            let tokensUsed;
            let cost;
            // Step 1: Add frontmatter if needed
            if (needsFrontmatter) {
                // Get schema definition for the document type
                const schema = this.getSchemaForType(task.docType);
                if (!schema) {
                    return {
                        task,
                        success: false,
                        error: `No schema found for document type: ${task.docType}`,
                        operations,
                    };
                }
                // Build migration prompt
                const prompt = this.buildMigrationPrompt(content, task.docType, schema);
                // Execute the documentation-migration-worker agent
                const result = await this.orchestrator.singleAgentTask('documentation-migration-worker', prompt);
                tokensUsed = result.tokensUsed;
                cost = result.cost;
                if (!result.success) {
                    return {
                        task,
                        success: false,
                        error: result.error ?? 'Agent execution failed',
                        tokensUsed,
                        cost,
                        operations,
                    };
                }
                // Extract frontmatter from agent response
                frontmatter = this.extractFrontmatter(result.output);
                if (!frontmatter) {
                    return {
                        task,
                        success: false,
                        error: 'Failed to extract frontmatter from agent response',
                        tokensUsed,
                        cost,
                        operations,
                    };
                }
                // Combine frontmatter with original content
                migratedContent = this.combineContent(frontmatter, content);
            }
            // Step 2: Update cross-references if file is being moved
            let referencesUpdated = 0;
            if (needsMove && this.pathMapping.size > 0) {
                const updateResult = this.referenceUpdater.updateLinks(migratedContent, task.sourcePath, this.pathMapping, task.targetPath);
                migratedContent = updateResult.content;
                referencesUpdated = updateResult.updates.length;
            }
            // Step 3: Write to target path
            await this.writeTargetFile(task.targetPath, migratedContent);
            // Record write operation
            operations.push({
                type: 'write',
                sourcePath: task.targetPath,
                status: 'completed',
                timestamp: new Date().toISOString(),
            });
            // Step 4: Delete source file if moved (different location)
            if (needsMove) {
                try {
                    const absoluteSource = path.isAbsolute(task.sourcePath)
                        ? task.sourcePath
                        : path.join(this.rootDir, task.sourcePath);
                    await fs.unlink(absoluteSource);
                    // Record delete operation
                    operations.push({
                        type: 'delete',
                        sourcePath: task.sourcePath,
                        status: 'completed',
                        timestamp: new Date().toISOString(),
                    });
                }
                catch (deleteError) {
                    // Log but don't fail - file might already be deleted or not exist
                    // The write succeeded, so the migration is still successful
                    operations.push({
                        type: 'delete',
                        sourcePath: task.sourcePath,
                        status: 'failed',
                        error: deleteError instanceof Error ? deleteError.message : String(deleteError),
                        timestamp: new Date().toISOString(),
                    });
                }
            }
            return {
                task,
                success: true,
                outputPath: task.targetPath,
                frontmatter: frontmatter ?? undefined,
                tokensUsed,
                cost,
                moved: needsMove,
                referencesUpdated,
                operations,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                task,
                success: false,
                error: errorMessage,
                operations,
            };
        }
    }
    /**
     * Migrate a document without using AI (frontmatter-only update or move-only)
     * Useful for files that already have frontmatter or don't need it
     *
     * @param task - Migration task to execute
     * @returns MigrationResult with outcome
     */
    async migrateWithoutAI(task) {
        const operations = [];
        const extTask = task;
        const normalizedSource = path.normalize(task.sourcePath).replace(/\\/g, '/');
        const normalizedTarget = path.normalize(task.targetPath).replace(/\\/g, '/');
        const needsMove = extTask.needsMove ?? (normalizedSource !== normalizedTarget);
        try {
            // Read source file content
            let content = await this.readSourceFile(task.sourcePath);
            // Update cross-references if file is being moved
            let referencesUpdated = 0;
            if (needsMove && this.pathMapping.size > 0) {
                const updateResult = this.referenceUpdater.updateLinks(content, task.sourcePath, this.pathMapping, task.targetPath);
                content = updateResult.content;
                referencesUpdated = updateResult.updates.length;
            }
            // Write to target path
            await this.writeTargetFile(task.targetPath, content);
            operations.push({
                type: 'write',
                sourcePath: task.targetPath,
                status: 'completed',
                timestamp: new Date().toISOString(),
            });
            // Delete source file if moved
            if (needsMove) {
                try {
                    const absoluteSource = path.isAbsolute(task.sourcePath)
                        ? task.sourcePath
                        : path.join(this.rootDir, task.sourcePath);
                    await fs.unlink(absoluteSource);
                    operations.push({
                        type: 'delete',
                        sourcePath: task.sourcePath,
                        status: 'completed',
                        timestamp: new Date().toISOString(),
                    });
                }
                catch (deleteError) {
                    operations.push({
                        type: 'delete',
                        sourcePath: task.sourcePath,
                        status: 'failed',
                        error: deleteError instanceof Error ? deleteError.message : String(deleteError),
                        timestamp: new Date().toISOString(),
                    });
                }
            }
            return {
                task,
                success: true,
                outputPath: task.targetPath,
                moved: needsMove,
                referencesUpdated,
                operations,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                task,
                success: false,
                error: errorMessage,
                operations,
            };
        }
    }
    /**
     * Read source file content
     *
     * @param filePath - Path to the source file
     * @returns File content as string
     */
    async readSourceFile(filePath) {
        const absolutePath = path.isAbsolute(filePath)
            ? filePath
            : path.join(this.rootDir, filePath);
        const content = await fs.readFile(absolutePath, 'utf-8');
        return content;
    }
    /**
     * Get schema definition for a document type
     *
     * @param docType - Document type to get schema for
     * @returns Schema object or null if not found
     */
    getSchemaForType(docType) {
        // Parse schemas YAML if not already parsed
        if (!this.parsedSchemas) {
            try {
                this.parsedSchemas = safeLoad(this.schemasYaml);
            }
            catch {
                return null;
            }
        }
        if (!this.parsedSchemas) {
            return null;
        }
        // Map document type to schema name using type-mapping utility
        // This allows blueprint types like "readme" to map to schema "base-doc"
        const schemaName = getSchemaForDocType(docType);
        // Look for schema in common locations within the YAML structure
        // Try direct lookup first
        if (typeof this.parsedSchemas === 'object' &&
            schemaName in this.parsedSchemas) {
            return this.parsedSchemas[schemaName];
        }
        // Try under 'schemas' key
        const schemas = this.parsedSchemas['schemas'];
        if (schemas && typeof schemas === 'object' && schemaName in schemas) {
            return schemas[schemaName];
        }
        // Try under 'documentTypes' key
        const documentTypes = this.parsedSchemas['documentTypes'];
        if (documentTypes && typeof documentTypes === 'object' && schemaName in documentTypes) {
            return documentTypes[schemaName];
        }
        // Try under 'types' key
        const types = this.parsedSchemas['types'];
        if (types && typeof types === 'object' && schemaName in types) {
            return types[schemaName];
        }
        return null;
    }
    /**
     * Build the migration prompt for the agent
     *
     * @param content - Original document content
     * @param docType - Document type
     * @param schema - Schema definition for the document type
     * @returns Formatted prompt string
     */
    buildMigrationPrompt(content, docType, schema) {
        const schemaYaml = safeDump(schema, {
            indent: 2,
            lineWidth: -1,
            noRefs: true,
        });
        return `Migrate the following document to PKF format by generating appropriate YAML frontmatter.

Document Type: ${docType}
Schema Definition:
${schemaYaml}

Original Document Content:
---
${content}
---

Generate YAML frontmatter that:
1. Follows the schema definition exactly
2. Extracts metadata from the content where possible
3. Uses appropriate default values for missing fields

Output ONLY the YAML frontmatter (including --- markers):`;
    }
    /**
     * Extract YAML frontmatter from agent response
     *
     * @param response - Agent response text
     * @returns Extracted frontmatter string or null if not found
     */
    extractFrontmatter(response) {
        // Look for content between --- markers
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*$/m;
        const match = response.match(frontmatterRegex);
        if (match) {
            const frontmatterContent = match[1].trim();
            // Validate that the extracted content is valid YAML
            try {
                safeLoad(frontmatterContent);
                return `---\n${frontmatterContent}\n---`;
            }
            catch {
                // Invalid YAML, try to find it differently
            }
        }
        // Alternative: look for frontmatter at the start of response
        const lines = response.split('\n');
        let inFrontmatter = false;
        const frontmatterLines = [];
        for (const line of lines) {
            if (line.trim() === '---') {
                if (!inFrontmatter) {
                    inFrontmatter = true;
                    continue;
                }
                else {
                    // End of frontmatter
                    const frontmatterContent = frontmatterLines.join('\n').trim();
                    try {
                        safeLoad(frontmatterContent);
                        return `---\n${frontmatterContent}\n---`;
                    }
                    catch {
                        return null;
                    }
                }
            }
            if (inFrontmatter) {
                frontmatterLines.push(line);
            }
        }
        return null;
    }
    /**
     * Combine frontmatter with original content
     *
     * @param frontmatter - YAML frontmatter to add
     * @param originalContent - Original document content
     * @returns Combined content
     */
    combineContent(frontmatter, originalContent) {
        // Check if original content already has frontmatter
        const existingFrontmatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
        const hasExistingFrontmatter = existingFrontmatterRegex.test(originalContent);
        if (hasExistingFrontmatter) {
            // Replace existing frontmatter
            return originalContent.replace(existingFrontmatterRegex, frontmatter + '\n\n');
        }
        else {
            // Prepend new frontmatter
            return frontmatter + '\n\n' + originalContent;
        }
    }
    /**
     * Create a new file that doesn't exist yet
     * Generates appropriate content with frontmatter based on document type
     *
     * @param task - Migration task for the new file
     * @returns MigrationResult with outcome
     */
    async createNewFile(task) {
        const operations = [];
        try {
            // Get schema definition for the document type
            const schema = this.getSchemaForType(task.docType);
            if (!schema) {
                return {
                    task,
                    success: false,
                    error: `No schema found for document type: ${task.docType}`,
                    operations,
                };
            }
            // Generate title from filename or use provided title
            const title = task.title || this.generateTitle(task.targetPath);
            // Generate frontmatter for the new file
            const frontmatter = this.generateFrontmatter(task.docType, title);
            // Generate initial content based on document type
            const body = await this.generateInitialContent(task.docType, title);
            // Combine frontmatter and body
            const content = `${frontmatter}\n\n${body}`;
            // Write the new file
            await this.writeTargetFile(task.targetPath, content);
            // Record create operation
            operations.push({
                type: 'write',
                sourcePath: task.targetPath,
                status: 'completed',
                timestamp: new Date().toISOString(),
            });
            return {
                task,
                success: true,
                outputPath: task.targetPath,
                frontmatter,
                moved: false,
                referencesUpdated: 0,
                operations,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                task,
                success: false,
                error: errorMessage,
                operations,
            };
        }
    }
    /**
     * Generate a human-readable title from a file path
     *
     * @param filePath - Path to the file
     * @returns Generated title
     */
    generateTitle(filePath) {
        const baseName = path.basename(filePath, '.md');
        // Convert kebab-case, snake_case, or camelCase to Title Case
        return baseName
            .replace(/[-_]/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
    /**
     * Generate frontmatter for a new file
     *
     * @param docType - Document type
     * @param title - Document title
     * @returns YAML frontmatter string
     */
    generateFrontmatter(docType, title) {
        const now = new Date().toISOString().split('T')[0];
        // Build frontmatter based on document type
        const frontmatterData = {
            title,
            type: docType,
            status: 'draft',
            created: now,
            updated: now,
        };
        // Add type-specific fields
        switch (docType) {
            case 'guide':
            case 'guide-user':
                frontmatterData.audience = 'user';
                break;
            case 'guide-developer':
                frontmatterData.audience = 'developer';
                break;
            case 'adr':
                frontmatterData.decision_status = 'proposed';
                break;
            case 'spec':
            case 'specification':
                frontmatterData.version = '1.0.0';
                break;
        }
        const frontmatterYaml = safeDump(frontmatterData, {
            indent: 2,
            lineWidth: -1,
            noRefs: true,
        }).trim();
        return `---\n${frontmatterYaml}\n---`;
    }
    /**
     * Generate initial content for a new file
     *
     * @param docType - Document type
     * @param title - Document title
     * @returns Initial markdown content
     */
    async generateInitialContent(docType, title) {
        // Map doc type to template name
        const templateMap = {
            readme: 'readme',
            guide: 'guide',
            'guide-user': 'guide',
            'guide-developer': 'guide',
            adr: 'adr',
            spec: 'spec',
            specification: 'spec',
            changelog: 'changelog',
            todo: 'todo',
            issues: 'issues',
            api: 'api',
            'api-reference': 'api',
            architecture: 'architecture',
            'design-doc': 'architecture',
        };
        const templateName = templateMap[docType] || 'default';
        try {
            return await this.templateManager.renderTemplate(templateName, {
                title,
            });
        }
        catch (error) {
            // Fallback if template loading fails
            return `# ${title}\n\n> TODO: Add content\n`;
        }
    }
    /**
     * Write migrated content to target file
     *
     * @param filePath - Target file path
     * @param content - Content to write
     */
    async writeTargetFile(filePath, content) {
        const absolutePath = path.isAbsolute(filePath)
            ? filePath
            : path.join(this.rootDir, filePath);
        // Create parent directories if needed
        const parentDir = path.dirname(absolutePath);
        await fs.mkdir(parentDir, { recursive: true });
        // Write file
        await fs.writeFile(absolutePath, content, 'utf-8');
    }
}
export default MigrationWorker;
//# sourceMappingURL=worker.js.map