/**
 * PKF Init Schema Design Stage (Stage 2)
 * Uses agent conversation to design PKF schemas based on the blueprint.
 */

import type { AgentOrchestrator } from '../agents/orchestrator.js';
import type { WorkflowStateManager } from '../state/workflow-state.js';
import type { Interactive } from '../utils/interactive.js';
import { WorkflowStage, type DesignState, type LoadedConfig } from '../types/index.js';
import { SchemaLoader, validateSchemasYaml as validateSchemas } from '@pantheon-tech/pkf-core/schema';
import { safeLoad } from '../utils/yaml.js';
import logger from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of the schema design stage
 */
export interface SchemaDesignResult {
  /** Whether the stage completed successfully */
  success: boolean;
  /** Generated schemas.yaml content */
  schemasYaml?: string;
  /** Number of conversation iterations */
  iterations: number;
  /** Reason for convergence if converged */
  convergenceReason?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Result of schema validation
 */
export interface ValidationResult {
  /** Whether the schema is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
}

/**
 * Result of interactive approval
 */
interface InteractiveApprovalResult {
  /** Whether the user approved */
  approved: boolean;
  /** Edited content if user made changes */
  edited?: string;
  /** Whether to request more iterations */
  requestMore?: boolean;
}

// ============================================================================
// PKF Schema DSL Reference
// ============================================================================

/**
 * PKF Base Schema - the canonical starting point for all PKF schemas
 * Agents should use this with MINIMAL modifications
 */
const PKF_BASE_SCHEMA = `
version: "1.0"
schemas:
  base-doc:
    _description: "Base document type with common metadata fields"
    properties:
      title:
        type: string
        required: true
        description: "Document title"
      created:
        type: date
        required: true
        description: "Creation date (ISO 8601)"
        default: "{{TODAY}}"
      updated:
        type: date
        description: "Last update date (ISO 8601)"
      status:
        type: string
        required: true
        enum: [draft, review, published, deprecated]
        default: draft
        description: "Document lifecycle status"
      author:
        type: string
        description: "Document author"
        default: "{{GIT_USER}}"
      tags:
        type: array
        items:
          type: string
        description: "Categorization tags"

  guide:
    _extends: base-doc
    _description: "User or developer guide"
    properties:
      audience:
        type: string
        enum: [user, developer, admin, all]
        description: "Target audience"
      difficulty:
        type: string
        enum: [beginner, intermediate, advanced]
        description: "Content difficulty level"

  spec:
    _extends: base-doc
    _description: "Technical specification or API documentation"
    properties:
      version:
        type: string
        pattern: "^\\\\d+\\\\.\\\\d+(\\\\.\\\\d+)?$"
        description: "Specification version (semver)"

  adr:
    _extends: base-doc
    _description: "Architecture Decision Record"
    properties:
      decision-date:
        type: date
        required: true
        description: "Date decision was made"
      decision-status:
        type: string
        required: true
        enum: [proposed, accepted, deprecated, superseded]
        description: "Decision status"
      superseded-by:
        type: string
        description: "ADR that supersedes this one (if any)"

  register:
    _extends: base-doc
    _description: "Register document (TODO, ISSUES, CHANGELOG)"
    properties:
      register-type:
        type: string
        required: true
        enum: [todo, issues, changelog]
        description: "Type of register"
`;

/**
 * PKF Schema DSL specification reference for agents
 */
const PKF_SCHEMA_DSL_REFERENCE = `
## PKF Schema DSL Reference

The PKF Schema DSL is a YAML-based language for defining document type schemas.

### IMPORTANT: Use the PKF Base Schema

You MUST use the PKF Base Schema below as your starting point. Only add project-specific
types if the blueprint clearly identifies document types not covered by the base schema.

**Minimize customizations** - the base schema covers most common documentation patterns.
Only add new types when absolutely necessary.

### PKF Base Schema (USE THIS)
\`\`\`yaml
${PKF_BASE_SCHEMA}
\`\`\`

### Adding Project-Specific Types

If you need to add types beyond the base schema:
1. Always extend \`base-doc\` (never create standalone types)
2. Only add fields that are actually needed based on the blueprint
3. Prefer simple field types (string, date, boolean)
4. Use enums for constrained values

### Property Types
- \`string\`: Text value
- \`number\`: Numeric value
- \`boolean\`: True/false
- \`date\`: ISO 8601 date
- \`array\`: List of values (use \`items\` to define item type)
- \`object\`: Nested structure

### Default Placeholders
- \`{{TODAY}}\`: Current date
- \`{{GIT_USER}}\`: Git user.name
- \`{{GIT_EMAIL}}\`: Git user.email
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
  private orchestrator: AgentOrchestrator;
  private stateManager: WorkflowStateManager;
  private config: LoadedConfig;
  private interactive: Interactive;
  private maxIterations: number;

  /**
   * Create a new SchemaDesignStage
   *
   * @param orchestrator - Agent orchestrator for running conversations
   * @param stateManager - Workflow state manager for persistence
   * @param config - Loaded configuration
   * @param interactive - Interactive mode handler
   * @param maxIterations - Maximum conversation iterations (default 5)
   */
  constructor(
    orchestrator: AgentOrchestrator,
    stateManager: WorkflowStateManager,
    config: LoadedConfig,
    interactive: Interactive,
    maxIterations: number = 5
  ) {
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
  async execute(blueprint: string): Promise<SchemaDesignResult> {
    let totalIterations = 0;
    let currentSchemas: string | undefined;
    let currentPrompt = this.buildInitialPrompt(blueprint);
    const additionalIterationsPerRequest = 3;

    // Loop until user approves or cancels
    while (true) {
      try {
        logger.info(`Running agent conversation (max ${this.maxIterations} iterations)...`);

        // Run agent conversation
        const agentResult = await this.orchestrator.agentConversation(
          'documentation-analyst-init',
          'pkf-implementer',
          currentPrompt,
          this.maxIterations
        );

        // Extract iterations from metadata
        const iterationsThisRound = (agentResult.metadata?.iterations as number) ?? 1;
        totalIterations += iterationsThisRound;
        const convergenceReason = agentResult.metadata?.convergenceReason as string | undefined;

        // Log conversation summary
        this.logConversationSummary(agentResult, iterationsThisRound);

        // Try to extract schemas from output (even if "failed" due to max iterations)
        const schemasYaml = this.extractSchemasYaml(agentResult.output);

        if (!schemasYaml) {
          // If we have previous schemas, use those
          if (currentSchemas) {
            logger.warn('Could not extract new schemas, using previous version');
          } else {
            // Fallback: use the PKF base schema as a starting point
            logger.warn('Could not extract schemas from agent response, using PKF base schema');
            logger.debug('Agent output was: ' + agentResult.output.substring(0, 500) + '...');
            currentSchemas = PKF_BASE_SCHEMA.trim();
          }
        } else {
          currentSchemas = schemasYaml;
        }

        // Save intermediate checkpoint with current schemas (for resume capability)
        await this.saveIntermediateCheckpoint(currentSchemas!, totalIterations);

        // Validate schemas
        const validation = await this.validateSchemasYaml(currentSchemas!);

        if (!validation.valid) {
          return {
            success: false,
            schemasYaml: currentSchemas,
            iterations: totalIterations,
            convergenceReason,
            error: `Schema validation failed: ${validation.errors.join(', ')}`,
          };
        }

        // Show validation warnings
        if (validation.warnings.length > 0) {
          for (const warning of validation.warnings) {
            logger.warn(`Schema warning: ${warning}`);
          }
        }

        // Handle interactive approval with blueprint for target structure display
        const approvalResult = await this.handleInteractiveApproval(
          currentSchemas!,
          totalIterations,
          blueprint
        );

        if (!approvalResult.approved) {
          if (approvalResult.requestMore) {
            // User wants more iterations - continue the loop
            logger.info('User requested more iterations, continuing conversation...');

            // Build continuation prompt with current schemas as context
            const editedSchemas = approvalResult.edited || currentSchemas;
            currentPrompt = this.buildContinuationPrompt(blueprint, editedSchemas!);
            currentSchemas = editedSchemas;

            // Add more iterations for this round
            this.maxIterations = additionalIterationsPerRequest;

            continue; // Continue the loop
          }

          return {
            success: false,
            iterations: totalIterations,
            convergenceReason,
            error: 'User cancelled schema approval',
          };
        }

        // User approved - finalize
        const finalSchemas = approvalResult.edited || currentSchemas!;

        // Save state with checkpoint
        await this.saveState(finalSchemas, totalIterations, convergenceReason);

        return {
          success: true,
          schemasYaml: finalSchemas,
          iterations: totalIterations,
          convergenceReason: convergenceReason || 'User approved',
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Save current state even on error so we can resume
        if (currentSchemas) {
          try {
            await this.saveIntermediateCheckpoint(currentSchemas, totalIterations, errorMessage);
          } catch (saveError) {
            logger.warn('Failed to save checkpoint on error:', saveError);
          }
        }

        return {
          success: false,
          schemasYaml: currentSchemas,
          iterations: totalIterations,
          error: `Schema design stage failed: ${errorMessage}`,
        };
      }
    }
  }

  /**
   * Log a summary of the agent conversation
   */
  private logConversationSummary(
    agentResult: { success: boolean; output: string; metadata?: Record<string, unknown> },
    iterations: number
  ): void {
    logger.info(`Agent conversation completed:`);
    logger.info(`  Iterations: ${iterations}`);

    if (agentResult.metadata?.converged) {
      logger.success(`  Converged: ${agentResult.metadata.convergenceReason}`);
    } else {
      logger.info(`  Status: Max iterations reached (output may still be valid)`);
    }

    // Extract key discussion points from the output
    const keyPoints = this.extractKeyDiscussionPoints(agentResult.output);
    if (keyPoints.length > 0) {
      logger.info(`  Key discussion points:`);
      for (const point of keyPoints) {
        logger.info(`    • ${point}`);
      }
    }
  }

  /**
   * Extract key discussion points from agent output
   */
  private extractKeyDiscussionPoints(output: string): string[] {
    const points: string[] = [];

    // Extract schema names defined
    const schemaMatch = output.match(/^ {2}([a-z][a-z0-9-]+):$/gm);
    if (schemaMatch) {
      const schemaNames = schemaMatch.map(s => s.trim().replace(':', '')).filter(s => s !== 'properties');
      if (schemaNames.length > 0) {
        points.push(`Defined schemas: ${schemaNames.slice(0, 5).join(', ')}${schemaNames.length > 5 ? ` (+${schemaNames.length - 5} more)` : ''}`);
      }
    }

    // Look for approval signal
    if (output.includes('SCHEMA-DESIGN-APPROVED')) {
      const approvalMatch = output.match(/SCHEMA-DESIGN-APPROVED:\s*(.+?)(?:\n|$)/);
      if (approvalMatch) {
        points.push(`Approval reason: ${approvalMatch[1].trim()}`);
      }
    }

    return points.slice(0, 5); // Limit to 5 points
  }

  /**
   * Build a continuation prompt for additional iterations
   */
  private buildContinuationPrompt(blueprint: string, currentSchemas: string): string {
    return `Continue refining the PKF schemas. The reviewer wants additional refinement.

## Blueprint (Reference)

${blueprint}

## Current Schema Draft

\`\`\`yaml
${currentSchemas}
\`\`\`

## Review Criteria

1. Are document types correctly mapped to PKF base types?
2. Is inheritance (\`_extends: base-doc\`) used consistently?
3. Are there unnecessary custom types that could use base schema types?
4. Are field types and constraints appropriate?

## Response Format (REQUIRED)

Every response MUST include:
1. Brief assessment (2-3 sentences)
2. Complete updated schemas.yaml in a YAML code block
3. Summary of changes (if any)

## Convergence

When the schema is complete and needs no further changes, output:
SCHEMA-DESIGN-APPROVED: [brief reason]

The schema MUST be included in the same response as the approval signal.

## Begin

Review and propose any needed improvements.
`;
  }

  /**
   * Build the initial prompt for schema design
   *
   * @param blueprint - Documentation blueprint from Stage 1
   * @returns Initial prompt string
   */
  private buildInitialPrompt(blueprint: string): string {
    return `Design a PKF schemas.yaml file based on the documentation blueprint below.

## Documentation Blueprint

${blueprint}

${PKF_SCHEMA_DSL_REFERENCE}

## CRITICAL Requirements

1. **START WITH THE PKF BASE SCHEMA** - Copy the base schema exactly, then add only what's needed
2. **MINIMIZE CUSTOMIZATIONS** - The base schema covers most use cases. Only add new types if
   the blueprint explicitly identifies document types not covered (guide, spec, adr, register)
3. **Every response MUST include a complete schemas.yaml** in a YAML code block
4. Map blueprint document types to existing base schema types when possible:
   - README, guide, tutorial, how-to → use \`guide\` type
   - specification, API docs → use \`spec\` type
   - architecture decision → use \`adr\` type
   - TODO, ISSUES, CHANGELOG → use \`register\` type
   - All others → use \`base-doc\` directly

## Response Format (REQUIRED)

Every response MUST include this structure:

1. Brief analysis (2-3 sentences max)
2. The complete schemas.yaml in a code block:

\`\`\`yaml
version: "1.0"
schemas:
  base-doc:
    # ... full schema definition
  # ... other types
\`\`\`

3. If proposing changes, explain what was added/modified

## Convergence

When both agents agree the schema is complete, output:
SCHEMA-DESIGN-APPROVED: [brief reason]

The schema MUST be included in the same response as the approval signal.

## Begin

Review the blueprint. Output your proposed schemas.yaml using the PKF base schema as the foundation.
`;
  }

  /**
   * Extract schemas.yaml content from agent response
   *
   * @param response - Agent response text
   * @returns Extracted YAML content or null
   */
  private extractSchemasYaml(response: string): string | null {
    const loader = new SchemaLoader();
    return loader.extractSchemasYaml(response);
  }

  /**
   * Check if content looks like valid schemas.yaml
   *
   * @param content - YAML content to check
   * @returns True if content appears to be schemas.yaml
   */
  private looksLikeSchemasYaml(content: string): boolean {
    const loader = new SchemaLoader();
    return loader.looksLikeSchemasYaml(content);
  }

  /**
   * Validate schemas.yaml structure
   *
   * @param yaml - YAML content to validate
   * @returns Validation result
   */
  private async validateSchemasYaml(yaml: string): Promise<ValidationResult> {
    const loader = new SchemaLoader();
    const schemas = loader.load(yaml);

    if (!schemas) {
      return {
        valid: false,
        errors: ['Failed to parse YAML or invalid schema structure'],
        warnings: [],
      };
    }

    return validateSchemas(schemas);
  }

  /**
   * Handle interactive approval of schemas
   *
   * @param schemasYaml - Generated schemas.yaml content
   * @param iterations - Number of iterations taken
   * @param blueprint - Optional blueprint for target structure display
   * @returns Approval result
   */
  private async handleInteractiveApproval(
    schemasYaml: string,
    iterations: number,
    blueprint?: string
  ): Promise<InteractiveApprovalResult> {
    // Parse blueprint to extract target structure if provided
    let targetStructure: { path: string; targetPath: string; type: string }[] | undefined;

    if (blueprint) {
      try {
        const blueprintData = safeLoad(blueprint) as {
          discovered_documents?: Array<{
            path: string;
            target_path: string;
            type: string;
          }>;
        };

        if (blueprintData?.discovered_documents) {
          targetStructure = blueprintData.discovered_documents.map(doc => ({
            path: doc.path,
            targetPath: doc.target_path,
            type: doc.type,
          }));
        }
      } catch {
        // Ignore blueprint parsing errors, just don't show tree
      }
    }

    // Use the interactive handler's approveSchema method
    const result = await this.interactive.approveSchema(schemasYaml, iterations, targetStructure);

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
   * Save intermediate checkpoint during design process
   *
   * @param schemasYaml - Current schemas.yaml content
   * @param iterations - Number of iterations so far
   * @param error - Optional error message
   */
  private async saveIntermediateCheckpoint(
    schemasYaml: string,
    iterations: number,
    error?: string
  ): Promise<void> {
    const description = error
      ? `Schema design in progress (${iterations} iterations) - error: ${error}`
      : `Schema design in progress (${iterations} iterations)`;

    await this.stateManager.checkpoint(
      WorkflowStage.DESIGNING,
      description,
      {
        design: {
          complete: false,
          schemasYaml,
          iterations,
          inProgress: true,
        },
        schemasYaml,
        iterations,
      }
    );

    logger.debug(`Saved intermediate checkpoint: ${iterations} iterations`);
  }

  /**
   * Save design state with checkpoint
   *
   * @param schemasYaml - Generated schemas.yaml content
   * @param iterations - Number of iterations taken
   * @param convergenceReason - Reason for convergence if any
   */
  private async saveState(
    schemasYaml: string,
    iterations: number,
    convergenceReason?: string
  ): Promise<void> {
    // Create design state
    const designState: DesignState = {
      complete: true,
      schemasYaml,
      iterations,
      convergenceReason,
    };

    // Create checkpoint
    await this.stateManager.checkpoint(
      WorkflowStage.DESIGNING,
      'Schema design completed',
      {
        design: designState,
        schemasYaml,
        iterations,
        convergenceReason,
      }
    );
  }
}

export default SchemaDesignStage;
