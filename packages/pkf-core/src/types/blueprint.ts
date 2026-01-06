/**
 * Blueprint parsing and summary interfaces
 * @packageDocumentation
 */

/**
 * Parsed PKF blueprint structure
 */
export interface ParsedBlueprint {
  /** Analysis summary */
  analysisSummary: AnalysisSummary;
  /** Discovered documents */
  discoveredDocuments: DocumentEntry[];
  /** Recommended directory structure */
  recommendedStructure: DirectoryStructure;
  /** Recommended document types */
  recommendedTypes: SchemaType[];
  /** Migration plan */
  migrationPlan: MigrationPlan;
  /** Warnings */
  warnings: Warning[];
}

/**
 * Analysis summary from blueprint
 */
export interface AnalysisSummary {
  /** Total documents found */
  totalDocuments: number;
  /** Documents with existing frontmatter */
  withFrontmatter: number;
  /** Migration complexity breakdown */
  migrationComplexity: {
    low: number;
    medium: number;
    high: number;
  };
}

/**
 * Document entry in blueprint
 */
export interface DocumentEntry {
  /** Document path relative to project root */
  path: string;
  /** Document type */
  type: string;
  /** Document title */
  title?: string;
  /** Whether document has frontmatter */
  hasFrontmatter: boolean;
  /** Document complexity assessment */
  complexity: 'simple' | 'medium' | 'complex';
  /** Migration effort required */
  migrationEffort: 'low' | 'medium' | 'high';
}

/**
 * Recommended directory structure
 */
export interface DirectoryStructure {
  /** Documentation root directory */
  docsRoot: string;
  /** Directories to create */
  directories: DirectoryEntry[];
}

/**
 * Directory entry in recommended structure
 */
export interface DirectoryEntry {
  /** Directory path relative to project root */
  path: string;
  /** Purpose of this directory */
  purpose?: string;
}

/**
 * Recommended schema type
 */
export interface SchemaType {
  /** Schema name */
  name: string;
  /** Schema description */
  description?: string;
  /** Number of documents using this type */
  count?: number;
}

/**
 * Migration plan
 */
export interface MigrationPlan {
  /** Migration phases */
  phases: MigrationPhase[];
  /** Total estimated time */
  estimatedTime?: string;
}

/**
 * Migration phase
 */
export interface MigrationPhase {
  /** Phase number */
  phase: number;
  /** Phase name */
  name: string;
  /** Phase description */
  description?: string;
  /** Document types in this phase */
  documentTypes: string[];
}

/**
 * Warning from blueprint analysis
 */
export interface Warning {
  /** Warning type */
  type: string;
  /** Warning message */
  message: string;
  /** Severity level */
  severity?: 'low' | 'medium' | 'high';
}

/**
 * Blueprint summary for display
 */
export interface BlueprintSummary {
  /** Total documents */
  totalDocuments: number;
  /** Documents with frontmatter */
  withFrontmatter: number;
  /** Document types with counts */
  documentTypes: Map<string, number>;
  /** Overall migration complexity */
  migrationComplexity: 'low' | 'medium' | 'high';
  /** Warnings */
  warnings: string[];
}
