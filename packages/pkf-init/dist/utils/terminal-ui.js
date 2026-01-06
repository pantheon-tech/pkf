/**
 * Terminal UI Manager
 * Provides DOS-style interface with fixed status bar, tree displays, and ANSI colors
 */
/* eslint-disable no-control-regex -- ANSI escape sequences are intentional */
import chalk from 'chalk';
// ═══════════════════════════════════════════════════════════════════════════════
// DOS-Style Box Drawing Characters
// ═══════════════════════════════════════════════════════════════════════════════
export const BOX = {
    // Double line box (for main borders)
    DOUBLE_TOP_LEFT: '╔',
    DOUBLE_TOP_RIGHT: '╗',
    DOUBLE_BOTTOM_LEFT: '╚',
    DOUBLE_BOTTOM_RIGHT: '╝',
    DOUBLE_HORIZONTAL: '═',
    DOUBLE_VERTICAL: '║',
    DOUBLE_T_DOWN: '╦',
    DOUBLE_T_UP: '╩',
    DOUBLE_T_RIGHT: '╠',
    DOUBLE_T_LEFT: '╣',
    DOUBLE_CROSS: '╬',
    // Single line box (for inner sections)
    SINGLE_TOP_LEFT: '┌',
    SINGLE_TOP_RIGHT: '┐',
    SINGLE_BOTTOM_LEFT: '└',
    SINGLE_BOTTOM_RIGHT: '┘',
    SINGLE_HORIZONTAL: '─',
    SINGLE_VERTICAL: '│',
    SINGLE_T_DOWN: '┬',
    SINGLE_T_UP: '┴',
    SINGLE_T_RIGHT: '├',
    SINGLE_T_LEFT: '┤',
    SINGLE_CROSS: '┼',
    // Tree connectors
    TREE_BRANCH: '├',
    TREE_LAST: '└',
    TREE_PIPE: '│',
    TREE_SPACE: ' ',
    // Progress bar
    PROGRESS_FULL: '█',
    PROGRESS_EMPTY: '░',
    PROGRESS_HALF: '▓',
    PROGRESS_QUARTER: '▒',
    // Arrows and indicators
    ARROW_RIGHT: '►',
    ARROW_LEFT: '◄',
    ARROW_UP: '▲',
    ARROW_DOWN: '▼',
    BULLET: '•',
    CHECK: '✓',
    CROSS: '✗',
    SPINNER: ['◐', '◓', '◑', '◒'],
};
// ═══════════════════════════════════════════════════════════════════════════════
// Color Theme
// ═══════════════════════════════════════════════════════════════════════════════
export const COLORS = {
    // Status bar
    statusBg: chalk.bgBlue,
    statusFg: chalk.white.bold,
    statusHighlight: chalk.yellow.bold,
    // Headers
    header: chalk.cyan.bold,
    subheader: chalk.cyan,
    // Progress
    progressDone: chalk.green,
    progressPending: chalk.gray,
    progressActive: chalk.yellow,
    // Tokens
    tokenInput: chalk.blue,
    tokenOutput: chalk.green,
    tokenCache: chalk.magenta,
    // Status indicators
    success: chalk.green.bold,
    warning: chalk.yellow.bold,
    error: chalk.red.bold,
    info: chalk.blue,
    // Tree
    treeBranch: chalk.gray,
    treeFile: chalk.white,
    treeDir: chalk.cyan,
    // Borders
    border: chalk.gray,
    borderHighlight: chalk.cyan,
    // Text
    dim: chalk.dim,
    muted: chalk.gray,
    highlight: chalk.yellow,
};
// ═══════════════════════════════════════════════════════════════════════════════
// Terminal UI Class
// ═══════════════════════════════════════════════════════════════════════════════
export class TerminalUI {
    steps;
    title;
    currentStep = 0;
    stepStartTime = Date.now();
    totalStartTime = Date.now();
    tokens = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 };
    progressCurrent = 0;
    progressTotal = 0;
    currentFile = '';
    enabled = true;
    rows = 24;
    cols = 80;
    refreshTimer = null;
    spinnerFrame = 0;
    isActive = false;
    treeNodes = [];
    statusMessage = '';
    constructor(config) {
        this.steps = config.steps;
        this.title = config.title || 'PKF Init';
        // Check if we're in a TTY
        this.enabled = process.stdout.isTTY ?? false;
        if (this.enabled) {
            this.rows = process.stdout.rows || 24;
            this.cols = process.stdout.columns || 80;
            // Listen for terminal resize
            process.stdout.on('resize', () => {
                this.rows = process.stdout.rows || 24;
                this.cols = process.stdout.columns || 80;
                if (this.isActive) {
                    this.setupScrollRegion();
                    this.renderStatusBar();
                }
            });
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Scroll Region Management
    // ═══════════════════════════════════════════════════════════════════════════
    setupScrollRegion() {
        if (!this.enabled)
            return;
        // Reserve 2 rows at bottom for status bar
        const statusHeight = 2;
        const contentHeight = this.rows - statusHeight;
        // Set scroll region: rows 1 to (rows - statusHeight)
        process.stdout.write(`\x1B[1;${contentHeight}r`);
        process.stdout.write('\x1B[1;1H');
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Start/Stop Methods
    // ═══════════════════════════════════════════════════════════════════════════
    start() {
        if (!this.enabled)
            return;
        this.isActive = true;
        this.totalStartTime = Date.now();
        this.stepStartTime = Date.now();
        // Hide cursor
        process.stdout.write('\x1B[?25l');
        // Clear screen
        process.stdout.write('\x1B[2J');
        // Setup scroll region
        this.setupScrollRegion();
        // Draw initial header
        this.drawHeader();
        // Render initial status bar
        this.renderStatusBar();
        // Position cursor at top of content area
        process.stdout.write('\x1B[3;1H');
        // Start refresh timer (updates every 100ms for spinner, 1s for time)
        this.refreshTimer = setInterval(() => {
            this.spinnerFrame = (this.spinnerFrame + 1) % BOX.SPINNER.length;
            this.renderStatusBar();
        }, 100);
    }
    stop() {
        if (!this.enabled)
            return;
        this.isActive = false;
        // Stop refresh timer
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        // Reset scroll region to full screen
        process.stdout.write('\x1B[r');
        // Move cursor below status bar
        process.stdout.write(`\x1B[${this.rows};1H`);
        // Clear the status bar lines
        process.stdout.write('\x1B[2K\x1B[1A\x1B[2K');
        // Show cursor
        process.stdout.write('\x1B[?25h');
        // Final newline
        console.log('');
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Header Drawing
    // ═══════════════════════════════════════════════════════════════════════════
    drawHeader() {
        if (!this.enabled)
            return;
        const width = this.cols;
        const title = ` ${this.title} `;
        const padding = Math.floor((width - title.length - 2) / 2);
        // Save cursor
        process.stdout.write('\x1B[s');
        // Move to top
        process.stdout.write('\x1B[1;1H');
        // Draw double-line box top
        const topLine = COLORS.borderHighlight(BOX.DOUBLE_TOP_LEFT +
            BOX.DOUBLE_HORIZONTAL.repeat(padding) +
            COLORS.header(title) +
            COLORS.borderHighlight(BOX.DOUBLE_HORIZONTAL.repeat(width - padding - title.length - 2) +
                BOX.DOUBLE_TOP_RIGHT));
        process.stdout.write(topLine);
        // Restore cursor
        process.stdout.write('\x1B[u');
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Status Bar Rendering
    // ═══════════════════════════════════════════════════════════════════════════
    renderStatusBar() {
        if (!this.enabled || !this.isActive)
            return;
        const width = this.cols;
        const now = Date.now();
        // Calculate times
        const stepElapsed = this.formatTime(now - this.stepStartTime);
        const totalElapsed = this.formatTime(now - this.totalStartTime);
        // Get current step
        const step = this.steps[this.currentStep] || { name: 'Idle', description: '' };
        const spinner = this.progressTotal > 0 || this.currentFile
            ? BOX.SPINNER[this.spinnerFrame]
            : BOX.BULLET;
        // Build status bar line 1: Progress and timing
        const stepLabel = `${spinner} Step ${this.currentStep + 1}/${this.steps.length}: ${step.name}`;
        let progressStr = '';
        if (this.progressTotal > 0) {
            const pct = Math.round((this.progressCurrent / this.progressTotal) * 100);
            const barWidth = 15;
            const filled = Math.round((pct / 100) * barWidth);
            const bar = BOX.PROGRESS_FULL.repeat(filled) + BOX.PROGRESS_EMPTY.repeat(barWidth - filled);
            progressStr = ` ${COLORS.progressDone(bar)} ${pct}%`;
        }
        const timeStr = ` ${BOX.SINGLE_VERTICAL} ${COLORS.dim('Step:')} ${stepElapsed} ${BOX.SINGLE_VERTICAL} ${COLORS.dim('Total:')} ${totalElapsed}`;
        // Build status bar line 2: Tokens and current file
        const inputTokens = this.formatTokens(this.tokens.input);
        const outputTokens = this.formatTokens(this.tokens.output);
        const cacheRead = this.tokens.cacheRead > 0 ? ` ${COLORS.tokenCache(`⚡${this.formatTokens(this.tokens.cacheRead)}`)}` : '';
        const cacheWrite = this.tokens.cacheCreation > 0 ? ` ${COLORS.tokenCache(`💾${this.formatTokens(this.tokens.cacheCreation)}`)}` : '';
        const tokenStr = `${COLORS.tokenInput(`↓${inputTokens}`)} ${COLORS.tokenOutput(`↑${outputTokens}`)}${cacheRead}${cacheWrite}`;
        let fileStr = '';
        if (this.currentFile) {
            const shortPath = this.currentFile.split('/').slice(-2).join('/');
            const maxLen = Math.max(20, width - 50);
            fileStr = ` ${BOX.SINGLE_VERTICAL} ${COLORS.highlight(shortPath.slice(0, maxLen))}`;
        }
        else if (this.statusMessage) {
            fileStr = ` ${BOX.SINGLE_VERTICAL} ${COLORS.info(this.statusMessage.slice(0, width - 50))}`;
        }
        // Compose lines
        let line1 = ` ${stepLabel}${progressStr}${timeStr}`;
        let line2 = ` ${BOX.ARROW_RIGHT} ${tokenStr}${fileStr}`;
        // Pad to width
        line1 = this.padLine(line1, width);
        line2 = this.padLine(line2, width);
        // Save cursor
        process.stdout.write('\x1B[s');
        // Move to status bar position (last 2 rows)
        const statusRow = this.rows - 1;
        process.stdout.write(`\x1B[${statusRow};1H`);
        // Render with styling
        process.stdout.write(COLORS.statusBg(COLORS.statusFg(line1)));
        process.stdout.write(`\x1B[${statusRow + 1};1H`);
        process.stdout.write(COLORS.statusBg(COLORS.statusFg(line2)));
        // Restore cursor
        process.stdout.write('\x1B[u');
    }
    padLine(line, width) {
        // Strip ANSI codes for length calculation
        const stripped = line.replace(/\x1B\[[0-9;]*m/g, '');
        if (stripped.length < width) {
            return line + ' '.repeat(width - stripped.length);
        }
        return line;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Formatting Helpers
    // ═══════════════════════════════════════════════════════════════════════════
    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        const remainingSeconds = seconds % 60;
        if (hours > 0) {
            return `${hours}h ${remainingMinutes.toString().padStart(2, '0')}m`;
        }
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
        }
        return `${seconds}s`;
    }
    formatTokens(count) {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        }
        if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Public API: Step Management
    // ═══════════════════════════════════════════════════════════════════════════
    nextStep() {
        this.currentStep++;
        this.stepStartTime = Date.now();
        this.progressCurrent = 0;
        this.progressTotal = 0;
        this.currentFile = '';
        this.statusMessage = '';
        this.renderStatusBar();
    }
    setStep(stepIndex) {
        this.currentStep = stepIndex;
        this.stepStartTime = Date.now();
        this.progressCurrent = 0;
        this.progressTotal = 0;
        this.currentFile = '';
        this.statusMessage = '';
        this.renderStatusBar();
    }
    setProgress(current, total) {
        this.progressCurrent = current;
        this.progressTotal = total;
        this.renderStatusBar();
    }
    setCurrentFile(filePath) {
        this.currentFile = filePath;
        this.renderStatusBar();
    }
    setStatusMessage(message) {
        this.statusMessage = message;
        this.renderStatusBar();
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Public API: Token Tracking
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Add tokens from an API response
     * This should be called with actual API response values, not estimates
     */
    addTokens(input, output, cacheCreation, cacheRead) {
        this.tokens.input += input;
        this.tokens.output += output;
        if (cacheCreation)
            this.tokens.cacheCreation += cacheCreation;
        if (cacheRead)
            this.tokens.cacheRead += cacheRead;
        this.renderStatusBar();
    }
    /**
     * Set tokens directly (replaces current values)
     */
    setTokens(usage) {
        if (usage.input !== undefined)
            this.tokens.input = usage.input;
        if (usage.output !== undefined)
            this.tokens.output = usage.output;
        if (usage.cacheCreation !== undefined)
            this.tokens.cacheCreation = usage.cacheCreation;
        if (usage.cacheRead !== undefined)
            this.tokens.cacheRead = usage.cacheRead;
        this.renderStatusBar();
    }
    /**
     * Get current token usage
     */
    getTokens() {
        return { ...this.tokens };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Public API: Content Output
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Log a message to the content area
     */
    log(message) {
        if (!this.enabled) {
            console.log(message);
            return;
        }
        this.writeContent(message + '\n');
    }
    /**
     * Write content directly (no newline added)
     */
    write(text) {
        if (!this.enabled) {
            process.stdout.write(text);
            return;
        }
        this.writeContent(text);
    }
    writeContent(text) {
        if (!this.enabled) {
            process.stdout.write(text);
            return;
        }
        // Save cursor
        process.stdout.write('\x1B[s');
        // Move to bottom of scroll region and write
        // The scroll region handles scrolling automatically
        const contentBottom = this.rows - 2;
        process.stdout.write(`\x1B[${contentBottom};1H`);
        process.stdout.write(text);
        // Restore cursor
        process.stdout.write('\x1B[u');
        // Refresh status bar
        this.renderStatusBar();
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Public API: Streaming
    // ═══════════════════════════════════════════════════════════════════════════
    startStreaming(filePath) {
        this.currentFile = filePath;
        if (!this.enabled)
            return;
        const shortPath = filePath.split('/').slice(-2).join('/');
        this.log(COLORS.subheader(`\n${BOX.SINGLE_TOP_LEFT}${BOX.SINGLE_HORIZONTAL.repeat(3)} ${shortPath} ${BOX.SINGLE_HORIZONTAL.repeat(40)}`));
        this.renderStatusBar();
    }
    streamContent(chunk) {
        if (!this.enabled) {
            process.stdout.write(chunk);
            return;
        }
        this.writeContent(chunk);
    }
    endStreaming() {
        this.currentFile = '';
        if (!this.enabled)
            return;
        this.log(COLORS.subheader(`${BOX.SINGLE_BOTTOM_LEFT}${BOX.SINGLE_HORIZONTAL.repeat(60)}\n`));
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Public API: Tree Display
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Display a tree structure (documents, steps, etc.)
     */
    displayTree(nodes, title) {
        if (title) {
            this.log(`\n${COLORS.header(title)}`);
            this.log(COLORS.border(BOX.SINGLE_HORIZONTAL.repeat(title.length + 4)));
        }
        for (let i = 0; i < nodes.length; i++) {
            const isLast = i === nodes.length - 1;
            this.renderTreeNode(nodes[i], '', isLast);
        }
        this.log('');
    }
    renderTreeNode(node, prefix, isLast) {
        const connector = isLast ? BOX.TREE_LAST : BOX.TREE_BRANCH;
        const extension = isLast ? BOX.TREE_SPACE : BOX.TREE_PIPE;
        // Status indicator
        let statusIcon = '';
        switch (node.status) {
            case 'done':
                statusIcon = COLORS.success(BOX.CHECK);
                break;
            case 'error':
                statusIcon = COLORS.error(BOX.CROSS);
                break;
            case 'active':
                statusIcon = COLORS.progressActive(BOX.SPINNER[this.spinnerFrame]);
                break;
            case 'pending':
                statusIcon = COLORS.muted(BOX.BULLET);
                break;
            default:
                statusIcon = ' ';
        }
        // Node label color
        let label = node.label;
        switch (node.type) {
            case 'dir':
                label = COLORS.treeDir(label);
                break;
            case 'file':
                label = COLORS.treeFile(label);
                break;
            case 'step':
                label = COLORS.header(label);
                break;
            case 'task':
                label = node.status === 'done' ? COLORS.success(label) : label;
                break;
        }
        // Details
        const details = node.details ? COLORS.dim(` (${node.details})`) : '';
        this.log(`${COLORS.treeBranch(prefix + connector + BOX.SINGLE_HORIZONTAL)} ${statusIcon} ${label}${details}`);
        // Render children if expanded
        if (node.children && (node.expanded !== false)) {
            for (let i = 0; i < node.children.length; i++) {
                const childIsLast = i === node.children.length - 1;
                this.renderTreeNode(node.children[i], prefix + extension + BOX.TREE_SPACE, childIsLast);
            }
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // Public API: Boxes and Sections
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Draw a box around content
     */
    drawBox(title, content, style = 'single') {
        const box = style === 'double' ? {
            tl: BOX.DOUBLE_TOP_LEFT,
            tr: BOX.DOUBLE_TOP_RIGHT,
            bl: BOX.DOUBLE_BOTTOM_LEFT,
            br: BOX.DOUBLE_BOTTOM_RIGHT,
            h: BOX.DOUBLE_HORIZONTAL,
            v: BOX.DOUBLE_VERTICAL,
        } : {
            tl: BOX.SINGLE_TOP_LEFT,
            tr: BOX.SINGLE_TOP_RIGHT,
            bl: BOX.SINGLE_BOTTOM_LEFT,
            br: BOX.SINGLE_BOTTOM_RIGHT,
            h: BOX.SINGLE_HORIZONTAL,
            v: BOX.SINGLE_VERTICAL,
        };
        const maxLen = Math.max(title.length + 4, ...content.map(c => c.replace(/\x1B\[[0-9;]*m/g, '').length + 4));
        const width = Math.min(maxLen, this.cols - 4);
        // Top border with title
        const titlePad = Math.floor((width - title.length - 4) / 2);
        this.log(COLORS.border(box.tl +
            box.h.repeat(titlePad) +
            ' ' + COLORS.header(title) + ' ' +
            COLORS.border(box.h.repeat(width - titlePad - title.length - 4) +
                box.tr)));
        // Content
        for (const line of content) {
            const stripped = line.replace(/\x1B\[[0-9;]*m/g, '');
            const padding = ' '.repeat(Math.max(0, width - stripped.length - 4));
            this.log(COLORS.border(box.v) + ' ' + line + padding + ' ' + COLORS.border(box.v));
        }
        // Bottom border
        this.log(COLORS.border(box.bl + box.h.repeat(width - 2) + box.br));
    }
    /**
     * Show a success message
     */
    success(message) {
        this.log(`${COLORS.success(BOX.CHECK)} ${COLORS.success(message)}`);
    }
    /**
     * Show a warning message
     */
    warn(message) {
        this.log(`${COLORS.warning('⚠')} ${COLORS.warning(message)}`);
    }
    /**
     * Show an error message
     */
    error(message) {
        this.log(`${COLORS.error(BOX.CROSS)} ${COLORS.error(message)}`);
    }
    /**
     * Show an info message
     */
    info(message) {
        this.log(`${COLORS.info(BOX.BULLET)} ${message}`);
    }
    /**
     * Show a stage header
     */
    stage(title) {
        this.log('');
        this.log(COLORS.header(`${BOX.DOUBLE_HORIZONTAL.repeat(3)} ${title} ${BOX.DOUBLE_HORIZONTAL.repeat(Math.max(0, this.cols - title.length - 10))}`));
        this.log('');
    }
    /**
     * Force refresh the display
     */
    refresh() {
        if (!this.enabled)
            return;
        this.renderStatusBar();
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// Simple Progress (Non-TTY fallback)
// ═══════════════════════════════════════════════════════════════════════════════
export class SimpleProgress {
    steps;
    currentStep = 0;
    totalStartTime = Date.now();
    tokens = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 };
    constructor(config) {
        this.steps = config.steps;
    }
    start() {
        this.totalStartTime = Date.now();
        console.log(chalk.cyan.bold('\n╔══════════════════════════════════════════╗'));
        console.log(chalk.cyan.bold('║         PKF Init Starting...             ║'));
        console.log(chalk.cyan.bold('╚══════════════════════════════════════════╝\n'));
    }
    stop() {
        const elapsed = ((Date.now() - this.totalStartTime) / 1000).toFixed(1);
        console.log(chalk.green.bold(`\n✓ Completed in ${elapsed}s`));
        console.log(`  Tokens: ↓${this.tokens.input} ↑${this.tokens.output}`);
        if (this.tokens.cacheRead > 0) {
            console.log(`  Cache:  ⚡${this.tokens.cacheRead} read, 💾${this.tokens.cacheCreation} written`);
        }
    }
    nextStep() {
        this.currentStep++;
        const step = this.steps[this.currentStep];
        if (step) {
            console.log(chalk.cyan(`\n► [Step ${this.currentStep + 1}/${this.steps.length}] ${step.name}`));
        }
    }
    setStep(stepIndex) {
        this.currentStep = stepIndex;
        const step = this.steps[stepIndex];
        if (step) {
            console.log(chalk.cyan(`\n► [Step ${stepIndex + 1}/${this.steps.length}] ${step.name}`));
        }
    }
    setProgress(current, total) {
        const percent = Math.round((current / total) * 100);
        process.stdout.write(`\r  Progress: ${current}/${total} (${percent}%)`);
        if (current === total) {
            console.log('');
        }
    }
    setCurrentFile(filePath) {
        const shortPath = filePath.split('/').slice(-2).join('/');
        console.log(chalk.dim(`  → ${shortPath}`));
    }
    setStatusMessage(message) {
        console.log(chalk.dim(`  ${message}`));
    }
    addTokens(input, output, cacheCreation, cacheRead) {
        this.tokens.input += input;
        this.tokens.output += output;
        if (cacheCreation)
            this.tokens.cacheCreation += cacheCreation;
        if (cacheRead)
            this.tokens.cacheRead += cacheRead;
    }
    setTokens(usage) {
        if (usage.input !== undefined)
            this.tokens.input = usage.input;
        if (usage.output !== undefined)
            this.tokens.output = usage.output;
        if (usage.cacheCreation !== undefined)
            this.tokens.cacheCreation = usage.cacheCreation;
        if (usage.cacheRead !== undefined)
            this.tokens.cacheRead = usage.cacheRead;
    }
    getTokens() {
        return { ...this.tokens };
    }
    log(message) {
        console.log(message);
    }
    write(text) {
        process.stdout.write(text);
    }
    startStreaming(filePath) {
        this.setCurrentFile(filePath);
    }
    streamContent(_chunk) {
        // Silent in simple mode
    }
    endStreaming() {
        // Nothing to do
    }
    displayTree(nodes, title) {
        if (title)
            console.log(`\n${title}`);
        for (const node of nodes) {
            console.log(`  ${node.status === 'done' ? '✓' : '•'} ${node.label}`);
        }
    }
    drawBox(title, content) {
        console.log(`\n--- ${title} ---`);
        for (const line of content) {
            console.log(`  ${line}`);
        }
        console.log('');
    }
    success(message) {
        console.log(chalk.green(`✓ ${message}`));
    }
    warn(message) {
        console.log(chalk.yellow(`⚠ ${message}`));
    }
    error(message) {
        console.log(chalk.red(`✗ ${message}`));
    }
    info(message) {
        console.log(`• ${message}`);
    }
    stage(title) {
        console.log(`\n═══ ${title} ${'═'.repeat(40)}\n`);
    }
    refresh() {
        // Nothing to do
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// Factory Function
// ═══════════════════════════════════════════════════════════════════════════════
export function createTerminalUI(config) {
    if (process.stdout.isTTY) {
        return new TerminalUI(config);
    }
    return new SimpleProgress(config);
}
/**
 * Create a no-op UI for debug mode (no output, no cursor movement)
 */
export function createNoOpUI() {
    return {
        start: () => { },
        stop: () => { },
        nextStep: () => { },
        setStep: () => { },
        setProgress: () => { },
        setCurrentFile: () => { },
        addTokens: () => { },
        startStreaming: () => { },
        endStreaming: () => { },
        streamContent: () => { },
        log: () => { },
    };
}
export default TerminalUI;
//# sourceMappingURL=terminal-ui.js.map