/**
 * Document scanning interfaces
 * @packageDocumentation
 */
import type { PKFDocument } from './core.js';
/**
 * Scanner configuration options
 */
export interface ScannerOptions {
    /** Root directory to scan */
    rootDir: string;
    /** Glob patterns to include (default: ['**\/*.md']) */
    patterns?: string[];
    /** Patterns to exclude (default: common build dirs) */
    excludePatterns?: string[];
    /** Include hidden files (default: false) */
    includeHidden?: boolean;
    /** Maximum directory depth (default: unlimited) */
    maxDepth?: number;
    /** Load file content during scan (default: false) */
    loadContent?: boolean;
}
/**
 * Scan result with discovered documents
 */
export interface ScanResult {
    /** Discovered documents */
    documents: PKFDocument[];
    /** Total files scanned */
    totalScanned: number;
    /** Scan errors encountered */
    errors: ScanError[];
}
/**
 * Error encountered during scanning
 */
export interface ScanError {
    /** File path that caused error */
    path: string;
    /** Error message */
    message: string;
    /** Error code */
    code?: string;
}
/**
 * Document scanner interface
 */
export interface IDocumentScanner {
    /** Scan directory for documents */
    scan(options?: Partial<ScannerOptions>): Promise<ScanResult>;
    /** Scan a single file */
    scanFile(filePath: string): Promise<PKFDocument | null>;
}
//# sourceMappingURL=scanner.d.ts.map