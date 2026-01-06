/**
 * Terminal UI Manager
 * Provides DOS-style interface with fixed status bar, tree displays, and ANSI colors
 */
export declare const BOX: {
    readonly DOUBLE_TOP_LEFT: "╔";
    readonly DOUBLE_TOP_RIGHT: "╗";
    readonly DOUBLE_BOTTOM_LEFT: "╚";
    readonly DOUBLE_BOTTOM_RIGHT: "╝";
    readonly DOUBLE_HORIZONTAL: "═";
    readonly DOUBLE_VERTICAL: "║";
    readonly DOUBLE_T_DOWN: "╦";
    readonly DOUBLE_T_UP: "╩";
    readonly DOUBLE_T_RIGHT: "╠";
    readonly DOUBLE_T_LEFT: "╣";
    readonly DOUBLE_CROSS: "╬";
    readonly SINGLE_TOP_LEFT: "┌";
    readonly SINGLE_TOP_RIGHT: "┐";
    readonly SINGLE_BOTTOM_LEFT: "└";
    readonly SINGLE_BOTTOM_RIGHT: "┘";
    readonly SINGLE_HORIZONTAL: "─";
    readonly SINGLE_VERTICAL: "│";
    readonly SINGLE_T_DOWN: "┬";
    readonly SINGLE_T_UP: "┴";
    readonly SINGLE_T_RIGHT: "├";
    readonly SINGLE_T_LEFT: "┤";
    readonly SINGLE_CROSS: "┼";
    readonly TREE_BRANCH: "├";
    readonly TREE_LAST: "└";
    readonly TREE_PIPE: "│";
    readonly TREE_SPACE: " ";
    readonly PROGRESS_FULL: "█";
    readonly PROGRESS_EMPTY: "░";
    readonly PROGRESS_HALF: "▓";
    readonly PROGRESS_QUARTER: "▒";
    readonly ARROW_RIGHT: "►";
    readonly ARROW_LEFT: "◄";
    readonly ARROW_UP: "▲";
    readonly ARROW_DOWN: "▼";
    readonly BULLET: "•";
    readonly CHECK: "✓";
    readonly CROSS: "✗";
    readonly SPINNER: readonly ["◐", "◓", "◑", "◒"];
};
export declare const COLORS: {
    readonly statusBg: import("chalk").ChalkInstance;
    readonly statusFg: import("chalk").ChalkInstance;
    readonly statusHighlight: import("chalk").ChalkInstance;
    readonly header: import("chalk").ChalkInstance;
    readonly subheader: import("chalk").ChalkInstance;
    readonly progressDone: import("chalk").ChalkInstance;
    readonly progressPending: import("chalk").ChalkInstance;
    readonly progressActive: import("chalk").ChalkInstance;
    readonly tokenInput: import("chalk").ChalkInstance;
    readonly tokenOutput: import("chalk").ChalkInstance;
    readonly tokenCache: import("chalk").ChalkInstance;
    readonly success: import("chalk").ChalkInstance;
    readonly warning: import("chalk").ChalkInstance;
    readonly error: import("chalk").ChalkInstance;
    readonly info: import("chalk").ChalkInstance;
    readonly treeBranch: import("chalk").ChalkInstance;
    readonly treeFile: import("chalk").ChalkInstance;
    readonly treeDir: import("chalk").ChalkInstance;
    readonly border: import("chalk").ChalkInstance;
    readonly borderHighlight: import("chalk").ChalkInstance;
    readonly dim: import("chalk").ChalkInstance;
    readonly muted: import("chalk").ChalkInstance;
    readonly highlight: import("chalk").ChalkInstance;
};
export interface TokenUsage {
    input: number;
    output: number;
    cacheCreation: number;
    cacheRead: number;
}
export interface StepInfo {
    name: string;
    description: string;
}
export interface TerminalUIConfig {
    steps: StepInfo[];
    title?: string;
}
export interface TreeNode {
    label: string;
    type: 'file' | 'dir' | 'step' | 'task';
    status?: 'pending' | 'active' | 'done' | 'error';
    children?: TreeNode[];
    expanded?: boolean;
    details?: string;
}
export declare class TerminalUI {
    private steps;
    private title;
    private currentStep;
    private stepStartTime;
    private totalStartTime;
    private tokens;
    private progressCurrent;
    private progressTotal;
    private currentFile;
    private enabled;
    private rows;
    private cols;
    private refreshTimer;
    private spinnerFrame;
    private isActive;
    private treeNodes;
    private statusMessage;
    constructor(config: TerminalUIConfig);
    private setupScrollRegion;
    start(): void;
    stop(): void;
    private drawHeader;
    private renderStatusBar;
    private padLine;
    private formatTime;
    private formatTokens;
    nextStep(): void;
    setStep(stepIndex: number): void;
    setProgress(current: number, total: number): void;
    setCurrentFile(filePath: string): void;
    setStatusMessage(message: string): void;
    /**
     * Add tokens from an API response
     * This should be called with actual API response values, not estimates
     */
    addTokens(input: number, output: number, cacheCreation?: number, cacheRead?: number): void;
    /**
     * Set tokens directly (replaces current values)
     */
    setTokens(usage: Partial<TokenUsage>): void;
    /**
     * Get current token usage
     */
    getTokens(): TokenUsage;
    /**
     * Log a message to the content area
     */
    log(message: string): void;
    /**
     * Write content directly (no newline added)
     */
    write(text: string): void;
    private writeContent;
    startStreaming(filePath: string): void;
    streamContent(chunk: string): void;
    endStreaming(): void;
    /**
     * Display a tree structure (documents, steps, etc.)
     */
    displayTree(nodes: TreeNode[], title?: string): void;
    private renderTreeNode;
    /**
     * Draw a box around content
     */
    drawBox(title: string, content: string[], style?: 'single' | 'double'): void;
    /**
     * Show a success message
     */
    success(message: string): void;
    /**
     * Show a warning message
     */
    warn(message: string): void;
    /**
     * Show an error message
     */
    error(message: string): void;
    /**
     * Show an info message
     */
    info(message: string): void;
    /**
     * Show a stage header
     */
    stage(title: string): void;
    /**
     * Force refresh the display
     */
    refresh(): void;
}
export declare class SimpleProgress {
    private steps;
    private currentStep;
    private totalStartTime;
    private tokens;
    constructor(config: TerminalUIConfig);
    start(): void;
    stop(): void;
    nextStep(): void;
    setStep(stepIndex: number): void;
    setProgress(current: number, total: number): void;
    setCurrentFile(filePath: string): void;
    setStatusMessage(message: string): void;
    addTokens(input: number, output: number, cacheCreation?: number, cacheRead?: number): void;
    setTokens(usage: Partial<TokenUsage>): void;
    getTokens(): TokenUsage;
    log(message: string): void;
    write(text: string): void;
    startStreaming(filePath: string): void;
    streamContent(_chunk: string): void;
    endStreaming(): void;
    displayTree(nodes: TreeNode[], title?: string): void;
    drawBox(title: string, content: string[]): void;
    success(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    info(message: string): void;
    stage(title: string): void;
    refresh(): void;
}
export declare function createTerminalUI(config: TerminalUIConfig): TerminalUI | SimpleProgress;
/**
 * Create a no-op UI for debug mode (no output, no cursor movement)
 */
export declare function createNoOpUI(): TerminalUI | SimpleProgress;
export default TerminalUI;
//# sourceMappingURL=terminal-ui.d.ts.map