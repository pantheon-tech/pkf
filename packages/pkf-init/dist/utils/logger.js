/**
 * PKF Init Logger
 * Centralized logging with colors and formatting
 */
import chalk from 'chalk';
let verboseMode = false;
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
};
//# sourceMappingURL=logger.js.map