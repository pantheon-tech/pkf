---
title: Research Session
query: "Latest best practices for building MCP servers using TypeScript, Model Context Protocol SDK patterns, tool definitions with Zod schemas, and integration strategies for Claude Desktop and Claude Code. Focus on 2025-2026 patterns and recommendations."
date: 1/4/2026
time: 10:00:54 PM
timestamp: 2026-01-04T22:00:54.780Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** Latest best practices for building MCP servers using TypeScript, Model Context Protocol SDK patterns, tool definitions with Zod schemas, and integration strategies for Claude Desktop and Claude Code. Focus on 2025-2026 patterns and recommendations.

**Response:**

# Best Practices for Building MCP Servers with TypeScript (2025-2026)

## Introduction to Modern MCP Server Architecture

The Model Context Protocol (MCP) has evolved significantly since its introduction, becoming a cornerstone for AI application development by 2025-2026. Building MCP servers with TypeScript offers robust type safety, excellent developer experience, and strong integration capabilities with modern AI systems like Claude. This comprehensive guide explores cutting-edge patterns, recommendations, and implementation strategies for developing production-grade MCP servers using TypeScript, with a particular focus on integration with Claude Desktop and Claude Code.

The project context indicates you're working on a sophisticated system with workflow stages, migration capabilities, and integration with AI services. The best practices outlined here will help you modernize your approach while maintaining compatibility with your existing architecture.

## Core MCP Server Architecture Patterns (2025-2026)

### Modular Architecture with Domain-Driven Design

The most successful MCP server implementations in 2025-2026 follow a domain-driven design approach with clear separation of concerns:

```typescript
// src/domains/tools/index.ts
export * from './definitions';
export * from './handlers';
export * from './schemas';
export * from './types';

// src/domains/tools/types.ts
export interface ToolContext {
  sessionId: string;
  userId: string;
  requestId: string;
  // Additional context properties
}

// src/domains/tools/definitions.ts
import { z } from 'zod';
import { defineToolSchema } from '@anthropic/sdk';

export const fileSearchTool = defineToolSchema({
  name: 'file_search',
  description: 'Search for files in the repository',
  parameters: z.object({
    query: z.string().describe('The search query'),
    fileTypes: z.array(z.string()).optional().describe('File types to include'),
    maxResults: z.number().int().positive().default(10).describe('Maximum number of results')
  }),
  returns: z.array(z.object({
    path: z.string(),
    snippet: z.string().optional(),
    lastModified: z.string().datetime()
  }))
});
```

This modular approach allows for better maintainability and scalability, which aligns with your project's needs for handling complex workflows and migrations.

### Dependency Injection for Testability

Modern MCP servers leverage dependency injection to improve testability and modularity:

```typescript
// src/infrastructure/container.ts
import { Container } from 'inversify';
import { ToolRegistry, IToolRegistry } from '../domains/tools/registry';
import { TemplateManager, ITemplateManager } from '../domains/templates/manager';
import { LockManager, ILockManager } from '../domains/locks/manager';

export const container = new Container();

// Register services
container.bind<IToolRegistry>(TYPES.ToolRegistry).to(ToolRegistry).inSingletonScope();
container.bind<ITemplateManager>(TYPES.TemplateManager).to(TemplateManager).inSingletonScope();
container.bind<ILockManager>(TYPES.LockManager).to(LockManager).inSingletonScope();
```

This pattern would be particularly valuable for addressing your Task 14 (Implement Comprehensive Unit Tests), as it makes mocking dependencies much more straightforward.

## Advanced Zod Schema Patterns for Tool Definitions

### Composable Schema Patterns

The 2025-2026 best practice for tool definitions involves composable schemas that promote reusability:

```typescript
// src/domains/tools/schemas/common.ts
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20)
});

export const sortingSchema = z.object({
  sortBy: z.string(),
  sortDirection: z.enum(['asc', 'desc']).default('asc')
});

export const fileInfoSchema = z.object({
  path: z.string(),
  size: z.number().int().nonnegative(),
  lastModified: z.string().datetime(),
  contentType: z.string().optional()
});

// src/domains/tools/definitions/file-tools.ts
import { z } from 'zod';
import { defineToolSchema } from '@anthropic/sdk';
import { paginationSchema, sortingSchema, fileInfoSchema } from '../schemas/common';

export const listFilesTool = defineToolSchema({
  name: 'list_files',
  description: 'List files in a directory',
  parameters: z.object({
    directory: z.string().default('./'),
    recursive: z.boolean().default(false),
    ...paginationSchema.shape,
    ...sortingSchema.shape
  }),
  returns: z.object({
    files: z.array(fileInfoSchema),
    totalCount: z.number().int().nonnegative(),
    hasMore: z.boolean()
  })
});
```

This approach would help with your Task 15 (Externalize Template Strings) by providing a structured way to define and validate template configurations.

### Runtime Type Validation with Zod Refinements

Advanced validation logic can be implemented using Zod refinements:

```typescript
// src/domains/tools/schemas/validation.ts
import { z } from 'zod';
import path from 'path';

export const safePathSchema = z.string().refine(
  (value) => {
    const normalizedPath = path.normalize(value);
    return !normalizedPath.includes('..') && !path.isAbsolute(normalizedPath);
  },
  {
    message: 'Path must be relative and cannot contain parent directory traversal',
    path: ['path']
  }
);

export const yamlContentSchema = z.string().refine(
  (value) => {
    try {
      // Use safe parsing as mentioned in Task 19
      yaml.load(value, { schema: yaml.JSON_SCHEMA });
      return true;
    } catch (error) {
      return false;
    }
  },
  {
    message: 'Invalid YAML content',
    path: ['content']
  }
);
```

This pattern would be particularly relevant for your Task 19 (Implement Secure YAML Parsing) by ensuring that all YAML content is validated before processing.

## MCP Server Implementation with TypeScript

### Asynchronous Request Handling with Performance Optimization

Modern MCP servers implement efficient asynchronous request handling with performance optimizations:

```typescript
// src/api/handlers/tool-execution.ts
import { Router } from 'express';
import { z } from 'zod';
import { container } from '../../infrastructure/container';
import { TYPES } from '../../infrastructure/types';
import { IToolRegistry } from '../../domains/tools/registry';
import { createRequestValidator } from '../middleware/validation';

const router = Router();
const toolRegistry = container.get<IToolRegistry>(TYPES.ToolRegistry);

const toolExecutionSchema = z.object({
  toolName: z.string(),
  parameters: z.record(z.any()),
  context: z.object({
    sessionId: z.string(),
    userId: z.string(),
    requestId: z.string().uuid()
  })
});

router.post(
  '/execute',
  createRequestValidator(toolExecutionSchema),
  async (req, res, next) => {
    try {
      const { toolName, parameters, context } = req.body;
      
      // Performance optimization: Use Promise.all for parallel operations
      // This aligns with your Task 20 (Implement Performance Optimizations)
      const [toolDefinition, userPermissions] = await Promise.all([
        toolRegistry.getToolDefinition(toolName),
        getUserPermissions(context.userId)
      ]);
      
      if (!toolDefinition) {
        return res.status(404).json({ error: 'Tool not found' });
      }
      
      if (!hasPermission(userPermissions, toolName)) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      const result = await toolRegistry.executeTool(toolName, parameters, context);
      return res.json({ result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

This implementation addresses your Task 20 (Implement Performance Optimizations) by using parallel processing for independent operations.

### State Management with Version Migration

Implementing a robust state management system with version migration capabilities:

```typescript
// src/domains/state/manager.ts
import fs from 'fs/promises';
import path from 'path';
import semver from 'semver';
import { z } from 'zod';
import { safeLoad, safeDump } from '../../utils/yaml';

const stateSchemaV1 = z.object({
  version: z.literal('1.0.0'),
  lastRun: z.string().datetime().optional(),
  completedStages: z.array(z.string()),
  // Other v1 properties
});

const stateSchemaV2 = z.object({
  version: z.literal('2.0.0'),
  lastRun: z.string().datetime().optional(),
  completedStages: z.array(z.string()),
  performance: z.object({
    averageExecutionTimeMs: z.number(),
    peakMemoryUsageMb: z.number()
  }).optional(),
  // Other v2 properties
});

type StateV1 = z.infer<typeof stateSchemaV1>;
type StateV2 = z.infer<typeof stateSchemaV2>;
type State = StateV1 | StateV2;

const migrations: Record<string, (state: any) => any> = {
  '1.0.0-to-2.0.0': (oldState: StateV1): StateV2 => {
    return {
      ...oldState,
      version: '2.0.0',
      performance: {
        averageExecutionTimeMs: 0,
        peakMemoryUsageMb: 0
      }
    };
  }
};

export class StateManager {
  private statePath: string;
  
  constructor(workspacePath: string) {
    this.statePath = path.join(workspacePath, '.pkf', 'state.yml');
  }
  
  async loadState(): Promise<State> {
    try {
      const content = await fs.readFile(this.statePath, 'utf-8');
      const rawState = safeLoad(content);
      
      // Handle legacy state without version
      if (!rawState.version) {
        return this.migrateToLatest({ version: '1.0.0', completedStages: [] });
      }
      
      return this.migrateToLatest(rawState);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Initialize with latest version
        return { version: '2.0.0', completedStages: [], performance: { averageExecutionTimeMs: 0, peakMemoryUsageMb: 0 } };
      }
      throw error;
    }
  }
  
  private migrateToLatest(state: any): State {
    const latestVersion = '2.0.0';
    let currentState = state;
    
    while (semver.lt(currentState.version, latestVersion)) {
      const currentVersion = currentState.version;
      const nextVersion = this.getNextVersion(currentVersion);
      const migrationKey = `${currentVersion}-to-${nextVersion}`;
      
      if (!migrations[migrationKey]) {
        throw new Error(`No migration path from ${currentVersion} to ${nextVersion}`);
      }
      
      currentState = migrations[migrationKey](currentState);
    }
    
    return currentState;
  }
  
  private getNextVersion(version: string): string {
    // Simplified version progression logic
    if (version === '1.0.0') return '2.0.0';
    throw new Error(`Unknown version progression from ${version}`);
  }
  
  async saveState(state: State): Promise<void> {
    const dirPath = path.dirname(this.statePath);
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(this.statePath, safeDump(state));
  }
}
```

This implementation directly addresses your Task 18 (Implement State Migration Strategy) by providing a robust mechanism for handling state version changes.

## Integration with Claude Desktop and Claude Code

### Claude Desktop Integration Patterns

Modern integration with Claude Desktop leverages the MCP protocol for seamless tool execution:

```typescript
// src/integrations/claude-desktop/client.ts
import { AnthropicClient } from '@anthropic/sdk';
import { toolDefinitions } from '../../domains/tools/definitions';
import { container } from '../../infrastructure/container';
import { TYPES } from '../../infrastructure/types';
import { IToolRegistry } from '../../domains/tools/registry';

export class ClaudeDesktopIntegration {
  private client: AnthropicClient;
  private toolRegistry: IToolRegistry;
  
  constructor(apiKey: string) {
    this.client = new AnthropicClient({
      apiKey,
      // 2025-2026 best practice: Use the latest stable API version
      apiVersion: '2025-06-01'
    });
    
    this.toolRegistry = container.get<IToolRegistry>(TYPES.ToolRegistry);
  }
  
  async createAssistantWithTools() {
    // Register all tools with Claude
    const tools = Object.values(toolDefinitions);
    
    // Create a Claude assistant with tool access
    const assistant = await this.client.createAssistant({
      name: "Project Assistant",
      model: "claude-3-opus-20250601",
      tools,
      instructions: `You are a project assistant that helps with software development tasks.
You have access to various tools to help with file operations, code analysis, and more.`
    });
    
    return assistant;
  }
  
  async handleToolExecution(toolCall: any) {
    const { name, parameters } = toolCall;
    
    // Execute the tool using the registry
    const result = await this.toolRegistry.executeTool(name, parameters, {
      sessionId: toolCall.sessionId,
      userId: toolCall.userId,
      requestId: toolCall.id
    });
    
    return result;
  }
}
```

### Claude Code Integration for Advanced Development Workflows

Integration with Claude Code for enhanced development capabilities:

```typescript
// src/integrations/claude-code/client.ts
import { AnthropicClient } from '@anthropic/sdk';
import { z } from 'zod';
import { defineToolSchema } from '@anthropic/sdk';
import { container } from '../../infrastructure/container';
import { TYPES } from '../../infrastructure/types';
import { ITemplateManager } from '../../domains/templates/manager';

// Define Claude Code specific tools
const generateCodeTool = defineToolSchema({
  name: 'generate_code',
  description: 'Generate code based on requirements',
  parameters: z.object({
    language: z.string(),
    requirements: z.string(),
    existingCode: z.string().optional(),
    outputPath: z.string().optional()
  }),
  returns: z.object({
    code: z.string(),
    explanation: z.string()
  })
});

const analyzeCodeTool = defineToolSchema({
  name: 'analyze_code',
  description: 'Analyze code for issues and improvements',
  parameters: z.object({
    code: z.string(),
    language: z.string(),
    analysisType: z.enum(['security', 'performance', 'style', 'comprehensive'])
  }),
  returns: z.object({
    issues: z.array(z.object({
      severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
      message: z.string(),
      line: z.number().int().optional(),
      column: z.number().int().optional(),
      suggestion: z.string().optional()
    })),
    summary: z.string()
  })
});

export class ClaudeCodeIntegration {
  private client: AnthropicClient;
  private templateManager: ITemplateManager;
  
  constructor(apiKey: string) {
    this.client = new AnthropicClient({
      apiKey,
      apiVersion: '2025-06-01'
    });
    
    this.templateManager = container.get<ITemplateManager>(TYPES.TemplateManager);
  }
  
  async generateCodeFromTemplate(templateName: string, variables: Record<string, any>) {
    // Load template using the TemplateManager from Task 15
    const template = await this.templateManager.getTemplate(templateName);
    
    // Replace variables in the template
    const processedTemplate = Object.entries(variables).reduce(
      (result, [key, value]) => result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(value)),
      template
    );
    
    // Use Claude to generate code based on the template
    const message = await this.client.messages.create({
      model: "claude-3-opus-20250601",
      max_tokens: 4000,
      system: "You are an expert code generator. Generate high-quality, well-documented code based on the requirements.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Generate code based on the following template and requirements:\n\n${processedTemplate}`
            }
          ]
        }
      ],
      tools: [generateCodeTool]
    });
    
    return message;
  }
  
  async analyzeCode(code: string, language: string) {
    const message = await this.client.messages.create({
      model: "claude-3-opus-20250601",
      max_tokens: 4000,
      system: "You are an expert code analyzer. Identify issues and suggest improvements.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze the following ${language} code for issues and improvements:\n\n${code}`
            }
          ]
        }
      ],
      tools: [analyzeCodeTool]
    });
    
    return message;
  }
}
```

This integration would be particularly valuable for your Task 15 (Externalize Template Strings) by providing a sophisticated way to manage and apply templates.

## Advanced MCP Server Security and Performance

### Secure Tool Execution with Permission Boundaries

Implementing secure tool execution with permission boundaries:

```typescript
// src/domains/security/permission-manager.ts
import { z } from 'zod';

const permissionSchema = z.object({
  toolName: z.string(),
  allowedOperations: z.array(z.string()),
  resourceConstraints: z.record(z.any()).optional()
});

type Permission = z.infer<typeof permissionSchema>;

export class PermissionManager {
  private userPermissions: Map<string, Permission[]> = new Map();
  
  async getUserPermissions(userId: string): Promise<Permission[]> {
    if (!this.userPermissions.has(userId)) {
      // Load permissions from database or other source
      const permissions = await this.loadPermissionsFromSource(userId);
      this.userPermissions.set(userId, permissions);
    }
    
    return this.userPermissions.get(userId) || [];
  }
  
  async hasPermission(userId: string, toolName: string, operation?: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    
    const toolPermission = permissions.find(p => p.toolName === toolName);
    if (!toolPermission) return false;
    
    if (operation && !toolPermission.allowedOperations.includes(operation)) {
      return false;
    }
    
    return true;
  }
  
  async enforceResourceConstraints(
    userId: string, 
    toolName: string, 
    resourceType: string, 
    resourceId: string
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    
    const toolPermission = permissions.find(p => p.toolName === toolName);
    if (!toolPermission || !toolPermission.resourceConstraints) return false;
    
    const constraints = toolPermission.resourceConstraints[resourceType];
    if (!constraints) return false;
    
    // Implement constraint checking logic
    // ...
    
    return true;
  }
  
  private async loadPermissionsFromSource(userId: string): Promise<Permission[]> {
    // Implementation would connect to a database or other permission source
    return [];
  }
}
```

### Atomic File Operations for Concurrency Safety

Implementing atomic file operations to prevent race conditions:

```typescript
// src/infrastructure/file-operations.ts
import fs from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

export class AtomicFileOperations {
  /**
   * Creates a file atomically, ensuring it doesn't already exist
   */
  async createFileExclusive(filePath: string, content: string): Promise<void> {
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });
    
    try {
      // Use O_EXCL flag to ensure atomic creation
      const fileHandle = await fs.open(filePath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY);
      await fileHandle.writeFile(content);
      await fileHandle.close();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new Error(`File already exists: ${filePath}`);
      }
      throw error;
    }
  }
  
  /**
   * Updates a file atomically using a temporary file and rename
   */
  async updateFileAtomic(filePath: string, content: string): Promise<void> {
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });
    
    const tempPath = `${filePath}.${Date.now()}.tmp`;
    
    try {
      await fs.writeFile(tempPath, content);
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch (unlinkError) {
        // Ignore errors during cleanup
      }
      throw error;
    }
  }
  
  /**
   * Implements a file-based lock with proper atomic operations
   */
  async acquireLock(lockPath: string, metadata: any = {}, timeoutMs: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        await this.createFileExclusive(lockPath, JSON.stringify({
          pid: process.pid,
          created: new Date().toISOString(),
          ...metadata
        }));
        return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw error;
        }
        
        // Lock exists, check if it's stale
        try {
          const stats = await fs.stat(lockPath);
          const lockAge = Date.now() - stats.mtimeMs;
          
          // If lock is older than 5 minutes, consider it stale
          if (lockAge > 5 * 60 * 1000) {
            await fs.unlink(lockPath);
            continue;
          }
        } catch (statError) {
          // Lock file might have been removed, try again
          continue;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return false;
  }
  
  async releaseLock(lockPath: string): Promise<void> {
    try {
      await fs.unlink(lockPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
```

This implementation directly addresses your Task 12 (Fix Race Condition in Lock Manager) by providing atomic file operations to prevent race conditions.

## Conclusion and Implementation Recommendations

Based on the project context and the best practices outlined above, here are specific recommendations for your project:

1. **Implement the TemplateManager** (Task 15) using the patterns shown in the Claude Code integration section, which provides a robust way to manage and apply templates.

2. **Fix the race condition in the Lock Manager** (Task 12) by adopting the atomic file operations pattern shown in the AtomicFileOperations class.

3. **Address ESLint errors** (Task 11) by following TypeScript best practices for unused variables and parameters, which will improve code quality and maintainability.

4. **Implement comprehensive unit tests** (Task 14) using the dependency injection pattern to make components more testable and isolated.

5. **Implement secure YAML parsing** (Task 19) using the validation patterns shown in the Zod schema section, ensuring all YAML content is safely parsed.

6. **Optimize performance** (Task 20) by adopting the parallel processing patterns shown in the asynchronous request handling section.

7. **Implement state migration** (Task 18) using the version-aware state management pattern shown in the StateManager class.

By adopting these modern MCP server patterns and best practices, your project will benefit from improved maintainability, security, and performance while enabling seamless integration with Claude Desktop and Claude Code.


---

*Generated by Task Master Research Command*  
*Timestamp: 2026-01-04T22:00:54.780Z*
