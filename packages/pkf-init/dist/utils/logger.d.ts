/**
 * PKF Init Logger
 * Centralized logging with colors and formatting
 */
/**
 * Set verbose mode
 */
export declare function setVerbose(verbose: boolean): void;
/**
 * Check if verbose mode is enabled
 */
export declare function isVerbose(): boolean;
/**
 * Log debug message (only in verbose mode)
 */
export declare function debug(message: string, ...args: unknown[]): void;
/**
 * Log info message
 */
export declare function info(message: string, ...args: unknown[]): void;
/**
 * Log success message
 */
export declare function success(message: string, ...args: unknown[]): void;
/**
 * Log warning message
 */
export declare function warn(message: string, ...args: unknown[]): void;
/**
 * Log error message
 */
export declare function error(message: string, ...args: unknown[]): void;
/**
 * Log a stage header
 */
export declare function stage(name: string): void;
/**
 * Log a substep
 */
export declare function step(message: string): void;
/**
 * Log cost information
 */
export declare function cost(amount: number, description?: string): void;
/**
 * Log token usage
 */
export declare function tokens(count: number, description?: string): void;
/**
 * Create a logger instance with a prefix
 */
export declare function createLogger(prefix: string): {
    debug: (msg: string, ...args: unknown[]) => void;
    info: (msg: string, ...args: unknown[]) => void;
    success: (msg: string, ...args: unknown[]) => void;
    warn: (msg: string, ...args: unknown[]) => void;
    error: (msg: string, ...args: unknown[]) => void;
    step: (msg: string) => void;
};
/**
 * Start streaming mode - shows agent output as it arrives
 * @param label - Label to show before streaming content
 */
export declare function startStreaming(label?: string): void;
/**
 * Write streaming text chunk
 * @param text - Text chunk to write
 */
export declare function streamText(text: string): void;
/**
 * End streaming mode
 */
export declare function endStreaming(): void;
/**
 * Get the full streamed content
 */
export declare function getStreamBuffer(): string;
/**
 * Check if streaming is active
 */
export declare function isStreaming(): boolean;
/**
 * Create a callback for streaming text output
 */
export declare function createStreamCallback(label?: string): (text: string) => void;
/**
 * Default export - object with all logger functions
 */
declare const _default: {
    setVerbose: typeof setVerbose;
    isVerbose: typeof isVerbose;
    debug: typeof debug;
    info: typeof info;
    success: typeof success;
    warn: typeof warn;
    error: typeof error;
    stage: typeof stage;
    step: typeof step;
    cost: typeof cost;
    tokens: typeof tokens;
    createLogger: typeof createLogger;
    startStreaming: typeof startStreaming;
    streamText: typeof streamText;
    endStreaming: typeof endStreaming;
    getStreamBuffer: typeof getStreamBuffer;
    isStreaming: typeof isStreaming;
    createStreamCallback: typeof createStreamCallback;
};
export default _default;
//# sourceMappingURL=logger.d.ts.map