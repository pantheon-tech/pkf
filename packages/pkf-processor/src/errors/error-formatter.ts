import chalk from 'chalk';
import type { ProcessorError } from '../types.js';

/**
 * Format a single error for terminal output.
 */
export function formatError(error: ProcessorError): string {
  const location = error.line
    ? `:${error.line}${error.column ? `:${error.column}` : ''}`
    : '';

  const prefix = error.severity === 'error'
    ? chalk.red('ERROR')
    : chalk.yellow('WARNING');

  const typeTag = error.type ? chalk.gray(`[${error.type}]`) : '';

  let output = `${prefix} ${typeTag} ${chalk.cyan(error.file)}${location}\n`;
  output += `  ${error.message}\n`;

  if (error.expected) {
    output += `  ${chalk.gray('Expected:')} ${error.expected}\n`;
  }

  if (error.rule) {
    output += `  ${chalk.gray('Rule:')} ${error.rule}\n`;
  }

  return output;
}

/**
 * Format multiple errors for terminal output.
 */
export function formatErrors(errors: ProcessorError[]): string {
  if (errors.length === 0) {
    return '';
  }

  const errorCount = errors.filter((e) => e.severity === 'error').length;
  const warningCount = errors.filter((e) => e.severity === 'warning').length;

  let output = errors.map(formatError).join('\n');

  output += '\n';
  output += chalk.bold(`${errorCount} error(s), ${warningCount} warning(s)\n`);

  return output;
}

/**
 * Format structure validation error per Architecture Section 9.7.
 */
export function formatStructureError(error: ProcessorError): string {
  return `
${chalk.red('PKF Structure Validation Failed:')}

${chalk.red('ERROR:')} ${error.message}
  ${chalk.gray('Expected:')} ${error.expected ?? 'N/A'}
  ${chalk.gray('Location:')} ${error.file}
  ${chalk.gray('Rule:')} ${error.rule ?? 'N/A'}
`;
}
