/**
 * Tool Definitions for Structured Output
 *
 * These tools allow Claude to output structured JSON instead of free-form text,
 * eliminating YAML parsing errors and guaranteeing schema conformance.
 */
/**
 * Tool definition for submitting triage results
 */
export const submitTriageTool = {
    name: 'submit_triage',
    description: 'Submit the triage analysis results with files to inspect and quick classifications',
    input_schema: {
        type: 'object',
        properties: {
            files_to_inspect: {
                type: 'array',
                description: 'Files that need detailed inspection',
                items: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative path to the file' },
                        reason: { type: 'string', description: 'Why this file needs inspection' },
                        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                    },
                    required: ['path', 'reason', 'priority'],
                },
            },
            quick_classifications: {
                type: 'array',
                description: 'Files that can be classified without inspection',
                items: {
                    type: 'object',
                    properties: {
                        path: { type: 'string' },
                        type: { type: 'string' },
                        confidence: { type: 'number', minimum: 0, maximum: 1 },
                        has_frontmatter: { type: 'boolean' },
                        complexity: { type: 'string', enum: ['simple', 'medium', 'complex'] },
                        migration_effort: { type: 'string', enum: ['low', 'medium', 'high'] },
                    },
                    required: ['path', 'type', 'confidence'],
                },
            },
            initial_observations: {
                type: 'array',
                description: 'Key observations about the project structure',
                items: { type: 'string' },
            },
        },
        required: ['files_to_inspect', 'quick_classifications', 'initial_observations'],
    },
};
/**
 * Tool definition for submitting blueprint results
 */
export const submitBlueprintTool = {
    name: 'submit_blueprint',
    description: 'Submit the complete PKF documentation blueprint',
    input_schema: {
        type: 'object',
        properties: {
            version: { type: 'string', description: 'Blueprint version (e.g., "1.0")' },
            repository: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    root: { type: 'string' },
                },
                required: ['name', 'root'],
            },
            analysis_summary: {
                type: 'object',
                properties: {
                    total_documents: { type: 'number' },
                    with_frontmatter: { type: 'number' },
                    inspected_documents: { type: 'number' },
                    migration_complexity: {
                        type: 'object',
                        properties: {
                            low: { type: 'number' },
                            medium: { type: 'number' },
                            high: { type: 'number' },
                        },
                        required: ['low', 'medium', 'high'],
                    },
                    existing_patterns: { type: 'array', items: { type: 'string' } },
                    notable_findings: { type: 'array', items: { type: 'string' } },
                },
                required: ['total_documents', 'with_frontmatter', 'inspected_documents', 'migration_complexity'],
            },
            discovered_documents: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        path: { type: 'string' },
                        target_path: { type: 'string' },
                        type: { type: 'string' },
                        title: { type: 'string' },
                        has_frontmatter: { type: 'boolean' },
                        complexity: { type: 'string', enum: ['simple', 'medium', 'complex'] },
                        migration_effort: { type: 'string', enum: ['low', 'medium', 'high'] },
                        sections: { type: 'array', items: { type: 'string' } },
                        notes: { type: 'string' },
                        inspection_confidence: { type: 'number' },
                    },
                    required: ['path', 'target_path', 'type', 'title', 'has_frontmatter', 'complexity', 'migration_effort'],
                },
            },
            recommended_structure: {
                type: 'object',
                properties: {
                    docs_root: { type: 'string' },
                    directories: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                path: { type: 'string' },
                                purpose: { type: 'string' },
                            },
                            required: ['path', 'purpose'],
                        },
                    },
                },
                required: ['docs_root', 'directories'],
            },
            recommended_types: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        extends: { type: 'string' },
                        description: { type: 'string' },
                        fields: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    type: { type: 'string' },
                                    values: { type: 'array', items: { type: 'string' } },
                                },
                                required: ['name', 'type'],
                            },
                        },
                    },
                    required: ['name', 'description'],
                },
            },
            migration_plan: {
                type: 'object',
                properties: {
                    phase_1: {
                        type: 'object',
                        properties: {
                            description: { type: 'string' },
                            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                            documents: { type: 'array', items: { type: 'string' } },
                        },
                        required: ['description', 'priority', 'documents'],
                    },
                    phase_2: {
                        type: 'object',
                        properties: {
                            description: { type: 'string' },
                            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                            documents: { type: 'array', items: { type: 'string' } },
                        },
                        required: ['description', 'priority', 'documents'],
                    },
                    phase_3: {
                        type: 'object',
                        properties: {
                            description: { type: 'string' },
                            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                            documents: { type: 'array', items: { type: 'string' } },
                        },
                        required: ['description', 'priority', 'documents'],
                    },
                },
            },
            warnings: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        type: { type: 'string' },
                        message: { type: 'string' },
                        recommendation: { type: 'string' },
                    },
                    required: ['type', 'message', 'recommendation'],
                },
            },
        },
        required: ['version', 'repository', 'analysis_summary', 'discovered_documents', 'recommended_structure', 'recommended_types', 'migration_plan', 'warnings'],
    },
};
/**
 * Tool definition for submitting document migration result
 */
export const submitMigrationTool = {
    name: 'submit_migration',
    description: 'Submit the result of migrating a single document',
    input_schema: {
        type: 'object',
        properties: {
            path: { type: 'string', description: 'Source path of the document' },
            success: { type: 'boolean', description: 'Whether migration succeeded' },
            frontmatter: {
                type: 'object',
                description: 'Generated frontmatter for the document',
                additionalProperties: true,
            },
            content_updated: { type: 'boolean', description: 'Whether content was modified' },
            error: { type: 'string', description: 'Error message if migration failed' },
        },
        required: ['path', 'success', 'frontmatter', 'content_updated'],
    },
};
/**
 * All available tools
 */
export const allTools = {
    submit_triage: submitTriageTool,
    submit_blueprint: submitBlueprintTool,
    submit_migration: submitMigrationTool,
};
/**
 * Extract tool result from Claude's response
 * @param content - Response content blocks
 * @param toolName - Expected tool name
 * @returns Tool input or null if not found
 */
export function extractToolResult(content, toolName) {
    for (const block of content) {
        if (block.type === 'tool_use' && block.name === toolName && block.input) {
            return block.input;
        }
    }
    return null;
}
//# sourceMappingURL=tool-definitions.js.map