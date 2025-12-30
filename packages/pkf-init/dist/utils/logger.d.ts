/**
 * PKF Init Logger
 * Centralized logging with colors and formatting
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
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
declare const _default: {
    debug: typeof debug;
    info: typeof info;
    success: typeof success;
    warn: typeof warn;
    error: typeof error;
    stage: typeof stage;
    step: typeof step;
    cost: typeof cost;
    tokens: typeof tokens;
    setVerbose: typeof setVerbose;
    isVerbose: typeof isVerbose;
    createLogger: typeof createLogger;
};
export default _default;
//# sourceMappingURL=logger.d.ts.map