/**
 * PKF Init Register Initializer
 * Creates the standard register files (TODO, ISSUES, CHANGELOG)
 */
/**
 * Result of register initialization
 */
export interface InitializedRegisters {
    /** Register files that were created */
    created: string[];
    /** Register files that already existed */
    existing: string[];
}
/**
 * RegisterInitializer - Creates PKF register files
 */
export declare class RegisterInitializer {
    private registersDir;
    /**
     * Create a new RegisterInitializer
     * @param registersDir - Directory where registers should be created
     */
    constructor(registersDir: string);
    /**
     * Initialize all register files
     * @returns Information about created and existing files
     */
    initialize(): Promise<InitializedRegisters>;
    /**
     * Get current date in YYYY-MM-DD format
     * @returns Formatted date string
     */
    private getDate;
    /**
     * Create TODO.md content
     * @returns TODO.md template content
     */
    private createTodo;
    /**
     * Create ISSUES.md content
     * @returns ISSUES.md template content
     */
    private createIssues;
    /**
     * Create CHANGELOG.md content
     * @returns CHANGELOG.md template content
     */
    private createChangelog;
}
//# sourceMappingURL=registers.d.ts.map