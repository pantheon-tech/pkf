/**
 * Performance benchmarking utility
 * Measures and tracks performance of key operations
 */
/**
 * Performance measurement result
 */
export interface PerformanceMeasurement {
    /** Operation name */
    operation: string;
    /** Duration in milliseconds */
    durationMs: number;
    /** Memory delta in MB */
    memoryDeltaMb: number;
    /** Peak memory usage in MB */
    peakMemoryMb: number;
    /** Timestamp when operation started */
    timestamp: Date;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Performance benchmark summary
 */
export interface BenchmarkSummary {
    /** Total execution time in milliseconds */
    totalDurationMs: number;
    /** Peak memory usage in MB */
    peakMemoryMb: number;
    /** Average memory usage in MB */
    avgMemoryMb: number;
    /** Individual measurements */
    measurements: PerformanceMeasurement[];
    /** System information */
    system: {
        platform: string;
        cpus: number;
        totalMemoryMb: number;
        freeMemoryMb: number;
    };
}
/**
 * Performance benchmark tracker
 */
export declare class PerformanceBenchmark {
    private measurements;
    private activeOperations;
    private peakMemory;
    /**
     * Get current memory usage in MB
     */
    private getMemoryUsageMb;
    /**
     * Start measuring an operation
     * @param operation - Name of the operation
     */
    start(operation: string): void;
    /**
     * End measuring an operation
     * @param operation - Name of the operation
     * @param metadata - Optional metadata about the operation
     */
    end(operation: string, metadata?: Record<string, unknown>): PerformanceMeasurement | null;
    /**
     * Measure an async operation
     * @param operation - Name of the operation
     * @param fn - Async function to measure
     * @param metadata - Optional metadata
     * @returns Result of the function
     */
    measure<T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T>;
    /**
     * Measure a synchronous operation
     * @param operation - Name of the operation
     * @param fn - Function to measure
     * @param metadata - Optional metadata
     * @returns Result of the function
     */
    measureSync<T>(operation: string, fn: () => T, metadata?: Record<string, unknown>): T;
    /**
     * Get all measurements
     */
    getMeasurements(): PerformanceMeasurement[];
    /**
     * Get summary of all benchmarks
     */
    getSummary(): BenchmarkSummary;
    /**
     * Format summary as readable text
     */
    formatSummary(): string;
    /**
     * Clear all measurements
     */
    clear(): void;
    /**
     * Export measurements as JSON
     */
    toJSON(): BenchmarkSummary;
}
export default PerformanceBenchmark;
//# sourceMappingURL=performance-benchmark.d.ts.map