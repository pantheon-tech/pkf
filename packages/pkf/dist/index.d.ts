/**
 * Init Command
 * Scaffolds PKF in a new or existing project
 */
interface InitOptions {
    yes?: boolean;
    template?: 'minimal' | 'standard' | 'full';
}
declare function initCommand(options: InitOptions): Promise<void>;

/**
 * Build Command
 * Wraps pkf-processor build functionality
 */
interface BuildOptions {
    config?: string;
    output?: string;
    strict?: boolean;
}
declare function buildCommand(options: BuildOptions): Promise<void>;

/**
 * Validate Command
 * Runs all PKF validations
 */
interface ValidateOptions {
    config?: string;
    structure?: boolean;
    content?: boolean;
    fix?: boolean;
}
declare function validateCommand(options: ValidateOptions): Promise<void>;

/**
 * Status Command
 * Shows PKF status in current project
 */
declare function statusCommand(): Promise<void>;

export { buildCommand, initCommand, statusCommand, validateCommand };
