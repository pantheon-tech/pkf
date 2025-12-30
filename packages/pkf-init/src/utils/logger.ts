/**
 * PKF Init Logger
 * Centralized logging with colors and formatting
 */

import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let verboseMode = false;
let streamingMode = false;
let streamBuffer = '';

/**
 * Set verbose mode
 */
export function setVerbose(verbose: boolean): void {
  verboseMode = verbose;
}

/**
 * Check if verbose mode is enabled
 */
export function isVerbose(): boolean {
  return verboseMode;
}

/**
 * Log debug message (only in verbose mode)
 */
export function debug(message: string, ...args: unknown[]): void {
  if (verboseMode) {
    console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
  }
}

/**
 * Log info message
 */
export function info(message: string, ...args: unknown[]): void {
  console.log(chalk.blue(`[INFO] ${message}`), ...args);
}

/**
 * Log success message
 */
export function success(message: string, ...args: unknown[]): void {
  console.log(chalk.green(`[SUCCESS] ${message}`), ...args);
}

/**
 * Log warning message
 */
export function warn(message: string, ...args: unknown[]): void {
  console.log(chalk.yellow(`[WARN] ${message}`), ...args);
}

/**
 * Log error message
 */
export function error(message: string, ...args: unknown[]): void {
  console.error(chalk.red(`[ERROR] ${message}`), ...args);
}

/**
 * Log a stage header
 */
export function stage(name: string): void {
  console.log('');
  console.log(chalk.cyan.bold(`═══ ${name} ═══`));
  console.log('');
}

/**
 * Log a substep
 */
export function step(message: string): void {
  console.log(chalk.white(`  → ${message}`));
}

/**
 * Log cost information
 */
export function cost(amount: number, description?: string): void {
  const formatted = `$${amount.toFixed(4)}`;
  const msg = description ? `${description}: ${formatted}` : formatted;
  console.log(chalk.magenta(`[COST] ${msg}`));
}

/**
 * Log token usage
 */
export function tokens(count: number, description?: string): void {
  const formatted = count.toLocaleString();
  const msg = description ? `${description}: ${formatted} tokens` : `${formatted} tokens`;
  console.log(chalk.cyan(`[TOKENS] ${msg}`));
}

/**
 * Create a logger instance with a prefix
 */
export function createLogger(prefix: string) {
  return {
    debug: (msg: string, ...args: unknown[]) => debug(`[${prefix}] ${msg}`, ...args),
    info: (msg: string, ...args: unknown[]) => info(`[${prefix}] ${msg}`, ...args),
    success: (msg: string, ...args: unknown[]) => success(`[${prefix}] ${msg}`, ...args),
    warn: (msg: string, ...args: unknown[]) => warn(`[${prefix}] ${msg}`, ...args),
    error: (msg: string, ...args: unknown[]) => error(`[${prefix}] ${msg}`, ...args),
    step: (msg: string) => step(`[${prefix}] ${msg}`),
  };
}

/**
 * Start streaming mode - shows agent output as it arrives
 * @param label - Label to show before streaming content
 */
export function startStreaming(label?: string): void {
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
export function streamText(text: string): void {
  if (!streamingMode) return;

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
export function endStreaming(): void {
  if (!streamingMode) return;

  streamingMode = false;
  console.log();
  console.log(chalk.dim('│'));
  console.log(chalk.dim('└──────────────────────────────────────────────'));
  console.log();
}

/**
 * Get the full streamed content
 */
export function getStreamBuffer(): string {
  return streamBuffer;
}

/**
 * Check if streaming is active
 */
export function isStreaming(): boolean {
  return streamingMode;
}

/**
 * Create a stream callback function for the orchestrator
 * @param label - Optional label for the stream
 * @returns Callback function
 */
export function createStreamCallback(label?: string): (text: string) => void {
  let started = false;
  return (text: string) => {
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
