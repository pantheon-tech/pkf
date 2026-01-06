/**
 * PKF Init Time Estimator and Dry Run Report
 * Utilities for estimating workflow time and generating dry-run reports
 */
import type { DryRunEstimate, LoadedConfig } from '../types/index.js';
/**
 * Static utility class for estimating workflow time
 */
export declare class TimeEstimator {
    /**
     * Estimate analysis time in minutes
     * Formula: base + (fileCount * 0.1) - more files take longer to scan
     * @param fileCount - Number of files to analyze
     * @returns Estimated time in minutes
     */
    static estimateAnalysis(fileCount: number): number;
    /**
     * Estimate schema design time
     * @param complexity - Project complexity level
     * @returns Estimated time in minutes
     */
    static estimateDesign(complexity: 'low' | 'medium' | 'high'): number;
    /**
     * Estimate migration time
     * Formula: (docCount * basePerDoc) / workers
     * @param docCount - Number of documents to migrate
     * @param workers - Number of parallel workers
     * @returns Estimated time in minutes
     */
    static estimateMigration(docCount: number, workers: number): number;
    /**
     * Estimate total time breakdown by stage
     * @param options - Estimation options
     * @returns Time breakdown by stage in minutes
     */
    static estimateTotal(options: {
        fileCount: number;
        docCount: number;
        complexity: 'low' | 'medium' | 'high';
        workers: number;
    }): DryRunEstimate['timeBreakdown'];
}
/**
 * Generates and displays dry-run reports
 */
export declare class DryRunReport {
    private config;
    private client;
    /**
     * Create a new DryRunReport
     * @param config - Loaded configuration
     * @param apiKey - Optional API key for accurate token counting
     */
    constructor(config: LoadedConfig, apiKey?: string);
    /**
     * Count tokens using the API (more accurate than heuristics)
     * Falls back to heuristic if API unavailable
     * @param content - Content to count tokens for
     * @param model - Model to count for
     * @returns Token count
     */
    private countTokens;
    /**
     * Count tokens for a file
     * @param filePath - Path to file
     * @returns Token count
     */
    private countFileTokens;
    /**
     * Calculate cost for given token usage
     */
    private calculateCost;
    /**
     * Estimate average document size in tokens (heuristic fallback)
     */
    private estimateDocSize;
    /**
     * Calculate actual document tokens if API is available
     * @param markdownFiles - List of markdown file paths
     * @returns Total tokens across all documents
     */
    private calculateActualDocTokens;
    /**
     * Determine project complexity based on file count and structure
     */
    private determineComplexity;
    /**
     * Extract document type from file path (use parent directory name)
     */
    private getDocType;
    /**
     * Analyze project and generate estimate
     * @param rootDir - Root directory to analyze
     * @returns Dry run estimate
     */
    analyze(rootDir: string): Promise<DryRunEstimate>;
    /**
     * Format cost as USD string
     */
    private formatCost;
    /**
     * Format time in minutes/seconds
     */
    private formatTime;
    /**
     * Display formatted report to console
     * @param estimate - The dry run estimate to display
     */
    displayReport(estimate: DryRunEstimate): void;
}
export default TimeEstimator;
//# sourceMappingURL=time-estimator.d.ts.map