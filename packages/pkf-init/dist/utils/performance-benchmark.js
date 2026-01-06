/**
 * Performance benchmarking utility
 * Measures and tracks performance of key operations
 */
import * as os from 'os';
/**
 * Performance benchmark tracker
 */
export class PerformanceBenchmark {
    measurements = [];
    activeOperations = new Map();
    peakMemory = 0;
    /**
     * Get current memory usage in MB
     */
    getMemoryUsageMb() {
        const usage = process.memoryUsage();
        return usage.heapUsed / 1024 / 1024;
    }
    /**
     * Start measuring an operation
     * @param operation - Name of the operation
     */
    start(operation) {
        const now = performance.now();
        const memNow = this.getMemoryUsageMb();
        this.activeOperations.set(operation, {
            start: now,
            memStart: memNow,
        });
    }
    /**
     * End measuring an operation
     * @param operation - Name of the operation
     * @param metadata - Optional metadata about the operation
     */
    end(operation, metadata) {
        const active = this.activeOperations.get(operation);
        if (!active) {
            return null;
        }
        const now = performance.now();
        const memNow = this.getMemoryUsageMb();
        const durationMs = now - active.start;
        const memoryDeltaMb = memNow - active.memStart;
        // Track peak memory
        if (memNow > this.peakMemory) {
            this.peakMemory = memNow;
        }
        const measurement = {
            operation,
            durationMs,
            memoryDeltaMb,
            peakMemoryMb: this.peakMemory,
            timestamp: new Date(),
            metadata,
        };
        this.measurements.push(measurement);
        this.activeOperations.delete(operation);
        return measurement;
    }
    /**
     * Measure an async operation
     * @param operation - Name of the operation
     * @param fn - Async function to measure
     * @param metadata - Optional metadata
     * @returns Result of the function
     */
    async measure(operation, fn, metadata) {
        this.start(operation);
        try {
            const result = await fn();
            this.end(operation, metadata);
            return result;
        }
        catch (error) {
            this.end(operation, { ...metadata, error: true });
            throw error;
        }
    }
    /**
     * Measure a synchronous operation
     * @param operation - Name of the operation
     * @param fn - Function to measure
     * @param metadata - Optional metadata
     * @returns Result of the function
     */
    measureSync(operation, fn, metadata) {
        this.start(operation);
        try {
            const result = fn();
            this.end(operation, metadata);
            return result;
        }
        catch (error) {
            this.end(operation, { ...metadata, error: true });
            throw error;
        }
    }
    /**
     * Get all measurements
     */
    getMeasurements() {
        return [...this.measurements];
    }
    /**
     * Get summary of all benchmarks
     */
    getSummary() {
        const totalDurationMs = this.measurements.reduce((sum, m) => sum + m.durationMs, 0);
        const avgMemoryMb = this.measurements.length > 0
            ? this.measurements.reduce((sum, m) => sum + m.peakMemoryMb, 0) /
                this.measurements.length
            : 0;
        return {
            totalDurationMs,
            peakMemoryMb: this.peakMemory,
            avgMemoryMb,
            measurements: this.measurements,
            system: {
                platform: os.platform(),
                cpus: os.cpus().length,
                totalMemoryMb: os.totalmem() / 1024 / 1024,
                freeMemoryMb: os.freemem() / 1024 / 1024,
            },
        };
    }
    /**
     * Format summary as readable text
     */
    formatSummary() {
        const summary = this.getSummary();
        const lines = [];
        lines.push('Performance Benchmark Summary');
        lines.push('============================');
        lines.push('');
        lines.push(`Total Duration: ${summary.totalDurationMs.toFixed(2)}ms`);
        lines.push(`Peak Memory: ${summary.peakMemoryMb.toFixed(2)}MB`);
        lines.push(`Average Memory: ${summary.avgMemoryMb.toFixed(2)}MB`);
        lines.push('');
        lines.push('System Information:');
        lines.push(`  Platform: ${summary.system.platform}`);
        lines.push(`  CPUs: ${summary.system.cpus}`);
        lines.push(`  Total Memory: ${summary.system.totalMemoryMb.toFixed(2)}MB`);
        lines.push(`  Free Memory: ${summary.system.freeMemoryMb.toFixed(2)}MB`);
        lines.push('');
        lines.push('Measurements:');
        lines.push('');
        for (const measurement of summary.measurements) {
            lines.push(`${measurement.operation}:`);
            lines.push(`  Duration: ${measurement.durationMs.toFixed(2)}ms`);
            lines.push(`  Memory Delta: ${measurement.memoryDeltaMb.toFixed(2)}MB`);
            lines.push(`  Peak Memory: ${measurement.peakMemoryMb.toFixed(2)}MB`);
            if (measurement.metadata && Object.keys(measurement.metadata).length > 0) {
                lines.push(`  Metadata: ${JSON.stringify(measurement.metadata)}`);
            }
            lines.push('');
        }
        return lines.join('\n');
    }
    /**
     * Clear all measurements
     */
    clear() {
        this.measurements = [];
        this.activeOperations.clear();
        this.peakMemory = 0;
    }
    /**
     * Export measurements as JSON
     */
    toJSON() {
        return this.getSummary();
    }
}
export default PerformanceBenchmark;
//# sourceMappingURL=performance-benchmark.js.map