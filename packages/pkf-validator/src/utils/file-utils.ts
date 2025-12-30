/**
 * File utility functions for validators
 */

import { readFile, access, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { constants } from 'fs';
import matter from 'gray-matter';

/**
 * Check if a file exists and is readable
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is a directory
 */
export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Read a file as text
 */
export async function readTextFile(filePath: string): Promise<string> {
  return readFile(filePath, 'utf-8');
}

/**
 * Read and parse a YAML file
 */
export async function readYamlFile<T = unknown>(filePath: string): Promise<T> {
  const { parse } = await import('yaml');
  const content = await readTextFile(filePath);
  return parse(content) as T;
}

/**
 * Read and parse a JSON file
 */
export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  const content = await readTextFile(filePath);
  return JSON.parse(content) as T;
}

/**
 * Parse frontmatter from markdown content
 */
export function parseFrontmatter(content: string): {
  data: Record<string, unknown>;
  content: string;
} {
  const parsed = matter(content);
  return {
    data: parsed.data as Record<string, unknown>,
    content: parsed.content,
  };
}

/**
 * Read markdown file and extract frontmatter
 */
export async function readMarkdownWithFrontmatter(filePath: string): Promise<{
  frontmatter: Record<string, unknown>;
  content: string;
  raw: string;
}> {
  const raw = await readTextFile(filePath);
  const { data, content } = parseFrontmatter(raw);
  return {
    frontmatter: data,
    content,
    raw,
  };
}

/**
 * Resolve a path relative to a root directory
 */
export function resolvePath(rootDir: string, relativePath: string): string {
  return resolve(rootDir, relativePath);
}

/**
 * Get the default PKF config path
 */
export function getConfigPath(rootDir: string = process.cwd()): string {
  return join(rootDir, 'pkf.config.yaml');
}

/**
 * Get the default docs directory path
 */
export function getDocsPath(rootDir: string = process.cwd()): string {
  return join(rootDir, 'docs');
}

/**
 * Get the registers directory path
 */
export function getRegistersPath(rootDir: string = process.cwd()): string {
  return join(rootDir, 'docs', 'registers');
}
