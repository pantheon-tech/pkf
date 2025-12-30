/**
 * PKF Init Logger
 * Centralized logging with colors and formatting
 */
import chalk from 'chalk';
let verboseMode = false;
let streamingMode = false;
let streamBuffer = '';
/**
 * Set verbose mode
 */
export function setVerbose(verbose) {
    verboseMode = verbose;
}
/**
 * Check if verbose mode is enabled
 */
export function isVerbose() {
    return verboseMode;
}
/**
 * Log debug message (only in verbose mode)
 */
export function debug(message, ...args) {
    if (verboseMode) {
        console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
}
/**
 * Log info message
 */
export function info(message, ...args) {
    console.log(chalk.blue(`[INFO] ${message}`), ...args);
}
/**
 * Log success message
 */
export function success(message, ...args) {
    console.log(chalk.green(`[SUCCESS] ${message}`), ...args);
}
/**
 * Log warning message
 */
export function warn(message, ...args) {
    console.log(chalk.yellow(`[WARN] ${message}`), ...args);
}
/**
 * Log error message
 */
export function error(message, ...args) {
    console.error(chalk.red(`[ERROR] ${message}`), ...args);
}
/**
 * Log a stage header
 */
export function stage(name) {
    console.log('');
    console.log(chalk.cyan.bold(`═══ ${name} ═══`));
    console.log('');
}
/**
 * Log a substep
 */
export function step(message) {
    console.log(chalk.white(`  → ${message}`));
}
/**
 * Log cost information
 */
export function cost(amount, description) {
    const formatted = `$${amount.toFixed(4)}`;
    const msg = description ? `${description}: ${formatted}` : formatted;
    console.log(chalk.magenta(`[COST] ${msg}`));
}
/**
 * Log token usage
 */
export function tokens(count, description) {
    const formatted = count.toLocaleString();
    const msg = description ? `${description}: ${formatted} tokens` : `${formatted} tokens`;
    console.log(chalk.cyan(`[TOKENS] ${msg}`));
}
/**
 * Create a logger instance with a prefix
 */
export function createLogger(prefix) {
    return {
        debug: (msg, ...args) => debug(`[${prefix}] ${msg}`, ...args),
        info: (msg, ...args) => info(`[${prefix}] ${msg}`, ...args),
        success: (msg, ...args) => success(`[${prefix}] ${msg}`, ...args),
        warn: (msg, ...args) => warn(`[${prefix}] ${msg}`, ...args),
        error: (msg, ...args) => error(`[${prefix}] ${msg}`, ...args),
        step: (msg) => step(`[${prefix}] ${msg}`),
    };
}
/**
 * Start streaming mode - shows agent output as it arrives
 * @param label - Label to show before streaming content
 */
export function startStreaming(label) {
    streamingMode = true;
    streamBuffer = '';
    if (label) {
        console.log();
        console.log(chalk.dim(`┌─ ${label} ─────────────────────────────────`));
        console.log(chalk.dim('│'));
    }
}
/**
 * Write streaming text chunk
 * @param text - Text chunk to write
 */
export function streamText(text) {
    if (!streamingMode)
        return;
    streamBuffer += text;
    // Write text with line prefix for multi-line content
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (i === lines.length - 1 && lines[i] === '') {
            // Don't print empty trailing line
            continue;
        }
        if (i > 0) {
            // New line - add prefix
            process.stdout.write('\n' + chalk.dim('│ '));
        }
        process.stdout.write(chalk.white(lines[i]));
    }
}
/**
 * End streaming mode
 */
export function endStreaming() {
    if (!streamingMode)
        return;
    streamingMode = false;
    console.log();
    console.log(chalk.dim('│'));
    console.log(chalk.dim('└──────────────────────────────────────────────'));
    console.log();
}
/**
 * Get the full streamed content
 */
export function getStreamBuffer() {
    return streamBuffer;
}
/**
 * Check if streaming is active
 */
export function isStreaming() {
    return streamingMode;
}
/**
 * Create a stream callback function for the orchestrator
 * @param label - Optional label for the stream
 * @returns Callback function
 */
export function createStreamCallback(label) {
    let started = false;
    return (text) => {
        if (!started) {
            startStreaming(label);
            started = true;
        }
        streamText(text);
    };
}
export default {
    debug,
    info,
    success,
    warn,
    error,
    stage,
    step,
    cost,
    tokens,
    setVerbose,
    isVerbose,
    createLogger,
    startStreaming,
    streamText,
    endStreaming,
    getStreamBuffer,
    isStreaming,
    createStreamCallback,
};
//# sourceMappingURL=logger.js.map