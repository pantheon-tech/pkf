/**
 * PKF Init Command
 * Main initialization command with all CLI flags
 */
import { Command } from 'commander';
import type { InitOptions } from '../types/index.js';
/**
 * Create the init command with all flags
 */
export declare const initCommand: Command;
/**
 * Run the init command
 * @param options - CLI options
 */
export declare function runInit(options: InitOptions): Promise<void>;
//# sourceMappingURL=init.d.ts.map