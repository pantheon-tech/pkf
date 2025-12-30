/**
 * PKF Init Schema Design Stage (Stage 2)
 * Uses agent conversation to design PKF schemas based on the blueprint.
 */
import { WorkflowStage } from '../types/index.js';
import { parse as parseYaml } from 'yaml';
// ============================================================================
// PKF Schema DSL Reference
// ============================================================================
/**
 * PKF Schema DSL specification reference for agents
 */
const PKF_SCHEMA_DSL_REFERENCE = `
## PKF Schema DSL Reference

The PKF Schema DSL is a YAML-based language for defining document type schemas.

### File Structure
\`\`\`yaml
version: "1.0"
schemas:
  schema-name:
    _extends: parent-schema    # Optional inheritance
    _description: "Description"
    _examples:
      - "docs/example.md"
    properties:
      field-name:
        type: string|number|boolean|date|array|object
        required: true|false
        description: "Field description"
        default: "default value"
        enum: [value1, value2]
        pattern: "^regex$"
\`\`\`

### Property Types
- \`string\`: Text value
- \`number\`: Numeric value
- \`boolean\`: True/false
- \`date\`: ISO 8601 date
- \`array\`: List of values (use \`items\` to define item type)
- \`object\`: Nested structure

### Constraints
- \`required\`: Whether field is required (default: false)
- \`enum\`: List of allowed values
- \`pattern\`: Regex pattern for validation
- \`minimum/maximum\`: For numbers
- \`minLength/maxLength\`: For strings
- \`minItems/maxItems\`: For arrays
- \`uniqueItems\`: For arrays

### Default Placeholders
- \`{{TODAY}}\`: Current date
- \`{{GIT_USER}}\`: Git user.name
- \`{{GIT_EMAIL}}\`: Git user.email

### Best Practices
1. Create a base-doc type with common fields (title, created, updated, status)
2. Use _extends for inheritance to avoid duplication
3. Use descriptive enum values (e.g., \`draft\`, \`published\` not \`0\`, \`1\`)
4. Add descriptions to all schemas and fields
5. Use clear, lowercase schema names with hyphens
`;
// ============================================================================
// SchemaDesignStage Class
// ============================================================================
/**
 * Stage 2: Schema Design
 *
 * Uses agent conversation between documentation-analyst-init and pkf-implementer
 * to design a schemas.yaml file based on the documentation blueprint.
 */
export class SchemaDesignStage {
    orchestrator;
    stateManager;
    config;
    interactive;
    maxIterations;
    /**
     * Create a new SchemaDesignStage
     *
     * @param orchestrator - Agent orchestrator for running conversations
     * @param stateManager - Workflow state manager for persistence
     * @param config - Loaded configuration
     * @param interactive - Interactive mode handler
     * @param maxIterations - Maximum conversation iterations (default 5)
     */
    constructor(orchestrator, stateManager, config, interactive, maxIterations = 5) {
        this.orchestrator = orchestrator;
        this.stateManager = stateManager;
        this.config = config;
        this.interactive = interactive;
        this.maxIterations = maxIterations;
    }
    /**
     * Execute the schema design stage
     *
     * @param blueprint - Documentation blueprint from Stage 1
     * @returns SchemaDesignResult with schemas.yaml content
     */
    async execute(blueprint) {
        try {
            // Create initial prompt with blueprint
            const initialPrompt = this.buildInitialPrompt(blueprint);
            // Run agent conversation
            const agentResult = await this.orchestrator.agentConversation('documentation-analyst-init', 'pkf-implementer', initialPrompt, this.maxIterations);
            // Extract iterations from metadata
            const iterations = agentResult.metadata?.iterations ?? 1;
            const convergenceReason = agentResult.metadata?.convergenceReason;
            // Check if conversation succeeded
            if (!agentResult.success) {
                // If max iterations reached, we still try to extract schemas
                // The output might still be usable
                if (agentResult.error?.includes('Max iterations')) {
                    // Try to extract schemas from the final output
                    const schemasYaml = this.extractSchemasYaml(agentResult.output);
                    if (schemasYaml) {
                        // Validate the extracted schemas
                        const validation = await this.validateSchemasYaml(schemasYaml);
                        if (validation.valid) {
                            // Handle interactive approval
                            const approvalResult = await this.handleInteractiveApproval(schemasYaml, iterations);
                            if (!approvalResult.approved) {
                                if (approvalResult.requestMore) {
                                    // User wants more iterations - return as incomplete
                                    return {
                                        success: false,
                                        schemasYaml: approvalResult.edited || schemasYaml,
                                        iterations,
                                        error: 'User requested more iterations',
                                    };
                                }
                                return {
                                    success: false,
                                    iterations,
                                    error: 'User cancelled schema approval',
                                };
                            }
                            // Use edited version if provided
                            const finalSchemas = approvalResult.edited || schemasYaml;
                            // Save state with checkpoint
                            await this.saveState(finalSchemas, iterations, convergenceReason);
                            return {
                                success: true,
                                schemasYaml: finalSchemas,
                                iterations,
                                convergenceReason: 'Max iterations reached with valid schemas',
                            };
                        }
                    }
                }
                return {
                    success: false,
                    iterations,
                    error: agentResult.error || 'Agent conversation failed',
                };
            }
            // Extract schemas.yaml from the response
            const schemasYaml = this.extractSchemasYaml(agentResult.output);
            if (!schemasYaml) {
                return {
                    success: false,
                    iterations,
                    convergenceReason,
                    error: 'Could not extract schemas.yaml from agent response',
                };
            }
            // Validate schemas.yaml structure
            const validation = await this.validateSchemasYaml(schemasYaml);
            if (!validation.valid) {
                return {
                    success: false,
                    schemasYaml,
                    iterations,
                    convergenceReason,
                    error: `Schema validation failed: ${validation.errors.join(', ')}`,
                };
            }
            // Handle interactive approval
            const approvalResult = await this.handleInteractiveApproval(schemasYaml, iterations);
            if (!approvalResult.approved) {
                if (approvalResult.requestMore) {
                    // User wants more iterations
                    return {
                        success: false,
                        schemasYaml: approvalResult.edited || schemasYaml,
                        iterations,
                        error: 'User requested more iterations',
                    };
                }
                return {
                    success: false,
                    iterations,
                    convergenceReason,
                    error: 'User cancelled schema approval',
                };
            }
            // Use edited version if provided
            const finalSchemas = approvalResult.edited || schemasYaml;
            // Save state with checkpoint
            await this.saveState(finalSchemas, iterations, convergenceReason);
            return {
                success: true,
                schemasYaml: finalSchemas,
                iterations,
                convergenceReason,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                iterations: 0,
                error: `Schema design stage failed: ${errorMessage}`,
            };
        }
    }
    /**
     * Build the initial prompt for schema design
     *
     * @param blueprint - Documentation blueprint from Stage 1
     * @returns Initial prompt string
     */
    buildInitialPrompt(blueprint) {
        return `Based on the following documentation blueprint, design a PKF schemas.yaml file.

## Blueprint

${blueprint}

## Requirements

1. Define a base-document type with common fields (title, created, updated, status)
2. Create specific types for each document category identified in the blueprint
3. Use _extends for inheritance from base-document
4. Follow PKF Schema DSL specification
5. Include appropriate validation rules (required fields, enums, patterns)
6. Add descriptions for all schemas and fields

${PKF_SCHEMA_DSL_REFERENCE}

## Convergence Signal

When you agree on the final schema design, output:
SCHEMA-DESIGN-APPROVED: [reason for approval]

The final output MUST include the complete schemas.yaml wrapped in a yaml code block.

## Begin

Begin the design discussion. Review the blueprint and propose an initial schema structure.
`;
    }
    /**
     * Extract schemas.yaml content from agent response
     *
     * @param response - Agent response text
     * @returns Extracted YAML content or null
     */
    extractSchemasYaml(response) {
        if (!response) {
            return null;
        }
        // Try to find YAML code blocks
        const yamlBlockRegex = /```ya?ml\n([\s\S]*?)```/gi;
        let match;
        // Look for blocks that contain the schemas structure
        while ((match = yamlBlockRegex.exec(response)) !== null) {
            const content = match[1].trim();
            // Check if this block has the schemas.yaml structure
            if (this.looksLikeSchemasYaml(content)) {
                return content;
            }
        }
        // If no code blocks found, try to find raw YAML with schemas key
        const schemasMatch = response.match(/^(version:\s*["']?\d+\.\d+["']?\s*\nschemas:[\s\S]*?)(?=\n\n[A-Z]|\n##|$)/m);
        if (schemasMatch) {
            const content = schemasMatch[1].trim();
            if (this.looksLikeSchemasYaml(content)) {
                return content;
            }
        }
        // Last resort: look for any content with schemas: root key
        const lines = response.split('\n');
        let yamlContent = [];
        let inYaml = false;
        let braceDepth = 0;
        for (const line of lines) {
            if (!inYaml && line.match(/^version:\s*["']?\d+\.\d+/)) {
                inYaml = true;
                yamlContent = [line];
                continue;
            }
            if (inYaml) {
                // Stop if we hit a line that's clearly not YAML
                if (line.match(/^[A-Z][A-Z\s-]+:$/) && !line.startsWith('  ')) {
                    // Might be a heading like "SCHEMA-DESIGN-APPROVED:"
                    if (!line.includes('-DESIGN-') && !line.includes('_')) {
                        break;
                    }
                }
                // Stop at empty line followed by non-YAML content
                if (line === '' && yamlContent.length > 0) {
                    const nextIdx = lines.indexOf(line) + 1;
                    if (nextIdx < lines.length) {
                        const nextLine = lines[nextIdx];
                        if (nextLine.match(/^[A-Z]/) && !nextLine.startsWith('  ')) {
                            break;
                        }
                    }
                }
                yamlContent.push(line);
            }
        }
        if (yamlContent.length > 0) {
            const content = yamlContent.join('\n').trim();
            if (this.looksLikeSchemasYaml(content)) {
                return content;
            }
        }
        return null;
    }
    /**
     * Check if content looks like valid schemas.yaml
     *
     * @param content - YAML content to check
     * @returns True if content appears to be schemas.yaml
     */
    looksLikeSchemasYaml(content) {
        // Must have version and schemas keys
        const hasVersion = /^version:\s*["']?\d+\.\d+/m.test(content);
        const hasSchemas = /^schemas:\s*$/m.test(content) || /^schemas:\s*\n/m.test(content);
        return hasVersion && hasSchemas;
    }
    /**
     * Validate schemas.yaml structure
     *
     * @param yaml - YAML content to validate
     * @returns Validation result
     */
    async validateSchemasYaml(yaml) {
        const errors = [];
        const warnings = [];
        try {
            // Parse YAML
            const parsed = parseYaml(yaml);
            // Check for required top-level keys
            if (!parsed.version) {
                errors.push('Missing required "version" field');
            }
            else if (!/^\d+\.\d+$/.test(String(parsed.version))) {
                errors.push(`Invalid version format: "${parsed.version}". Expected format: "X.Y"`);
            }
            if (!parsed.schemas) {
                errors.push('Missing required "schemas" field');
            }
            else if (typeof parsed.schemas !== 'object' || parsed.schemas === null) {
                errors.push('"schemas" must be an object');
            }
            else {
                const schemas = parsed.schemas;
                const schemaNames = Object.keys(schemas);
                if (schemaNames.length === 0) {
                    errors.push('At least one schema must be defined');
                }
                // Check for base-document type
                const hasBaseDoc = schemaNames.some((name) => name === 'base-doc' || name === 'base-document');
                if (!hasBaseDoc) {
                    warnings.push('Consider adding a "base-doc" schema with common fields (title, created, updated)');
                }
                // Validate each schema
                for (const [name, schema] of Object.entries(schemas)) {
                    // Validate schema name format
                    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
                        errors.push(`Invalid schema name "${name}": must be lowercase alphanumeric with hyphens`);
                    }
                    // Validate schema structure
                    if (typeof schema !== 'object' || schema === null) {
                        errors.push(`Schema "${name}" must be an object`);
                        continue;
                    }
                    const schemaObj = schema;
                    // Check _extends references
                    if (schemaObj._extends) {
                        const extendsName = String(schemaObj._extends);
                        if (!schemaNames.includes(extendsName)) {
                            errors.push(`Schema "${name}" extends unknown schema "${extendsName}"`);
                        }
                    }
                    // Check properties
                    if (!schemaObj.properties) {
                        warnings.push(`Schema "${name}" has no properties defined`);
                    }
                    else if (typeof schemaObj.properties !== 'object') {
                        errors.push(`Schema "${name}" properties must be an object`);
                    }
                    else {
                        const properties = schemaObj.properties;
                        for (const [propName, propDef] of Object.entries(properties)) {
                            // Validate property name
                            if (!/^[a-z][a-z0-9_-]*$/.test(propName)) {
                                errors.push(`Invalid property name "${propName}" in schema "${name}"`);
                            }
                            // Validate property definition
                            if (typeof propDef !== 'object' || propDef === null) {
                                errors.push(`Property "${propName}" in schema "${name}" must be an object`);
                                continue;
                            }
                            const propObj = propDef;
                            // Check required type field
                            if (!propObj.type) {
                                errors.push(`Property "${propName}" in schema "${name}" is missing required "type" field`);
                            }
                            else {
                                const validTypes = [
                                    'string',
                                    'number',
                                    'boolean',
                                    'date',
                                    'array',
                                    'object',
                                ];
                                if (!validTypes.includes(String(propObj.type))) {
                                    errors.push(`Invalid type "${propObj.type}" for property "${propName}" in schema "${name}"`);
                                }
                            }
                        }
                    }
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(`YAML parse error: ${errorMessage}`);
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * Handle interactive approval of schemas
     *
     * @param schemasYaml - Generated schemas.yaml content
     * @param iterations - Number of iterations taken
     * @returns Approval result
     */
    async handleInteractiveApproval(schemasYaml, iterations) {
        // Use the interactive handler's approveSchema method
        const result = await this.interactive.approveSchema(schemasYaml, iterations);
        // The interactive module returns { approved: boolean, edited?: string }
        // with a special marker for "request more iterations"
        if (!result.approved && result.edited === '__REQUEST_MORE_ITERATIONS__') {
            return {
                approved: false,
                requestMore: true,
            };
        }
        return {
            approved: result.approved,
            edited: result.edited,
        };
    }
    /**
     * Save design state with checkpoint
     *
     * @param schemasYaml - Generated schemas.yaml content
     * @param iterations - Number of iterations taken
     * @param convergenceReason - Reason for convergence if any
     */
    async saveState(schemasYaml, iterations, convergenceReason) {
        // Create design state
        const designState = {
            complete: true,
            schemasYaml,
            iterations,
            convergenceReason,
        };
        // Create checkpoint
        await this.stateManager.checkpoint(WorkflowStage.DESIGNING, 'Schema design completed', {
            design: designState,
            schemasYaml,
            iterations,
            convergenceReason,
        });
    }
}
export default SchemaDesignStage;
//# sourceMappingURL=schema-design.js.map