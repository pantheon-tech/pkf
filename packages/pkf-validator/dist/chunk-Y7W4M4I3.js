// src/types/index.ts
function createEmptyResult() {
  return {
    valid: true,
    errors: [],
    warnings: [],
    info: []
  };
}
function createIssue(code, message, severity = "error", extra) {
  return {
    code,
    message,
    severity,
    ...extra
  };
}
function mergeResults(...results) {
  const merged = createEmptyResult();
  for (const result of results) {
    merged.errors.push(...result.errors);
    merged.warnings.push(...result.warnings);
    merged.info.push(...result.info);
    if (result.duration !== void 0) {
      merged.duration = (merged.duration ?? 0) + result.duration;
    }
    if (result.itemCount !== void 0) {
      merged.itemCount = (merged.itemCount ?? 0) + result.itemCount;
    }
  }
  merged.valid = merged.errors.length === 0;
  return merged;
}

// src/validators/config-validator.ts
import { join as join2 } from "path";

// src/utils/file-utils.ts
import { readFile, access, stat } from "fs/promises";
import { join, resolve } from "path";
import { constants } from "fs";
import matter from "gray-matter";
async function fileExists(filePath) {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}
async function isDirectory(path) {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
async function readTextFile(filePath) {
  return readFile(filePath, "utf-8");
}
async function readYamlFile(filePath) {
  const { parse } = await import("yaml");
  const content = await readTextFile(filePath);
  return parse(content);
}
async function readJsonFile(filePath) {
  const content = await readTextFile(filePath);
  return JSON.parse(content);
}
function getConfigPath(rootDir = process.cwd()) {
  return join(rootDir, "pkf.config.yaml");
}
function getRegistersPath(rootDir = process.cwd()) {
  return join(rootDir, "docs", "registers");
}

// src/utils/schema-utils.ts
import Ajv from "ajv";
var ajvInstance = null;
function getAjv() {
  if (!ajvInstance) {
    ajvInstance = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
      validateFormats: true
    });
    ajvInstance.addFormat("date", {
      type: "string",
      validate: (str) => /^\d{4}-\d{2}-\d{2}$/.test(str)
    });
    ajvInstance.addFormat("datetime", {
      type: "string",
      validate: (str) => !isNaN(Date.parse(str))
    });
    ajvInstance.addFormat("semver", {
      type: "string",
      validate: (str) => /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/.test(str)
    });
    ajvInstance.addFormat("uri", {
      type: "string",
      validate: (str) => {
        try {
          new URL(str);
          return true;
        } catch {
          return false;
        }
      }
    });
    ajvInstance.addFormat("email", {
      type: "string",
      validate: (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)
    });
  }
  return ajvInstance;
}
var schemaCache = /* @__PURE__ */ new Map();
function compileSchema(schema) {
  const ajv = getAjv();
  const schemaObj = schema;
  const schemaId = schemaObj.$id;
  if (schemaId && schemaCache.has(schemaId)) {
    return schemaCache.get(schemaId);
  }
  if (schemaId) {
    const existing = ajv.getSchema(schemaId);
    if (existing) {
      schemaCache.set(schemaId, existing);
      return existing;
    }
  }
  const compiled = ajv.compile(schema);
  if (schemaId) {
    schemaCache.set(schemaId, compiled);
  }
  return compiled;
}
function ajvErrorsToIssues(errors, filePath) {
  if (!errors || errors.length === 0) {
    return [];
  }
  return errors.map((error) => {
    const path = error.instancePath || "/";
    const keyword = error.keyword;
    let code;
    let message;
    let suggestion;
    switch (keyword) {
      case "required":
        code = "REQUIRED_FIELD";
        message = `Missing required field: ${error.params.missingProperty} at ${path}`;
        suggestion = `Add the '${error.params.missingProperty}' field`;
        break;
      case "type":
        code = "INVALID_TYPE";
        message = `Invalid type at ${path}: expected ${error.params.type}, got ${typeof error.data}`;
        suggestion = `Change the value to type '${error.params.type}'`;
        break;
      case "enum":
        code = "INVALID_ENUM";
        message = `Invalid value at ${path}: must be one of ${JSON.stringify(error.params.allowedValues)}`;
        suggestion = `Use one of: ${error.params.allowedValues.join(", ")}`;
        break;
      case "pattern":
        code = "PATTERN_MISMATCH";
        message = `Value at ${path} does not match pattern: ${error.params.pattern}`;
        suggestion = `Ensure the value matches the pattern: ${error.params.pattern}`;
        break;
      case "format":
        code = "INVALID_FORMAT";
        message = `Invalid format at ${path}: expected ${error.params.format}`;
        suggestion = `Use the correct format: ${error.params.format}`;
        break;
      case "additionalProperties":
        code = "ADDITIONAL_PROPERTY";
        message = `Unknown property '${error.params.additionalProperty}' at ${path}`;
        suggestion = `Remove the property '${error.params.additionalProperty}' or check spelling`;
        break;
      case "minimum":
      case "maximum":
      case "minLength":
      case "maxLength":
        code = "OUT_OF_RANGE";
        message = `Value at ${path} ${error.message}`;
        break;
      default:
        code = `SCHEMA_${keyword.toUpperCase()}`;
        message = `Schema validation failed at ${path}: ${error.message}`;
    }
    return createIssue(code, message, "error", {
      filePath,
      value: error.data,
      expected: error.params,
      suggestion
    });
  });
}
function validateWithSchema(data, schema, filePath) {
  const validate = compileSchema(schema);
  const valid = validate(data);
  if (valid) {
    return { valid: true, data, issues: [] };
  }
  return {
    valid: false,
    issues: ajvErrorsToIssues(validate.errors, filePath)
  };
}

// src/validators/config-validator.ts
var STRUCTURE_DIRECTORIES = {
  docsDir: "docs",
  archiveDir: "docs_archive",
  registersDir: "docs/registers",
  templatesDir: "docs/framework/templates",
  schemasDir: "docs/framework/schemas",
  agentsDir: ".claude/agents"
};
async function validateConfig(options = {}) {
  const startTime = Date.now();
  const result = createEmptyResult();
  const rootDir = options.rootDir ?? process.cwd();
  const configPath = options.configPath ?? getConfigPath(rootDir);
  if (!await fileExists(configPath)) {
    result.errors.push(
      createIssue(
        "CONFIG_NOT_FOUND",
        `PKF configuration file not found: ${configPath}`,
        "error",
        {
          filePath: configPath,
          suggestion: `Create a pkf.config.yaml file in your project root. You can use the template from templates/pkf-config.template.yaml`
        }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }
  let config;
  try {
    config = await readYamlFile(configPath);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(
      createIssue(
        "CONFIG_PARSE_ERROR",
        `Failed to parse PKF configuration: ${errorMessage}`,
        "error",
        {
          filePath: configPath,
          suggestion: "Ensure the file contains valid YAML syntax"
        }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }
  if (!config || typeof config !== "object") {
    result.errors.push(
      createIssue(
        "CONFIG_EMPTY",
        "PKF configuration file is empty or invalid",
        "error",
        {
          filePath: configPath,
          suggestion: "Add required configuration fields: version and project.name"
        }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }
  const schemaPath = options.schemaPath ?? findSchemaPath(rootDir);
  if (schemaPath && await fileExists(schemaPath)) {
    try {
      const schema = await readJsonFile(schemaPath);
      const schemaResult = validateWithSchema(
        config,
        schema,
        configPath
      );
      if (!schemaResult.valid) {
        result.errors.push(...schemaResult.issues);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.warnings.push(
        createIssue(
          "SCHEMA_LOAD_ERROR",
          `Could not load schema for validation: ${errorMessage}`,
          "warning",
          {
            filePath: schemaPath,
            suggestion: "Ensure the schema file exists and contains valid JSON"
          }
        )
      );
    }
  } else {
    result.info.push(
      createIssue(
        "SCHEMA_NOT_FOUND",
        `Schema file not found at ${schemaPath ?? "default location"}, performing basic validation only`,
        "info",
        {
          suggestion: "Add schemas/pkf-config.schema.json for full schema validation"
        }
      )
    );
    const basicErrors = validateBasicConfig(config, configPath);
    result.errors.push(...basicErrors);
  }
  if (!options.skipDirectoryChecks) {
    const dirIssues = await validateDirectoryReferences(
      config,
      rootDir,
      configPath,
      options.checkOptionalDirectories ?? false
    );
    categorizeIssues(dirIssues, result);
  }
  if (config.proposals?.enabled && config.proposals?.ranges) {
    const proposalIssues = validateProposalRanges(
      config.proposals.ranges,
      configPath
    );
    categorizeIssues(proposalIssues, result);
  }
  if (config.registers?.idPrefix) {
    const registerIssues = validateRegisterConfig(config.registers, configPath);
    categorizeIssues(registerIssues, result);
  }
  result.valid = result.errors.length === 0;
  result.duration = Date.now() - startTime;
  result.itemCount = 1;
  return result;
}
function findSchemaPath(rootDir) {
  return join2(rootDir, "schemas", "pkf-config.schema.json");
}
function validateBasicConfig(config, filePath) {
  const issues = [];
  if (!config.version) {
    issues.push(
      createIssue(
        "REQUIRED_FIELD",
        "Missing required field: version",
        "error",
        {
          filePath,
          suggestion: 'Add a version field (e.g., version: "1.0.0")'
        }
      )
    );
  } else if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(config.version)) {
    issues.push(
      createIssue(
        "INVALID_VERSION",
        `Invalid version format: ${config.version}`,
        "error",
        {
          filePath,
          value: config.version,
          expected: "SemVer format (e.g., 1.0.0 or 1.0.0-alpha.1)",
          suggestion: 'Use SemVer format: MAJOR.MINOR.PATCH (e.g., "1.0.0")'
        }
      )
    );
  }
  if (!config.project) {
    issues.push(
      createIssue(
        "REQUIRED_FIELD",
        "Missing required field: project",
        "error",
        {
          filePath,
          suggestion: "Add a project section with at least a name field"
        }
      )
    );
  } else if (!config.project.name) {
    issues.push(
      createIssue(
        "REQUIRED_FIELD",
        "Missing required field: project.name",
        "error",
        {
          filePath,
          suggestion: "Add a name field to the project section"
        }
      )
    );
  }
  if (config.project?.version && !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(config.project.version)) {
    issues.push(
      createIssue(
        "INVALID_VERSION",
        `Invalid project version format: ${config.project.version}`,
        "error",
        {
          filePath,
          value: config.project.version,
          expected: "SemVer format (e.g., 1.0.0)",
          suggestion: "Use SemVer format: MAJOR.MINOR.PATCH"
        }
      )
    );
  }
  return issues;
}
async function validateDirectoryReferences(config, rootDir, configPath, checkOptional) {
  const issues = [];
  const structure = config.structure ?? {};
  const directoriesToCheck = [];
  const docsDir = structure.docsDir ?? STRUCTURE_DIRECTORIES.docsDir;
  directoriesToCheck.push({
    key: "docsDir",
    path: docsDir,
    required: true,
    description: "main documentation directory"
  });
  const registersDir = structure.registersDir ?? STRUCTURE_DIRECTORIES.registersDir;
  directoriesToCheck.push({
    key: "registersDir",
    path: registersDir,
    required: true,
    description: "registers directory (TODO, ISSUES, CHANGELOG)"
  });
  if (structure.templatesDir || checkOptional) {
    const templatesPath = structure.templatesDir ?? STRUCTURE_DIRECTORIES.templatesDir;
    directoriesToCheck.push({
      key: "templatesDir",
      path: templatesPath,
      required: false,
      description: "templates directory"
    });
  }
  if (structure.schemasDir || checkOptional) {
    const schemasPath = structure.schemasDir ?? STRUCTURE_DIRECTORIES.schemasDir;
    directoriesToCheck.push({
      key: "schemasDir",
      path: schemasPath,
      required: false,
      description: "schemas directory"
    });
  }
  if (structure.agentsDir || checkOptional) {
    const agentsPath = structure.agentsDir ?? STRUCTURE_DIRECTORIES.agentsDir;
    directoriesToCheck.push({
      key: "agentsDir",
      path: agentsPath,
      required: false,
      description: "AI agents directory"
    });
  }
  if (structure.archiveDir) {
    directoriesToCheck.push({
      key: "archiveDir",
      path: structure.archiveDir,
      required: false,
      description: "documentation archive directory"
    });
  }
  if (config.packages?.enabled) {
    const packagesDir = config.packages.directory ?? "packages";
    directoriesToCheck.push({
      key: "packages.directory",
      path: packagesDir,
      required: true,
      description: "packages directory (multi-package mode enabled)"
    });
  }
  for (const dir of directoriesToCheck) {
    const fullPath = join2(rootDir, dir.path);
    const exists = await isDirectory(fullPath);
    if (!exists) {
      if (dir.required) {
        issues.push(
          createIssue(
            "DIRECTORY_NOT_FOUND",
            `Required directory not found: ${dir.path} (${dir.description})`,
            "error",
            {
              filePath: configPath,
              value: dir.path,
              suggestion: `Create the directory: mkdir -p ${dir.path}`
            }
          )
        );
      } else {
        issues.push(
          createIssue(
            "DIRECTORY_MISSING",
            `Configured directory not found: ${dir.path} (${dir.description})`,
            "warning",
            {
              filePath: configPath,
              value: dir.path,
              suggestion: `Create the directory or remove the '${dir.key}' configuration`
            }
          )
        );
      }
    }
  }
  const fullRegistersDir = join2(rootDir, registersDir);
  if (await isDirectory(fullRegistersDir)) {
    const registerFiles = await validateRegisterFiles(
      config,
      rootDir,
      registersDir,
      configPath
    );
    issues.push(...registerFiles);
  }
  return issues;
}
async function validateRegisterFiles(config, rootDir, registersDir, configPath) {
  const issues = [];
  const registers = config.registers ?? {};
  const registerFilesToCheck = [
    {
      key: "todoFile",
      file: registers.todoFile ?? "TODO.md",
      description: "TODO register"
    },
    {
      key: "issuesFile",
      file: registers.issuesFile ?? "ISSUES.md",
      description: "Issues register"
    },
    {
      key: "changelogFile",
      file: registers.changelogFile ?? "CHANGELOG.md",
      description: "Changelog register"
    }
  ];
  for (const register of registerFilesToCheck) {
    const fullPath = join2(rootDir, registersDir, register.file);
    const exists = await fileExists(fullPath);
    if (!exists) {
      issues.push(
        createIssue(
          "REGISTER_FILE_MISSING",
          `Register file not found: ${register.file} (${register.description})`,
          "warning",
          {
            filePath: configPath,
            value: join2(registersDir, register.file),
            suggestion: `Create the register file from template or run: touch ${join2(registersDir, register.file)}`
          }
        )
      );
    }
  }
  return issues;
}
function validateProposalRanges(ranges, configPath) {
  const issues = [];
  if (!ranges) return issues;
  const rangeEntries = Object.entries(ranges);
  for (let i = 0; i < rangeEntries.length; i++) {
    const entry = rangeEntries[i];
    if (!entry) continue;
    const [name1, range1] = entry;
    if (range1.min >= range1.max) {
      issues.push(
        createIssue(
          "INVALID_RANGE",
          `Proposal range '${name1}' has min >= max (${range1.min} >= ${range1.max})`,
          "error",
          {
            filePath: configPath,
            value: range1,
            suggestion: "Ensure min is less than max"
          }
        )
      );
    }
    if (range1.min < 0) {
      issues.push(
        createIssue(
          "INVALID_RANGE",
          `Proposal range '${name1}' has negative min value: ${range1.min}`,
          "error",
          {
            filePath: configPath,
            value: range1.min,
            suggestion: "Use a non-negative minimum value"
          }
        )
      );
    }
    for (let j = i + 1; j < rangeEntries.length; j++) {
      const entry2 = rangeEntries[j];
      if (!entry2) continue;
      const [name2, range2] = entry2;
      const overlaps = range1.min >= range2.min && range1.min <= range2.max || range1.max >= range2.min && range1.max <= range2.max || range2.min >= range1.min && range2.min <= range1.max;
      if (overlaps) {
        issues.push(
          createIssue(
            "OVERLAPPING_RANGES",
            `Proposal ranges '${name1}' (${range1.min}-${range1.max}) and '${name2}' (${range2.min}-${range2.max}) overlap`,
            "error",
            {
              filePath: configPath,
              suggestion: "Adjust ranges so they do not overlap"
            }
          )
        );
      }
    }
  }
  return issues;
}
function validateRegisterConfig(registers, configPath) {
  const issues = [];
  if (registers.idPrefix) {
    const prefixPattern = /^[A-Z][A-Z0-9_-]*$/;
    for (const [key, prefix] of Object.entries(registers.idPrefix)) {
      if (prefix && !prefixPattern.test(prefix)) {
        issues.push(
          createIssue(
            "INVALID_ID_PREFIX",
            `Invalid ID prefix for '${key}': ${prefix}`,
            "warning",
            {
              filePath: configPath,
              value: prefix,
              expected: "Uppercase letters, numbers, underscores, or hyphens",
              suggestion: 'Use uppercase letters starting with a letter (e.g., "TODO", "ISSUE-1")'
            }
          )
        );
      }
    }
  }
  if (registers.idPrefix) {
    const prefixes = Object.entries(registers.idPrefix).filter(
      ([_, v]) => v !== void 0
    );
    const prefixValues = prefixes.map(([_, v]) => v);
    const duplicates = prefixValues.filter(
      (v, i) => prefixValues.indexOf(v) !== i
    );
    if (duplicates.length > 0) {
      const uniqueDuplicates = Array.from(new Set(duplicates));
      issues.push(
        createIssue(
          "DUPLICATE_ID_PREFIX",
          `Duplicate ID prefixes found: ${uniqueDuplicates.join(", ")}`,
          "error",
          {
            filePath: configPath,
            suggestion: "Each register type should have a unique ID prefix"
          }
        )
      );
    }
  }
  return issues;
}
function categorizeIssues(issues, result) {
  for (const issue of issues) {
    switch (issue.severity) {
      case "error":
        result.errors.push(issue);
        break;
      case "warning":
        result.warnings.push(issue);
        break;
      case "info":
        result.info.push(issue);
        break;
    }
  }
}
async function loadConfig(options = {}) {
  const result = await validateConfig(options);
  if (!result.valid) {
    return { config: null, result };
  }
  const rootDir = options.rootDir ?? process.cwd();
  const configPath = options.configPath ?? getConfigPath(rootDir);
  try {
    const config = await readYamlFile(configPath);
    return { config, result };
  } catch {
    return { config: null, result };
  }
}

// src/validators/todo-validator.ts
import { parse as parseYaml } from "yaml";
import { resolve as resolve2, dirname as dirname2 } from "path";
import { fileURLToPath } from "url";
function getDefaultSchemaPath() {
  const currentDir = dirname2(fileURLToPath(import.meta.url));
  return resolve2(currentDir, "..", "..", "..", "..", "schemas", "todo-item.schema.json");
}
function parseTodoItems(content, filePath) {
  const items = [];
  const normalizedContent = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalizedContent.split("\n");
  const headerPattern = /^###\s+(TODO-\d{3,})(?::\s*(.*))?$/;
  const yamlBlockStart = /^```ya?ml\s*$/;
  const yamlBlockEnd = /^```\s*$/;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line === void 0) {
      i++;
      continue;
    }
    const headerMatch = line.match(headerPattern);
    if (headerMatch) {
      const todoId = headerMatch[1];
      const title = headerMatch[2] || "";
      const headerLine = i + 1;
      let j = i + 1;
      while (j < lines.length && (lines[j]?.trim() ?? "") === "") {
        j++;
      }
      const currentLine = lines[j];
      if (j < lines.length && currentLine !== void 0 && yamlBlockStart.test(currentLine)) {
        const yamlStartLine = j + 1;
        j++;
        const yamlLines = [];
        while (j < lines.length) {
          const yamlLine = lines[j];
          if (yamlLine === void 0 || yamlBlockEnd.test(yamlLine)) {
            break;
          }
          yamlLines.push(yamlLine);
          j++;
        }
        const rawYaml = yamlLines.join("\n");
        try {
          const data = parseYaml(rawYaml);
          items.push({
            rawYaml,
            data: data || {},
            startLine: headerLine,
            yamlStartLine,
            headerText: `${todoId}${title ? ": " + title : ""}`
          });
        } catch (error) {
          items.push({
            rawYaml,
            data: { _parseError: error instanceof Error ? error.message : String(error) },
            startLine: headerLine,
            yamlStartLine,
            headerText: `${todoId}${title ? ": " + title : ""}`
          });
        }
        i = j + 1;
        continue;
      }
    }
    i++;
  }
  return items;
}
function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const parts = dateStr.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year === void 0 || month === void 0 || day === void 0) {
    return false;
  }
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
async function validateTodo(todoPath, options = {}) {
  const startTime = Date.now();
  const result = createEmptyResult();
  const {
    schemaPath = getDefaultSchemaPath(),
    validateDates = true,
    checkDependencies = true,
    includeWarnings = true,
    includeInfo = true,
    maxErrors
  } = options;
  if (!await fileExists(todoPath)) {
    result.errors.push(
      createIssue("FILE_NOT_FOUND", `TODO file not found: ${todoPath}`, "error", {
        filePath: todoPath
      })
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }
  let schema;
  try {
    if (!await fileExists(schemaPath)) {
      result.errors.push(
        createIssue("SCHEMA_NOT_FOUND", `TODO schema not found: ${schemaPath}`, "error", {
          filePath: schemaPath,
          suggestion: "Ensure todo-item.schema.json exists in the schemas directory"
        })
      );
      result.valid = false;
      result.duration = Date.now() - startTime;
      return result;
    }
    schema = await readJsonFile(schemaPath);
  } catch (error) {
    result.errors.push(
      createIssue(
        "SCHEMA_LOAD_ERROR",
        `Failed to load TODO schema: ${error instanceof Error ? error.message : String(error)}`,
        "error",
        { filePath: schemaPath }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }
  let content;
  try {
    content = await readTextFile(todoPath);
  } catch (error) {
    result.errors.push(
      createIssue(
        "FILE_READ_ERROR",
        `Failed to read TODO file: ${error instanceof Error ? error.message : String(error)}`,
        "error",
        { filePath: todoPath }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }
  const items = parseTodoItems(content, todoPath);
  if (items.length === 0) {
    if (includeInfo) {
      result.info.push(
        createIssue("NO_TODO_ITEMS", "No TODO items found in the file", "info", {
          filePath: todoPath
        })
      );
    }
    result.duration = Date.now() - startTime;
    result.itemCount = 0;
    return result;
  }
  const seenIds = /* @__PURE__ */ new Map();
  const allIds = /* @__PURE__ */ new Set();
  for (const item of items) {
    if (maxErrors !== void 0 && result.errors.length >= maxErrors) {
      if (includeWarnings) {
        result.warnings.push(
          createIssue(
            "MAX_ERRORS_REACHED",
            `Maximum error count (${maxErrors}) reached, stopping validation`,
            "warning",
            { filePath: todoPath }
          )
        );
      }
      break;
    }
    if (item.data._parseError) {
      result.errors.push(
        createIssue(
          "YAML_PARSE_ERROR",
          `Failed to parse YAML for ${item.headerText}: ${item.data._parseError}`,
          "error",
          {
            filePath: todoPath,
            line: item.yamlStartLine
          }
        )
      );
      continue;
    }
    const itemId = item.data.id;
    if (itemId) {
      allIds.add(itemId);
      if (seenIds.has(itemId)) {
        result.errors.push(
          createIssue(
            "DUPLICATE_ID",
            `Duplicate TODO ID: ${itemId} (first seen at line ${seenIds.get(itemId)})`,
            "error",
            {
              filePath: todoPath,
              line: item.startLine,
              value: itemId,
              suggestion: `Use a unique ID for this TODO item`
            }
          )
        );
      } else {
        seenIds.set(itemId, item.startLine);
      }
    }
    const schemaResult = validateWithSchema(item.data, schema, todoPath);
    if (!schemaResult.valid) {
      for (const issue of schemaResult.issues) {
        result.errors.push({
          ...issue,
          line: item.yamlStartLine,
          message: `[${itemId || item.headerText}] ${issue.message}`
        });
      }
    }
    if (validateDates) {
      const dateFields = ["created", "updated", "due_date"];
      for (const field of dateFields) {
        const value = item.data[field];
        if (typeof value === "string") {
          if (!isValidDate(value)) {
            result.errors.push(
              createIssue(
                "INVALID_DATE",
                `[${itemId || item.headerText}] Invalid date value for '${field}': ${value}`,
                "error",
                {
                  filePath: todoPath,
                  line: item.yamlStartLine,
                  value,
                  expected: "YYYY-MM-DD format with valid date",
                  suggestion: `Use a valid date in YYYY-MM-DD format (e.g., 2025-01-15)`
                }
              )
            );
          }
        }
      }
      const created = item.data.created;
      const updated = item.data.updated;
      if (created && updated && isValidDate(created) && isValidDate(updated)) {
        if (updated < created) {
          if (includeWarnings) {
            result.warnings.push(
              createIssue(
                "DATE_LOGIC_ERROR",
                `[${itemId || item.headerText}] 'updated' date (${updated}) is before 'created' date (${created})`,
                "warning",
                {
                  filePath: todoPath,
                  line: item.yamlStartLine,
                  value: { created, updated },
                  suggestion: `Update the 'updated' date to be on or after the 'created' date`
                }
              )
            );
          }
        }
      }
    }
  }
  if (checkDependencies) {
    for (const item of items) {
      if (item.data._parseError) continue;
      const itemId = item.data.id;
      const dependsOn = item.data.depends_on;
      const blocks = item.data.blocks;
      if (Array.isArray(dependsOn)) {
        for (const depId of dependsOn) {
          if (!allIds.has(depId)) {
            if (includeWarnings) {
              result.warnings.push(
                createIssue(
                  "ORPHANED_DEPENDENCY",
                  `[${itemId}] References non-existent TODO in 'depends_on': ${depId}`,
                  "warning",
                  {
                    filePath: todoPath,
                    line: item.yamlStartLine,
                    value: depId,
                    suggestion: `Remove the reference or ensure ${depId} exists`
                  }
                )
              );
            }
          }
        }
      }
      if (Array.isArray(blocks)) {
        for (const blockId of blocks) {
          if (!allIds.has(blockId)) {
            if (includeWarnings) {
              result.warnings.push(
                createIssue(
                  "ORPHANED_DEPENDENCY",
                  `[${itemId}] References non-existent TODO in 'blocks': ${blockId}`,
                  "warning",
                  {
                    filePath: todoPath,
                    line: item.yamlStartLine,
                    value: blockId,
                    suggestion: `Remove the reference or ensure ${blockId} exists`
                  }
                )
              );
            }
          }
        }
      }
    }
  }
  result.valid = result.errors.length === 0;
  result.duration = Date.now() - startTime;
  result.itemCount = items.length;
  return result;
}

// src/validators/issue-validator.ts
import { resolve as resolve3, dirname as dirname3 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { parse as parseYaml2 } from "yaml";
var VALID_STATUSES = ["open", "investigating", "in-progress", "resolved", "wontfix", "duplicate"];
var VALID_SEVERITIES = ["critical", "high", "medium", "low"];
var ISSUE_ID_PATTERN = /^ISSUE-\d{3,}$/;
var ISSUE_HEADING_PATTERN = /^###\s+(ISSUE-\d{3,})(?::\s*(.*))?$/;
function getDefaultSchemaPath2() {
  const currentDir = dirname3(fileURLToPath2(import.meta.url));
  return resolve3(currentDir, "..", "..", "..", "..", "schemas", "issue-item.schema.json");
}
function parseIssueItems(content, filePath) {
  const issues = [];
  const parseErrors = [];
  const lines = content.split("\n");
  let currentIssue = null;
  let inYamlBlock = false;
  let yamlContent = [];
  let yamlStartLine = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNumber = i + 1;
    const headingMatch = line.match(ISSUE_HEADING_PATTERN);
    if (headingMatch) {
      if (currentIssue && currentIssue.id) {
        issues.push(currentIssue);
      }
      const issueId = headingMatch[1] ?? "";
      currentIssue = {
        id: issueId,
        title: headingMatch[2]?.trim() || "",
        lineNumber,
        frontmatter: {},
        rawYaml: ""
      };
      continue;
    }
    if (currentIssue) {
      if (/^```ya?ml\s*$/.test(line)) {
        inYamlBlock = true;
        yamlContent = [];
        yamlStartLine = lineNumber;
        continue;
      }
      if (inYamlBlock && /^```\s*$/.test(line)) {
        inYamlBlock = false;
        const rawYaml = yamlContent.join("\n");
        currentIssue.rawYaml = rawYaml;
        try {
          currentIssue.frontmatter = parseYaml2(rawYaml) || {};
        } catch (error) {
          const issueId = currentIssue.id ?? "unknown";
          parseErrors.push(
            createIssue(
              "YAML_PARSE_ERROR",
              `Failed to parse YAML for ${issueId}: ${error instanceof Error ? error.message : String(error)}`,
              "error",
              {
                filePath,
                line: yamlStartLine,
                value: rawYaml.substring(0, 100),
                suggestion: "Check YAML syntax for errors"
              }
            )
          );
          currentIssue.frontmatter = {};
        }
        continue;
      }
      if (inYamlBlock) {
        yamlContent.push(line);
      }
    }
  }
  if (currentIssue && currentIssue.id) {
    issues.push(currentIssue);
  }
  return { issues, parseErrors };
}
function validateIdUniqueness(issues, filePath) {
  const errors = [];
  const seenIds = /* @__PURE__ */ new Map();
  for (const issue of issues) {
    const existingLine = seenIds.get(issue.id);
    if (existingLine !== void 0) {
      errors.push(
        createIssue(
          "DUPLICATE_ID",
          `Duplicate issue ID '${issue.id}' found (first occurrence at line ${existingLine})`,
          "error",
          {
            filePath,
            line: issue.lineNumber,
            value: issue.id,
            suggestion: `Use a unique ID for this issue (e.g., increment the number)`
          }
        )
      );
    } else {
      seenIds.set(issue.id, issue.lineNumber);
    }
  }
  return errors;
}
function validateIdFormat(issue, filePath) {
  const errors = [];
  if (!ISSUE_ID_PATTERN.test(issue.id)) {
    errors.push(
      createIssue(
        "INVALID_ID_FORMAT",
        `Invalid issue ID format '${issue.id}': must match pattern ISSUE-XXX (e.g., ISSUE-001)`,
        "error",
        {
          filePath,
          line: issue.lineNumber,
          value: issue.id,
          expected: "ISSUE-XXX where XXX is 3+ digits",
          suggestion: "Use format ISSUE-001, ISSUE-002, etc."
        }
      )
    );
  }
  const frontmatterId = issue.frontmatter.id;
  if (frontmatterId && frontmatterId !== issue.id) {
    errors.push(
      createIssue(
        "ID_MISMATCH",
        `Issue heading ID '${issue.id}' does not match frontmatter ID '${frontmatterId}'`,
        "error",
        {
          filePath,
          line: issue.lineNumber,
          value: frontmatterId,
          expected: issue.id,
          suggestion: `Update frontmatter 'id' to match heading: ${issue.id}`
        }
      )
    );
  }
  return errors;
}
function validateStatus(issue, filePath) {
  const warnings = [];
  const status = issue.frontmatter.status;
  if (status && typeof status === "string") {
    if (!VALID_STATUSES.includes(status)) {
      warnings.push(
        createIssue(
          "INVALID_STATUS",
          `Invalid status '${status}' for issue ${issue.id}`,
          "warning",
          {
            filePath,
            line: issue.lineNumber,
            value: status,
            expected: VALID_STATUSES,
            suggestion: `Use one of: ${VALID_STATUSES.join(", ")}`
          }
        )
      );
    }
  }
  return warnings;
}
function validateSeverity(issue, filePath) {
  const warnings = [];
  const severity = issue.frontmatter.severity;
  if (severity && typeof severity === "string") {
    if (!VALID_SEVERITIES.includes(severity)) {
      warnings.push(
        createIssue(
          "INVALID_SEVERITY",
          `Invalid severity '${severity}' for issue ${issue.id}`,
          "warning",
          {
            filePath,
            line: issue.lineNumber,
            value: severity,
            expected: VALID_SEVERITIES,
            suggestion: `Use one of: ${VALID_SEVERITIES.join(", ")}`
          }
        )
      );
    }
  }
  return warnings;
}
function validateHasFrontmatter(issue, filePath) {
  const warnings = [];
  if (!issue.rawYaml || Object.keys(issue.frontmatter).length === 0) {
    warnings.push(
      createIssue(
        "MISSING_FRONTMATTER",
        `Issue ${issue.id} has no YAML frontmatter block`,
        "warning",
        {
          filePath,
          line: issue.lineNumber,
          suggestion: "Add a YAML code block with issue metadata after the heading"
        }
      )
    );
  }
  return warnings;
}
function validateRelatedIssues(issue, allIssueIds, filePath) {
  const warnings = [];
  const relatedIssues = issue.frontmatter.related_issues;
  if (Array.isArray(relatedIssues)) {
    for (const relatedId of relatedIssues) {
      if (typeof relatedId === "string") {
        if (!ISSUE_ID_PATTERN.test(relatedId)) {
          warnings.push(
            createIssue(
              "INVALID_RELATED_ID_FORMAT",
              `Invalid related issue ID format '${relatedId}' in issue ${issue.id}`,
              "warning",
              {
                filePath,
                line: issue.lineNumber,
                value: relatedId,
                suggestion: "Use format ISSUE-XXX"
              }
            )
          );
        }
        if (relatedId === issue.id) {
          warnings.push(
            createIssue(
              "SELF_REFERENCE",
              `Issue ${issue.id} references itself in related_issues`,
              "warning",
              {
                filePath,
                line: issue.lineNumber,
                suggestion: "Remove self-reference from related_issues"
              }
            )
          );
        }
      }
    }
  }
  return warnings;
}
async function validateIssues(issuesPath, options = {}) {
  const startTime = Date.now();
  const result = createEmptyResult();
  const resolvedPath = resolve3(issuesPath);
  if (!await fileExists(resolvedPath)) {
    result.errors.push(
      createIssue(
        "FILE_NOT_FOUND",
        `ISSUES.md file not found at: ${resolvedPath}`,
        "error",
        {
          filePath: resolvedPath,
          suggestion: "Create an ISSUES.md file or check the path"
        }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }
  let content;
  try {
    content = await readTextFile(resolvedPath);
  } catch (error) {
    result.errors.push(
      createIssue(
        "FILE_READ_ERROR",
        `Failed to read ISSUES.md: ${error instanceof Error ? error.message : String(error)}`,
        "error",
        {
          filePath: resolvedPath
        }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }
  const { issues, parseErrors } = parseIssueItems(content, resolvedPath);
  result.errors.push(...parseErrors);
  if (issues.length === 0) {
    result.info.push(
      createIssue(
        "NO_ISSUES_FOUND",
        "No issue items found in ISSUES.md",
        "info",
        {
          filePath: resolvedPath,
          suggestion: "Add issues using ### ISSUE-XXX: Title format"
        }
      )
    );
    result.valid = result.errors.length === 0;
    result.duration = Date.now() - startTime;
    result.itemCount = 0;
    return result;
  }
  let schema = null;
  const schemaPath = getDefaultSchemaPath2();
  try {
    if (await fileExists(schemaPath)) {
      schema = await readJsonFile(schemaPath);
    }
  } catch (error) {
    result.warnings.push(
      createIssue(
        "SCHEMA_LOAD_ERROR",
        `Could not load issue schema: ${error instanceof Error ? error.message : String(error)}`,
        "warning",
        {
          filePath: schemaPath,
          suggestion: "Schema validation will be skipped"
        }
      )
    );
  }
  const allIssueIds = new Set(issues.map((i) => i.id));
  result.errors.push(...validateIdUniqueness(issues, resolvedPath));
  for (const issue of issues) {
    result.errors.push(...validateIdFormat(issue, resolvedPath));
    const frontmatterWarnings = validateHasFrontmatter(issue, resolvedPath);
    if (options.includeWarnings !== false) {
      result.warnings.push(...frontmatterWarnings);
    }
    if (Object.keys(issue.frontmatter).length === 0) {
      continue;
    }
    if (schema) {
      const schemaResult = validateWithSchema(issue.frontmatter, schema, resolvedPath);
      if (!schemaResult.valid) {
        for (const err of schemaResult.issues) {
          result.errors.push({
            ...err,
            message: `[${issue.id}] ${err.message}`,
            line: issue.lineNumber
          });
        }
      }
    }
    const statusWarnings = validateStatus(issue, resolvedPath);
    if (options.includeWarnings !== false) {
      result.warnings.push(...statusWarnings);
    }
    const severityWarnings = validateSeverity(issue, resolvedPath);
    if (options.includeWarnings !== false) {
      result.warnings.push(...severityWarnings);
    }
    const relatedWarnings = validateRelatedIssues(issue, allIssueIds, resolvedPath);
    if (options.includeWarnings !== false) {
      result.warnings.push(...relatedWarnings);
    }
    if (options.maxErrors && result.errors.length >= options.maxErrors) {
      result.warnings.push(
        createIssue(
          "MAX_ERRORS_REACHED",
          `Maximum error count (${options.maxErrors}) reached, stopping validation`,
          "warning",
          {
            filePath: resolvedPath
          }
        )
      );
      break;
    }
  }
  result.valid = result.errors.length === 0;
  result.duration = Date.now() - startTime;
  result.itemCount = issues.length;
  return result;
}
async function parseIssues(issuesPath) {
  const resolvedPath = resolve3(issuesPath);
  if (!await fileExists(resolvedPath)) {
    return [];
  }
  const content = await readTextFile(resolvedPath);
  const { issues } = parseIssueItems(content, resolvedPath);
  return issues;
}

// src/validators/changelog-validator.ts
import { readFile as readFile2 } from "fs/promises";
import { resolve as resolve4 } from "path";
var VALID_CHANGE_TYPES = [
  "added",
  "changed",
  "deprecated",
  "removed",
  "fixed",
  "security"
];
var SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/;
var VERSION_HEADER_PATTERN = /^##\s+\[([^\]]+)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?/;
var CHANGE_SECTION_PATTERN = /^###\s+(\w+)/i;
var DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
function parseSemver(version) {
  const match = version.match(SEMVER_PATTERN);
  if (!match) return null;
  const majorStr = match[1];
  const minorStr = match[2];
  const patchStr = match[3];
  if (majorStr === void 0 || minorStr === void 0 || patchStr === void 0) {
    return null;
  }
  return {
    major: parseInt(majorStr, 10),
    minor: parseInt(minorStr, 10),
    patch: parseInt(patchStr, 10),
    prerelease: match[4] ?? null
  };
}
function compareSemver(a, b) {
  const parsedA = parseSemver(a);
  const parsedB = parseSemver(b);
  if (!parsedA || !parsedB) return 0;
  if (parsedA.major !== parsedB.major) {
    return parsedA.major > parsedB.major ? 1 : -1;
  }
  if (parsedA.minor !== parsedB.minor) {
    return parsedA.minor > parsedB.minor ? 1 : -1;
  }
  if (parsedA.patch !== parsedB.patch) {
    return parsedA.patch > parsedB.patch ? 1 : -1;
  }
  if (parsedA.prerelease && !parsedB.prerelease) return -1;
  if (!parsedA.prerelease && parsedB.prerelease) return 1;
  if (parsedA.prerelease && parsedB.prerelease) {
    return parsedA.prerelease.localeCompare(parsedB.prerelease);
  }
  return 0;
}
function compareDates(a, b) {
  const dateA = new Date(a);
  const dateB = new Date(b);
  if (dateA < dateB) return -1;
  if (dateA > dateB) return 1;
  return 0;
}
function isValidDate2(dateStr) {
  if (!DATE_PATTERN.test(dateStr)) return false;
  const parts = dateStr.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year === void 0 || month === void 0 || day === void 0) {
    return false;
  }
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
async function parseYaml3(content) {
  const { parse } = await import("yaml");
  return parse(content);
}
async function parseChangelogContent(content, filePath) {
  const lines = content.split("\n");
  const entries = [];
  const issues = [];
  let currentEntry = null;
  let currentSection = null;
  let sectionContent = [];
  let entryContentLines = [];
  let inYamlBlock = false;
  let yamlLines = [];
  const finalizeCurrentEntry = () => {
    if (currentEntry) {
      if (currentSection && sectionContent.length > 0) {
        currentEntry.changeSections.set(currentSection.toLowerCase(), sectionContent);
      }
      currentEntry.content = entryContentLines.join("\n");
      entries.push(currentEntry);
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNumber = i + 1;
    if (line.trim() === "```yaml") {
      inYamlBlock = true;
      yamlLines = [];
      continue;
    }
    if (inYamlBlock && line.trim() === "```") {
      inYamlBlock = false;
      if (currentEntry && yamlLines.length > 0) {
        currentEntry.frontmatterYaml = yamlLines.join("\n");
        try {
          currentEntry.frontmatter = await parseYaml3(currentEntry.frontmatterYaml);
        } catch (error) {
          issues.push(
            createIssue(
              "YAML_PARSE_ERROR",
              `Failed to parse YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
              "error",
              { filePath, line: lineNumber }
            )
          );
        }
      }
      continue;
    }
    if (inYamlBlock) {
      yamlLines.push(line);
      continue;
    }
    const versionMatch = line.match(VERSION_HEADER_PATTERN);
    if (versionMatch) {
      finalizeCurrentEntry();
      const version = versionMatch[1] ?? "";
      const date = versionMatch[2] ?? null;
      currentEntry = {
        header: line,
        version,
        date,
        line: lineNumber,
        frontmatterYaml: null,
        frontmatter: null,
        changeSections: /* @__PURE__ */ new Map(),
        content: ""
      };
      currentSection = null;
      sectionContent = [];
      entryContentLines = [];
      continue;
    }
    const sectionMatch = line.match(CHANGE_SECTION_PATTERN);
    if (sectionMatch && currentEntry) {
      if (currentSection && sectionContent.length > 0) {
        currentEntry.changeSections.set(currentSection.toLowerCase(), sectionContent);
      }
      currentSection = sectionMatch[1] ?? null;
      sectionContent = [];
      entryContentLines.push(line);
      continue;
    }
    if (currentSection && line.trim().startsWith("-")) {
      const item = line.trim().substring(1).trim();
      if (item) {
        sectionContent.push(item);
      }
    }
    if (currentEntry) {
      entryContentLines.push(line);
    }
  }
  finalizeCurrentEntry();
  return { entries, issues };
}
async function validateEntry(entry, schema, filePath, options) {
  const issues = [];
  const isUnreleased = entry.version.toLowerCase() === "unreleased";
  if (!isUnreleased) {
    if (!SEMVER_PATTERN.test(entry.version)) {
      issues.push(
        createIssue(
          "INVALID_SEMVER",
          `Version "${entry.version}" is not a valid semantic version`,
          "error",
          {
            filePath,
            line: entry.line,
            value: entry.version,
            expected: "major.minor.patch[-prerelease][+build]",
            suggestion: "Use semantic versioning format (e.g., 1.0.0, 1.0.0-alpha.1)"
          }
        )
      );
    }
  }
  if (!isUnreleased) {
    if (!entry.date) {
      issues.push(
        createIssue(
          "MISSING_DATE",
          `Released version ${entry.version} is missing a release date`,
          "error",
          {
            filePath,
            line: entry.line,
            suggestion: "Add date in format: ## [version] - YYYY-MM-DD"
          }
        )
      );
    } else if (!isValidDate2(entry.date)) {
      issues.push(
        createIssue(
          "INVALID_DATE",
          `Invalid date "${entry.date}" for version ${entry.version}`,
          "error",
          {
            filePath,
            line: entry.line,
            value: entry.date,
            expected: "YYYY-MM-DD format with valid date",
            suggestion: "Use a valid date in YYYY-MM-DD format"
          }
        )
      );
    }
  }
  for (const [sectionType] of entry.changeSections) {
    const normalizedType = sectionType.toLowerCase();
    if (!VALID_CHANGE_TYPES.includes(normalizedType)) {
      issues.push(
        createIssue(
          "INVALID_CHANGE_TYPE",
          `Invalid change type "${sectionType}" in version ${entry.version}`,
          "warning",
          {
            filePath,
            line: entry.line,
            value: sectionType,
            expected: VALID_CHANGE_TYPES,
            suggestion: `Use one of: ${VALID_CHANGE_TYPES.join(", ")}`
          }
        )
      );
    }
  }
  if (entry.frontmatter) {
    const schemaResult = validateWithSchema(entry.frontmatter, schema, filePath);
    if (!schemaResult.valid) {
      for (const issue of schemaResult.issues) {
        issue.line = entry.line;
        issues.push(issue);
      }
    }
    const fmVersion = entry.frontmatter.version;
    const fmDate = entry.frontmatter.date;
    const fmStatus = entry.frontmatter.status;
    if (fmVersion && fmVersion.toLowerCase() !== entry.version.toLowerCase()) {
      issues.push(
        createIssue(
          "VERSION_MISMATCH",
          `Frontmatter version "${fmVersion}" does not match header version "${entry.version}"`,
          "error",
          {
            filePath,
            line: entry.line,
            suggestion: "Ensure frontmatter version matches the section header version"
          }
        )
      );
    }
    if (entry.date && fmDate && fmDate !== entry.date) {
      issues.push(
        createIssue(
          "DATE_MISMATCH",
          `Frontmatter date "${fmDate}" does not match header date "${entry.date}"`,
          "error",
          {
            filePath,
            line: entry.line,
            suggestion: "Ensure frontmatter date matches the section header date"
          }
        )
      );
    }
    if (isUnreleased && fmStatus && fmStatus !== "unreleased") {
      issues.push(
        createIssue(
          "STATUS_MISMATCH",
          `Unreleased section has status "${fmStatus}" instead of "unreleased"`,
          "error",
          {
            filePath,
            line: entry.line,
            suggestion: 'Set status to "unreleased" for unreleased versions'
          }
        )
      );
    }
    if (!isUnreleased && fmStatus && fmStatus !== "released") {
      issues.push(
        createIssue(
          "STATUS_MISMATCH",
          `Released version ${entry.version} has status "${fmStatus}" instead of "released"`,
          "error",
          {
            filePath,
            line: entry.line,
            suggestion: 'Set status to "released" for released versions'
          }
        )
      );
    }
  } else if (options.strict) {
    issues.push(
      createIssue(
        "MISSING_FRONTMATTER",
        `Version ${entry.version} is missing YAML frontmatter`,
        "warning",
        {
          filePath,
          line: entry.line,
          suggestion: "Add YAML frontmatter block with version, type, status, and date fields"
        }
      )
    );
  }
  const hasChanges = Array.from(entry.changeSections.values()).some(
    (items) => items.length > 0 && items.some((item) => item.trim() !== "")
  );
  if (!hasChanges && !isUnreleased) {
    issues.push(
      createIssue(
        "EMPTY_VERSION",
        `Version ${entry.version} has no documented changes`,
        "warning",
        {
          filePath,
          line: entry.line,
          suggestion: "Add changes under Added, Changed, Fixed, etc. sections"
        }
      )
    );
  }
  return issues;
}
function validateChronologicalOrder(entries, filePath) {
  const issues = [];
  const releasedEntries = entries.filter(
    (e) => e.version.toLowerCase() !== "unreleased"
  );
  const unreleasedEntry = entries.find(
    (e) => e.version.toLowerCase() === "unreleased"
  );
  if (unreleasedEntry && entries.indexOf(unreleasedEntry) !== 0) {
    issues.push(
      createIssue(
        "UNRELEASED_NOT_FIRST",
        "Unreleased section should be the first version entry",
        "error",
        {
          filePath,
          line: unreleasedEntry.line,
          suggestion: "Move the [Unreleased] section to the top of the version list"
        }
      )
    );
  }
  for (let i = 0; i < releasedEntries.length - 1; i++) {
    const current = releasedEntries[i];
    const next = releasedEntries[i + 1];
    if (!current || !next) continue;
    const versionComparison = compareSemver(current.version, next.version);
    if (versionComparison < 0) {
      issues.push(
        createIssue(
          "VERSION_ORDER",
          `Version ${current.version} appears before ${next.version} but should be after (newer versions first)`,
          "error",
          {
            filePath,
            line: current.line,
            suggestion: "Arrange versions in reverse chronological order (newest first)"
          }
        )
      );
    }
    if (current.date && next.date) {
      const dateComparison = compareDates(current.date, next.date);
      if (dateComparison < 0) {
        issues.push(
          createIssue(
            "DATE_ORDER",
            `Date ${current.date} (version ${current.version}) is earlier than ${next.date} (version ${next.version})`,
            "error",
            {
              filePath,
              line: current.line,
              suggestion: "Arrange versions in reverse chronological order by date"
            }
          )
        );
      }
    }
  }
  return issues;
}
async function loadChangelogSchema(rootDir) {
  const schemaPaths = [
    rootDir ? resolve4(rootDir, "schemas/changelog-entry.schema.json") : null,
    resolve4(process.cwd(), "schemas/changelog-entry.schema.json"),
    resolve4(process.cwd(), "../../schemas/changelog-entry.schema.json")
  ].filter((p) => p !== null);
  for (const schemaPath of schemaPaths) {
    if (await fileExists(schemaPath)) {
      return readJsonFile(schemaPath);
    }
  }
  return {
    type: "object",
    required: ["version", "type", "status"],
    properties: {
      version: { type: "string" },
      type: { type: "string", const: "changelog-entry" },
      status: { type: "string", enum: ["unreleased", "released"] },
      date: { type: ["string", "null"] }
    }
  };
}
async function validateChangelog(changelogPath, options = {}) {
  const startTime = Date.now();
  const result = createEmptyResult();
  const resolvedPath = resolve4(changelogPath);
  try {
    if (!await fileExists(resolvedPath)) {
      result.errors.push(
        createIssue("FILE_NOT_FOUND", `Changelog file not found: ${resolvedPath}`, "error", {
          filePath: resolvedPath
        })
      );
      result.valid = false;
      result.duration = Date.now() - startTime;
      return result;
    }
    const content = await readFile2(resolvedPath, "utf-8");
    const schema = await loadChangelogSchema(options.rootDir);
    const { entries, issues: parseIssues2 } = await parseChangelogContent(
      content,
      resolvedPath
    );
    for (const issue of parseIssues2) {
      if (issue.severity === "error") {
        result.errors.push(issue);
      } else if (issue.severity === "warning") {
        result.warnings.push(issue);
      } else {
        result.info.push(issue);
      }
    }
    if (entries.length === 0) {
      result.warnings.push(
        createIssue(
          "NO_VERSIONS",
          "No version entries found in changelog",
          "warning",
          {
            filePath: resolvedPath,
            suggestion: "Add version sections using format: ## [1.0.0] - YYYY-MM-DD"
          }
        )
      );
    }
    for (const entry of entries) {
      const entryIssues = await validateEntry(entry, schema, resolvedPath, options);
      for (const issue of entryIssues) {
        if (issue.severity === "error") {
          result.errors.push(issue);
        } else if (issue.severity === "warning") {
          result.warnings.push(issue);
        } else {
          result.info.push(issue);
        }
      }
      if (options.maxErrors && result.errors.length >= options.maxErrors) {
        result.info.push(
          createIssue(
            "MAX_ERRORS_REACHED",
            `Stopped validation after reaching ${options.maxErrors} errors`,
            "info",
            { filePath: resolvedPath }
          )
        );
        break;
      }
    }
    const orderIssues = validateChronologicalOrder(entries, resolvedPath);
    for (const issue of orderIssues) {
      if (issue.severity === "error") {
        result.errors.push(issue);
      } else if (issue.severity === "warning") {
        result.warnings.push(issue);
      } else {
        result.info.push(issue);
      }
    }
    result.valid = result.errors.length === 0;
    result.itemCount = entries.length;
    result.duration = Date.now() - startTime;
    if (!options.includeWarnings) {
      if (options.includeWarnings === false) {
        result.warnings = [];
      }
    }
    if (!options.includeInfo && options.includeInfo !== void 0) {
      result.info = [];
    }
    return result;
  } catch (error) {
    result.errors.push(
      createIssue(
        "VALIDATION_ERROR",
        `Failed to validate changelog: ${error instanceof Error ? error.message : String(error)}`,
        "error",
        { filePath: resolvedPath }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }
}
var changelogValidator = {
  name: "changelog-validator",
  description: "Validates CHANGELOG.md files against PKF standards including semver, dates, and change types",
  async validate(changelogPath, options) {
    return validateChangelog(changelogPath, options);
  }
};

// src/validators/frontmatter-validator.ts
import { parse as parseYaml4 } from "yaml";
var COMMON_FIELD_VALIDATORS = {
  type: {
    type: "string",
    description: "Document type identifier"
  },
  title: {
    type: "string",
    description: "Document title"
  },
  version: {
    type: "string",
    pattern: /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/,
    description: "SemVer version string (e.g., 1.0.0)"
  },
  status: {
    type: "string",
    enumValues: ["draft", "review", "approved", "deprecated", "archived", "active", "inactive"],
    description: "Document status"
  },
  date: {
    type: "string",
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    description: "Date in YYYY-MM-DD format"
  },
  created: {
    type: "string",
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    description: "Creation date in YYYY-MM-DD format"
  },
  updated: {
    type: "string",
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    description: "Last updated date in YYYY-MM-DD format"
  },
  author: {
    type: "string",
    description: "Document author"
  },
  authors: {
    type: "array",
    description: "List of document authors"
  },
  tags: {
    type: "array",
    description: "Document tags"
  },
  labels: {
    type: "array",
    description: "Document labels"
  },
  description: {
    type: "string",
    description: "Document description"
  },
  id: {
    type: "string",
    pattern: /^[A-Z]+-\d+$/,
    description: "Document identifier (e.g., TODO-001, ADR-001)"
  },
  priority: {
    type: "string",
    enumValues: ["critical", "high", "medium", "low"],
    description: "Priority level"
  },
  severity: {
    type: "string",
    enumValues: ["critical", "high", "medium", "low"],
    description: "Severity level"
  }
};
function extractFrontmatter(content) {
  const lines = content.split("\n");
  const standardResult = extractStandardFrontmatter(lines);
  if (standardResult.data !== null) {
    return standardResult;
  }
  const codeBlockResult = extractCodeBlockFrontmatter(lines);
  if (codeBlockResult.data !== null) {
    return codeBlockResult;
  }
  return {
    data: null,
    raw: null,
    line: 1,
    type: "none"
  };
}
function extractStandardFrontmatter(lines) {
  if (lines.length === 0 || lines[0]?.trim() !== "---") {
    return { data: null, raw: null, line: 1, type: "none" };
  }
  let endLine = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      endLine = i;
      break;
    }
  }
  if (endLine === -1) {
    return { data: null, raw: null, line: 1, type: "none" };
  }
  const yamlLines = lines.slice(1, endLine);
  const rawYaml = yamlLines.join("\n");
  try {
    const data = parseYaml4(rawYaml);
    return {
      data: data || {},
      raw: rawYaml,
      line: 2,
      // Frontmatter content starts at line 2 (after ---)
      type: "standard"
    };
  } catch {
    return {
      data: null,
      raw: rawYaml,
      line: 2,
      type: "standard"
    };
  }
}
function extractCodeBlockFrontmatter(lines) {
  let startIndex = 0;
  while (startIndex < lines.length && lines[startIndex]?.trim() === "") {
    startIndex++;
  }
  const firstLine = lines[startIndex] || "";
  const yamlBlockPattern = /^```ya?ml\s*$/i;
  if (!yamlBlockPattern.test(firstLine)) {
    return { data: null, raw: null, line: 1, type: "none" };
  }
  let endLine = -1;
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "```") {
      endLine = i;
      break;
    }
  }
  if (endLine === -1) {
    return { data: null, raw: null, line: startIndex + 1, type: "none" };
  }
  const yamlLines = lines.slice(startIndex + 1, endLine);
  const rawYaml = yamlLines.join("\n");
  try {
    const data = parseYaml4(rawYaml);
    return {
      data: data || {},
      raw: rawYaml,
      line: startIndex + 2,
      // Content starts after ```yaml line (1-based)
      type: "codeblock"
    };
  } catch {
    return {
      data: null,
      raw: rawYaml,
      line: startIndex + 2,
      type: "codeblock"
    };
  }
}
function validateFrontmatterContent(content, schema, filePath) {
  const result = createEmptyResult();
  const startTime = Date.now();
  const extracted = extractFrontmatter(content);
  if (extracted.data === null) {
    if (extracted.raw !== null) {
      result.errors.push(
        createIssue(
          "FRONTMATTER_PARSE_ERROR",
          "Failed to parse YAML frontmatter",
          "error",
          {
            filePath,
            line: extracted.line,
            suggestion: "Check YAML syntax for errors"
          }
        )
      );
    } else {
      result.warnings.push(
        createIssue(
          "NO_FRONTMATTER",
          "No frontmatter found in document",
          "warning",
          {
            filePath,
            suggestion: "Add frontmatter at the start of the document using --- delimiters"
          }
        )
      );
    }
    result.valid = result.errors.length === 0;
    result.duration = Date.now() - startTime;
    return result;
  }
  const schemaResult = validateWithSchema(extracted.data, schema, filePath);
  if (!schemaResult.valid) {
    for (const issue of schemaResult.issues) {
      result.errors.push({
        ...issue,
        line: issue.line ?? extracted.line
      });
    }
  }
  result.valid = result.errors.length === 0;
  result.duration = Date.now() - startTime;
  result.itemCount = 1;
  return result;
}
async function validateFrontmatter(filePath, options = {}) {
  const startTime = Date.now();
  const result = createEmptyResult();
  const {
    schemaPath,
    schema: inlineSchema,
    validateCommonFields = true,
    requiredFields = [],
    expectedType,
    includeWarnings = true,
    includeInfo = true
  } = options;
  if (!await fileExists(filePath)) {
    result.errors.push(
      createIssue("FILE_NOT_FOUND", `File not found: ${filePath}`, "error", {
        filePath
      })
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }
  let content;
  try {
    content = await readTextFile(filePath);
  } catch (error) {
    result.errors.push(
      createIssue(
        "FILE_READ_ERROR",
        `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
        "error",
        { filePath }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }
  const extracted = extractFrontmatter(content);
  if (extracted.data === null) {
    if (extracted.raw !== null) {
      result.errors.push(
        createIssue(
          "FRONTMATTER_PARSE_ERROR",
          "Failed to parse YAML frontmatter",
          "error",
          {
            filePath,
            line: extracted.line,
            suggestion: "Check YAML syntax for errors"
          }
        )
      );
    } else {
      if (requiredFields.length > 0 || inlineSchema || schemaPath) {
        result.errors.push(
          createIssue(
            "NO_FRONTMATTER",
            "Document is missing required frontmatter",
            "error",
            {
              filePath,
              suggestion: "Add frontmatter at the start of the document using --- delimiters"
            }
          )
        );
      } else if (includeWarnings) {
        result.warnings.push(
          createIssue(
            "NO_FRONTMATTER",
            "No frontmatter found in document",
            "warning",
            {
              filePath,
              suggestion: "Consider adding frontmatter for better document organization"
            }
          )
        );
      }
    }
    result.valid = result.errors.length === 0;
    result.duration = Date.now() - startTime;
    return result;
  }
  const frontmatterData = extracted.data;
  if (includeInfo) {
    result.info.push(
      createIssue(
        "FRONTMATTER_FOUND",
        `Found ${extracted.type} frontmatter starting at line ${extracted.line}`,
        "info",
        { filePath, line: extracted.line }
      )
    );
  }
  let schema = null;
  if (inlineSchema) {
    schema = inlineSchema;
  } else if (schemaPath) {
    if (!await fileExists(schemaPath)) {
      result.errors.push(
        createIssue(
          "SCHEMA_NOT_FOUND",
          `Schema file not found: ${schemaPath}`,
          "error",
          {
            filePath: schemaPath,
            suggestion: "Ensure the schema file exists at the specified path"
          }
        )
      );
    } else {
      try {
        schema = await readJsonFile(schemaPath);
      } catch (error) {
        result.errors.push(
          createIssue(
            "SCHEMA_LOAD_ERROR",
            `Failed to load schema: ${error instanceof Error ? error.message : String(error)}`,
            "error",
            { filePath: schemaPath }
          )
        );
      }
    }
  }
  if (schema) {
    const schemaResult = validateWithSchema(frontmatterData, schema, filePath);
    if (!schemaResult.valid) {
      for (const issue of schemaResult.issues) {
        result.errors.push({
          ...issue,
          line: issue.line ?? extracted.line
        });
      }
    }
  }
  for (const field of requiredFields) {
    if (!(field in frontmatterData)) {
      result.errors.push(
        createIssue(
          "REQUIRED_FIELD_MISSING",
          `Required frontmatter field '${field}' is missing`,
          "error",
          {
            filePath,
            line: extracted.line,
            suggestion: `Add the '${field}' field to the frontmatter`
          }
        )
      );
    }
  }
  if (expectedType && frontmatterData.type !== expectedType) {
    if (!frontmatterData.type) {
      result.errors.push(
        createIssue(
          "TYPE_MISSING",
          `Document is missing 'type' field, expected '${expectedType}'`,
          "error",
          {
            filePath,
            line: extracted.line,
            suggestion: `Add 'type: ${expectedType}' to the frontmatter`
          }
        )
      );
    } else {
      result.errors.push(
        createIssue(
          "TYPE_MISMATCH",
          `Document type '${frontmatterData.type}' does not match expected type '${expectedType}'`,
          "error",
          {
            filePath,
            line: extracted.line,
            value: frontmatterData.type,
            expected: expectedType
          }
        )
      );
    }
  }
  if (validateCommonFields && !schema) {
    const commonFieldIssues = validateCommonFrontmatterFields(
      frontmatterData,
      filePath,
      extracted.line,
      includeWarnings
    );
    categorizeIssues2(commonFieldIssues, result);
  }
  const semanticIssues = validateSemanticRules(
    frontmatterData,
    filePath,
    extracted.line,
    includeWarnings
  );
  categorizeIssues2(semanticIssues, result);
  result.valid = result.errors.length === 0;
  result.duration = Date.now() - startTime;
  result.itemCount = 1;
  return result;
}
function validateCommonFrontmatterFields(data, filePath, line, includeWarnings) {
  const issues = [];
  for (const [field, value] of Object.entries(data)) {
    const validator = COMMON_FIELD_VALIDATORS[field];
    if (!validator) {
      continue;
    }
    const actualType = Array.isArray(value) ? "array" : typeof value;
    if (actualType !== validator.type) {
      issues.push(
        createIssue(
          "INVALID_FIELD_TYPE",
          `Field '${field}' should be ${validator.type}, got ${actualType}`,
          "error",
          {
            filePath,
            line,
            value,
            expected: validator.type,
            suggestion: validator.description
          }
        )
      );
      continue;
    }
    if (validator.pattern && typeof value === "string") {
      if (!validator.pattern.test(value)) {
        issues.push(
          createIssue(
            "INVALID_FIELD_FORMAT",
            `Field '${field}' does not match expected format: ${validator.description}`,
            "error",
            {
              filePath,
              line,
              value,
              expected: validator.pattern.source,
              suggestion: validator.description
            }
          )
        );
      }
    }
    if (validator.enumValues && typeof value === "string") {
      if (!validator.enumValues.includes(value)) {
        if (includeWarnings) {
          issues.push(
            createIssue(
              "UNKNOWN_ENUM_VALUE",
              `Field '${field}' has unexpected value '${value}'. Common values: ${validator.enumValues.join(", ")}`,
              "warning",
              {
                filePath,
                line,
                value,
                expected: validator.enumValues,
                suggestion: `Consider using one of: ${validator.enumValues.join(", ")}`
              }
            )
          );
        }
      }
    }
  }
  return issues;
}
function validateSemanticRules(data, filePath, line, includeWarnings) {
  const issues = [];
  const created = data.created;
  const updated = data.updated;
  if (created && updated && isValidDateFormat(created) && isValidDateFormat(updated)) {
    if (updated < created) {
      if (includeWarnings) {
        issues.push(
          createIssue(
            "DATE_ORDER_WARNING",
            `'updated' date (${updated}) is before 'created' date (${created})`,
            "warning",
            {
              filePath,
              line,
              value: { created, updated },
              suggestion: "Update the dates so that updated >= created"
            }
          )
        );
      }
    }
  }
  const date = data.date;
  if (date && updated && isValidDateFormat(date) && isValidDateFormat(updated)) {
    if (updated < date) {
      if (includeWarnings) {
        issues.push(
          createIssue(
            "DATE_ORDER_WARNING",
            `'updated' date (${updated}) is before 'date' field (${date})`,
            "warning",
            {
              filePath,
              line,
              value: { date, updated },
              suggestion: "Check if the dates are correct"
            }
          )
        );
      }
    }
  }
  const importantStringFields = ["title", "description", "author", "type"];
  for (const field of importantStringFields) {
    const value = data[field];
    if (typeof value === "string" && value.trim() === "") {
      if (includeWarnings) {
        issues.push(
          createIssue(
            "EMPTY_FIELD",
            `Field '${field}' is empty`,
            "warning",
            {
              filePath,
              line,
              value,
              suggestion: `Provide a meaningful value for '${field}' or remove the field`
            }
          )
        );
      }
    }
  }
  const arrayFields = ["tags", "labels", "authors"];
  for (const field of arrayFields) {
    const value = data[field];
    if (Array.isArray(value) && value.length === 0) {
      if (includeWarnings) {
        issues.push(
          createIssue(
            "EMPTY_ARRAY",
            `Field '${field}' is an empty array`,
            "warning",
            {
              filePath,
              line,
              suggestion: `Add items to '${field}' or remove the field`
            }
          )
        );
      }
    }
  }
  const version = data.version;
  if (typeof version === "string") {
    if (!/^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/.test(version)) {
      issues.push(
        createIssue(
          "INVALID_VERSION",
          `Version '${version}' is not a valid SemVer string`,
          "error",
          {
            filePath,
            line,
            value: version,
            expected: "SemVer format (e.g., 1.0.0, 1.0.0-alpha.1)",
            suggestion: "Use SemVer format: MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]"
          }
        )
      );
    }
  }
  const dateFields = ["date", "created", "updated"];
  for (const field of dateFields) {
    const value = data[field];
    if (typeof value === "string") {
      if (!isValidDate3(value)) {
        issues.push(
          createIssue(
            "INVALID_DATE",
            `Field '${field}' contains invalid date: ${value}`,
            "error",
            {
              filePath,
              line,
              value,
              expected: "YYYY-MM-DD format with valid date values",
              suggestion: "Use a valid date in YYYY-MM-DD format (e.g., 2025-01-15)"
            }
          )
        );
      }
    }
  }
  return issues;
}
function isValidDateFormat(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}
function isValidDate3(dateStr) {
  if (!isValidDateFormat(dateStr)) {
    return false;
  }
  const parts = dateStr.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year === void 0 || month === void 0 || day === void 0) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
function categorizeIssues2(issues, result) {
  for (const issue of issues) {
    switch (issue.severity) {
      case "error":
        result.errors.push(issue);
        break;
      case "warning":
        result.warnings.push(issue);
        break;
      case "info":
        result.info.push(issue);
        break;
    }
  }
}
async function validateMultipleFrontmatter(filePaths, options = {}) {
  const startTime = Date.now();
  const result = createEmptyResult();
  for (const filePath of filePaths) {
    const fileResult = await validateFrontmatter(filePath, options);
    result.errors.push(...fileResult.errors);
    result.warnings.push(...fileResult.warnings);
    result.info.push(...fileResult.info);
    if (fileResult.itemCount) {
      result.itemCount = (result.itemCount ?? 0) + fileResult.itemCount;
    }
  }
  result.valid = result.errors.length === 0;
  result.duration = Date.now() - startTime;
  return result;
}
function createFrontmatterSchema(docType, requiredFields = ["type", "title"], additionalProperties = {}) {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: `pkf-frontmatter-${docType}.schema.json`,
    type: "object",
    required: requiredFields,
    properties: {
      type: {
        type: "string",
        const: docType,
        description: "Document type identifier"
      },
      title: {
        type: "string",
        minLength: 1,
        description: "Document title"
      },
      version: {
        type: "string",
        pattern: "^\\d+\\.\\d+\\.\\d+(-[\\w.]+)?(\\+[\\w.]+)?$",
        description: "SemVer version string"
      },
      status: {
        type: "string",
        enum: ["draft", "review", "approved", "deprecated", "archived", "active", "inactive"],
        description: "Document status"
      },
      date: {
        type: "string",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        description: "Date in YYYY-MM-DD format"
      },
      created: {
        type: "string",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        description: "Creation date"
      },
      updated: {
        type: "string",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        description: "Last update date"
      },
      author: {
        type: "string",
        description: "Document author"
      },
      authors: {
        type: "array",
        items: { type: "string" },
        description: "List of authors"
      },
      description: {
        type: "string",
        description: "Document description"
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Document tags"
      },
      ...additionalProperties
    },
    additionalProperties: true
  };
}

// src/parsers/schema-dsl-parser.ts
import { parse as parseYaml5 } from "yaml";
var SchemaDSLParser = class {
  rawDSL = null;
  parsed = null;
  errors = [];
  filePath = null;
  /**
   * Parse Schema DSL from a YAML string
   *
   * @param yamlContent - YAML content to parse
   * @param filePath - Optional file path for error reporting
   * @returns Parsed schema DSL or null if parsing failed
   */
  parse(yamlContent, filePath) {
    this.errors = [];
    this.filePath = filePath || null;
    try {
      const raw = parseYaml5(yamlContent);
      this.rawDSL = raw;
      if (!this.validateStructure(raw)) {
        return null;
      }
      const schemas = this.parseSchemas(raw.schemas);
      if (!schemas) {
        return null;
      }
      const relationships = this.buildRelationships(schemas);
      const resolvedSchemas = this.resolveInheritance(schemas, relationships);
      if (!resolvedSchemas) {
        return null;
      }
      this.parsed = {
        version: raw.version,
        schemas,
        relationships,
        resolvedSchemas
      };
      return this.parsed;
    } catch (error) {
      this.addError(
        "DSL_PARSE_ERROR",
        `Failed to parse Schema DSL: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }
  /**
   * Parse Schema DSL from a file
   *
   * @param filePath - Path to the YAML file
   * @returns Parsed schema DSL or null if parsing failed
   */
  async parseFile(filePath) {
    this.filePath = filePath;
    this.errors = [];
    if (!await fileExists(filePath)) {
      this.addError("FILE_NOT_FOUND", `Schema DSL file not found: ${filePath}`);
      return null;
    }
    try {
      const content = await readTextFile(filePath);
      return this.parse(content, filePath);
    } catch (error) {
      this.addError(
        "FILE_READ_ERROR",
        `Failed to read Schema DSL file: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }
  /**
   * Get parsing errors
   */
  getErrors() {
    return [...this.errors];
  }
  /**
   * Get the last parsed result
   */
  getResult() {
    return this.parsed;
  }
  /**
   * Convert a parsed schema to JSON Schema format
   *
   * @param schemaName - Name of the schema to convert
   * @param useResolved - Whether to use resolved (inheritance merged) schema
   * @returns JSON Schema object or null if schema not found
   */
  toJsonSchema(schemaName, useResolved = true) {
    if (!this.parsed) {
      return null;
    }
    const schemaMap = useResolved ? this.parsed.resolvedSchemas : this.parsed.schemas;
    const schema = schemaMap.get(schemaName);
    if (!schema) {
      return null;
    }
    return this.schemaDefinitionToJsonSchema(schema);
  }
  /**
   * Convert all parsed schemas to JSON Schema format
   *
   * @param useResolved - Whether to use resolved (inheritance merged) schemas
   * @returns Map of schema names to JSON Schema objects
   */
  toAllJsonSchemas(useResolved = true) {
    const result = /* @__PURE__ */ new Map();
    if (!this.parsed) {
      return result;
    }
    const schemaMap = useResolved ? this.parsed.resolvedSchemas : this.parsed.schemas;
    for (const [name, schema] of schemaMap) {
      const jsonSchema = this.schemaDefinitionToJsonSchema(schema);
      result.set(name, jsonSchema);
    }
    return result;
  }
  // ============================================================================
  // Private Methods
  // ============================================================================
  /**
   * Add an error to the error list
   */
  addError(code, message, line) {
    this.errors.push(
      createIssue(code, message, "error", {
        filePath: this.filePath || void 0,
        line
      })
    );
  }
  /**
   * Validate the basic structure of the raw DSL
   */
  validateStructure(raw) {
    if (!raw || typeof raw !== "object") {
      this.addError("INVALID_STRUCTURE", "Schema DSL must be a valid YAML object");
      return false;
    }
    if (!raw.version) {
      this.addError("MISSING_VERSION", 'Schema DSL must have a "version" field');
      return false;
    }
    if (!/^\d+\.\d+$/.test(raw.version)) {
      this.addError(
        "INVALID_VERSION",
        `Invalid version format: "${raw.version}". Expected format: "X.Y" (e.g., "1.0")`
      );
      return false;
    }
    if (!raw.schemas || typeof raw.schemas !== "object") {
      this.addError("MISSING_SCHEMAS", 'Schema DSL must have a "schemas" object');
      return false;
    }
    if (Object.keys(raw.schemas).length === 0) {
      this.addError("EMPTY_SCHEMAS", "Schema DSL must define at least one schema");
      return false;
    }
    return true;
  }
  /**
   * Parse all schema definitions
   */
  parseSchemas(rawSchemas) {
    const schemas = /* @__PURE__ */ new Map();
    let hasErrors = false;
    for (const [name, rawSchema] of Object.entries(rawSchemas)) {
      if (!/^[a-z][a-z0-9-]*$/.test(name)) {
        this.addError(
          "INVALID_SCHEMA_NAME",
          `Invalid schema name: "${name}". Must be lowercase alphanumeric with hyphens, starting with a letter.`
        );
        hasErrors = true;
        continue;
      }
      const schema = this.parseSchemaDefinition(name, rawSchema);
      if (schema) {
        schemas.set(name, schema);
      } else {
        hasErrors = true;
      }
    }
    return hasErrors && schemas.size === 0 ? null : schemas;
  }
  /**
   * Parse a single schema definition
   */
  parseSchemaDefinition(name, raw) {
    if (!raw || typeof raw !== "object") {
      this.addError("INVALID_SCHEMA", `Schema "${name}" must be an object`);
      return null;
    }
    const metadata = {
      description: raw._description,
      examples: raw._examples,
      deprecated: raw._deprecated,
      version: raw._version
    };
    const fields = [];
    if (raw.properties && typeof raw.properties === "object") {
      for (const [propName, propDef] of Object.entries(raw.properties)) {
        if (!/^[a-z][a-z0-9_-]*$/.test(propName)) {
          this.addError(
            "INVALID_PROPERTY_NAME",
            `Invalid property name "${propName}" in schema "${name}". Must be lowercase alphanumeric with hyphens/underscores, starting with a letter.`
          );
          continue;
        }
        const field = this.parseFieldDefinition(name, propName, propDef);
        if (field) {
          fields.push(field);
        }
      }
    }
    return {
      name,
      extends: raw._extends,
      fields,
      metadata
    };
  }
  /**
   * Parse a single field definition
   */
  parseFieldDefinition(schemaName, fieldName, raw) {
    if (!raw || typeof raw !== "object") {
      this.addError(
        "INVALID_PROPERTY",
        `Property "${fieldName}" in schema "${schemaName}" must be an object`
      );
      return null;
    }
    if (!raw.type) {
      this.addError(
        "MISSING_TYPE",
        `Property "${fieldName}" in schema "${schemaName}" must have a "type" field`
      );
      return null;
    }
    const validTypes = ["string", "number", "boolean", "date", "array", "object"];
    if (!validTypes.includes(raw.type)) {
      this.addError(
        "INVALID_TYPE",
        `Property "${fieldName}" in schema "${schemaName}" has invalid type "${raw.type}". Must be one of: ${validTypes.join(", ")}`
      );
      return null;
    }
    const field = {
      name: fieldName,
      type: raw.type,
      required: raw.required ?? false,
      description: raw.description,
      defaultValue: raw.default,
      enum: raw.enum,
      pattern: raw.pattern,
      minimum: raw.minimum,
      maximum: raw.maximum,
      minLength: raw.minLength,
      maxLength: raw.maxLength,
      minItems: raw.minItems,
      maxItems: raw.maxItems,
      uniqueItems: raw.uniqueItems
    };
    if (raw.type === "array" && raw.items) {
      field.items = {
        type: raw.items.type || "string",
        enum: raw.items.enum,
        pattern: raw.items.pattern
      };
    }
    this.validateFieldConstraints(schemaName, field);
    return field;
  }
  /**
   * Validate field constraints are appropriate for the field type
   */
  validateFieldConstraints(schemaName, field) {
    const { name, type } = field;
    if (type !== "string" && type !== "date") {
      if (field.pattern !== void 0) {
        this.errors.push(
          createIssue(
            "INVALID_CONSTRAINT",
            `Property "${name}" in schema "${schemaName}": "pattern" is only valid for string/date types`,
            "warning",
            { filePath: this.filePath || void 0 }
          )
        );
      }
      if (field.minLength !== void 0 || field.maxLength !== void 0) {
        this.errors.push(
          createIssue(
            "INVALID_CONSTRAINT",
            `Property "${name}" in schema "${schemaName}": "minLength/maxLength" are only valid for string types`,
            "warning",
            { filePath: this.filePath || void 0 }
          )
        );
      }
    }
    if (type !== "number") {
      if (field.minimum !== void 0 || field.maximum !== void 0) {
        this.errors.push(
          createIssue(
            "INVALID_CONSTRAINT",
            `Property "${name}" in schema "${schemaName}": "minimum/maximum" are only valid for number types`,
            "warning",
            { filePath: this.filePath || void 0 }
          )
        );
      }
    }
    if (type !== "array") {
      if (field.items !== void 0 || field.minItems !== void 0 || field.maxItems !== void 0 || field.uniqueItems !== void 0) {
        this.errors.push(
          createIssue(
            "INVALID_CONSTRAINT",
            `Property "${name}" in schema "${schemaName}": array constraints are only valid for array types`,
            "warning",
            { filePath: this.filePath || void 0 }
          )
        );
      }
    }
  }
  /**
   * Build inheritance relationships from parsed schemas
   */
  buildRelationships(schemas) {
    const relationships = [];
    for (const [name, schema] of schemas) {
      if (schema.extends) {
        relationships.push({
          child: name,
          parent: schema.extends
        });
      }
    }
    return relationships;
  }
  /**
   * Resolve schema inheritance by merging parent fields into children
   */
  resolveInheritance(schemas, relationships) {
    const resolved = /* @__PURE__ */ new Map();
    const visited = /* @__PURE__ */ new Set();
    const visiting = /* @__PURE__ */ new Set();
    for (const rel of relationships) {
      if (!schemas.has(rel.parent)) {
        this.addError(
          "UNKNOWN_PARENT",
          `Schema "${rel.child}" extends unknown schema "${rel.parent}"`
        );
        return null;
      }
    }
    const resolveSchema = (name) => {
      if (resolved.has(name)) {
        return resolved.get(name);
      }
      if (visiting.has(name)) {
        this.addError(
          "CIRCULAR_INHERITANCE",
          `Circular inheritance detected involving schema "${name}"`
        );
        return null;
      }
      const schema = schemas.get(name);
      if (!schema) {
        return null;
      }
      visiting.add(name);
      let resolvedFields;
      if (schema.extends) {
        const parentResolved = resolveSchema(schema.extends);
        if (!parentResolved) {
          visiting.delete(name);
          return null;
        }
        const fieldMap = /* @__PURE__ */ new Map();
        for (const field of parentResolved.fields) {
          fieldMap.set(field.name, { ...field });
        }
        for (const field of schema.fields) {
          fieldMap.set(field.name, { ...field });
        }
        resolvedFields = Array.from(fieldMap.values());
      } else {
        resolvedFields = schema.fields.map((f) => ({ ...f }));
      }
      const resolvedSchema = {
        name: schema.name,
        extends: schema.extends,
        fields: resolvedFields,
        metadata: { ...schema.metadata }
      };
      visiting.delete(name);
      visited.add(name);
      resolved.set(name, resolvedSchema);
      return resolvedSchema;
    };
    for (const name of schemas.keys()) {
      if (!resolveSchema(name)) {
        return null;
      }
    }
    return resolved;
  }
  /**
   * Convert a SchemaDefinition to JSON Schema format
   */
  schemaDefinitionToJsonSchema(schema) {
    const jsonSchema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object"
    };
    if (schema.metadata.description) {
      jsonSchema.description = schema.metadata.description;
    }
    const required = [];
    const properties = {};
    for (const field of schema.fields) {
      if (field.required) {
        required.push(field.name);
      }
      properties[field.name] = this.fieldToJsonSchemaProperty(field);
    }
    if (required.length > 0) {
      jsonSchema.required = required;
    }
    if (Object.keys(properties).length > 0) {
      jsonSchema.properties = properties;
    }
    return jsonSchema;
  }
  /**
   * Convert a SchemaField to a JSON Schema property definition
   */
  fieldToJsonSchemaProperty(field) {
    const prop = {};
    switch (field.type) {
      case "string":
        prop.type = "string";
        break;
      case "number":
        prop.type = "number";
        break;
      case "boolean":
        prop.type = "boolean";
        break;
      case "date":
        prop.type = "string";
        prop.format = "date";
        break;
      case "array":
        prop.type = "array";
        break;
      case "object":
        prop.type = "object";
        break;
    }
    if (field.description) {
      prop.description = field.description;
    }
    if (field.defaultValue !== void 0) {
      const defaultStr = String(field.defaultValue);
      if (!defaultStr.startsWith("{{") || !defaultStr.endsWith("}}")) {
        prop.default = field.defaultValue;
      }
    }
    if (field.enum && field.enum.length > 0) {
      prop.enum = field.enum;
    }
    if (field.pattern && (field.type === "string" || field.type === "date")) {
      prop.pattern = field.pattern;
    }
    if (field.type === "number") {
      if (field.minimum !== void 0) {
        prop.minimum = field.minimum;
      }
      if (field.maximum !== void 0) {
        prop.maximum = field.maximum;
      }
    }
    if (field.type === "string") {
      if (field.minLength !== void 0) {
        prop.minLength = field.minLength;
      }
      if (field.maxLength !== void 0) {
        prop.maxLength = field.maxLength;
      }
    }
    if (field.type === "array") {
      if (field.items) {
        const itemSchema = {
          type: field.items.type === "date" ? "string" : field.items.type
        };
        if (field.items.type === "date") {
          itemSchema.format = "date";
        }
        if (field.items.enum) {
          itemSchema.enum = field.items.enum;
        }
        if (field.items.pattern) {
          itemSchema.pattern = field.items.pattern;
        }
        prop.items = itemSchema;
      }
      if (field.minItems !== void 0) {
        prop.minItems = field.minItems;
      }
      if (field.maxItems !== void 0) {
        prop.maxItems = field.maxItems;
      }
      if (field.uniqueItems !== void 0) {
        prop.uniqueItems = field.uniqueItems;
      }
    }
    return prop;
  }
};
function parseSchemasDSL(yamlContent, filePath) {
  const parser = new SchemaDSLParser();
  const result = parser.parse(yamlContent, filePath);
  return {
    result,
    errors: parser.getErrors()
  };
}
async function parseSchemasDSLFile(filePath) {
  const parser = new SchemaDSLParser();
  const result = await parser.parseFile(filePath);
  return {
    result,
    errors: parser.getErrors()
  };
}
function schemaDSLToJsonSchema(yamlContent, schemaName, useResolved = true) {
  const parser = new SchemaDSLParser();
  const parseResult = parser.parse(yamlContent);
  if (!parseResult) {
    return {
      schemas: null,
      errors: parser.getErrors()
    };
  }
  if (schemaName) {
    const jsonSchema = parser.toJsonSchema(schemaName, useResolved);
    if (!jsonSchema) {
      return {
        schemas: null,
        errors: [
          createIssue("SCHEMA_NOT_FOUND", `Schema "${schemaName}" not found in DSL`, "error")
        ]
      };
    }
    const result = /* @__PURE__ */ new Map();
    result.set(schemaName, jsonSchema);
    return { schemas: result, errors: [] };
  }
  return {
    schemas: parser.toAllJsonSchemas(useResolved),
    errors: parser.getErrors()
  };
}
function validateSchemaDSL(yamlContent, filePath) {
  const startTime = Date.now();
  const result = createEmptyResult();
  const parser = new SchemaDSLParser();
  const parseResult = parser.parse(yamlContent, filePath);
  const errors = parser.getErrors();
  for (const issue of errors) {
    if (issue.severity === "error") {
      result.errors.push(issue);
    } else if (issue.severity === "warning") {
      result.warnings.push(issue);
    } else {
      result.info.push(issue);
    }
  }
  if (parseResult) {
    result.itemCount = parseResult.schemas.size;
    result.info.push(
      createIssue(
        "SCHEMAS_PARSED",
        `Successfully parsed ${parseResult.schemas.size} schema(s): ${Array.from(parseResult.schemas.keys()).join(", ")}`,
        "info",
        { filePath }
      )
    );
    if (parseResult.relationships.length > 0) {
      result.info.push(
        createIssue(
          "INHERITANCE_RESOLVED",
          `Resolved ${parseResult.relationships.length} inheritance relationship(s)`,
          "info",
          { filePath }
        )
      );
    }
  }
  result.valid = result.errors.length === 0;
  result.duration = Date.now() - startTime;
  return result;
}
async function validateSchemaDSLFile(filePath) {
  const startTime = Date.now();
  if (!await fileExists(filePath)) {
    const result = createEmptyResult();
    result.errors.push(
      createIssue("FILE_NOT_FOUND", `Schema DSL file not found: ${filePath}`, "error", {
        filePath
      })
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }
  try {
    const content = await readTextFile(filePath);
    return validateSchemaDSL(content, filePath);
  } catch (error) {
    const result = createEmptyResult();
    result.errors.push(
      createIssue(
        "FILE_READ_ERROR",
        `Failed to read Schema DSL file: ${error instanceof Error ? error.message : String(error)}`,
        "error",
        { filePath }
      )
    );
    result.valid = false;
    result.duration = Date.now() - startTime;
    return result;
  }
}

// src/index.ts
import { join as join3 } from "path";
async function validateAll(options = {}) {
  const startTime = Date.now();
  const rootDir = options.rootDir || process.cwd();
  const registersPath = getRegistersPath(rootDir);
  const results = [];
  let itemCount = 0;
  if (!options.skipConfig) {
    const configPath = join3(rootDir, "pkf.config.yaml");
    if (await fileExists(configPath)) {
      const configResult = await validateConfig({ ...options, rootDir });
      results.push(configResult);
      itemCount++;
    }
  }
  if (!options.skipTodo) {
    const todoPath = join3(registersPath, "TODO.md");
    if (await fileExists(todoPath)) {
      const todoResult = await validateTodo(todoPath, options);
      results.push(todoResult);
      itemCount += todoResult.itemCount ?? 1;
    }
  }
  if (!options.skipIssues) {
    const issuesPath = join3(registersPath, "ISSUES.md");
    if (await fileExists(issuesPath)) {
      const issuesResult = await validateIssues(issuesPath, options);
      results.push(issuesResult);
      itemCount += issuesResult.itemCount ?? 1;
    }
  }
  if (!options.skipChangelog) {
    const changelogPath = join3(registersPath, "CHANGELOG.md");
    if (await fileExists(changelogPath)) {
      const changelogResult = await validateChangelog(changelogPath, options);
      results.push(changelogResult);
      itemCount += changelogResult.itemCount ?? 1;
    }
  }
  const merged = results.length > 0 ? mergeResults(...results) : createEmptyResult();
  merged.duration = Date.now() - startTime;
  merged.itemCount = itemCount;
  return merged;
}

export {
  createEmptyResult,
  createIssue,
  mergeResults,
  validateConfig,
  loadConfig,
  validateTodo,
  validateIssues,
  parseIssues,
  validateChangelog,
  changelogValidator,
  extractFrontmatter,
  validateFrontmatterContent,
  validateFrontmatter,
  validateMultipleFrontmatter,
  createFrontmatterSchema,
  SchemaDSLParser,
  parseSchemasDSL,
  parseSchemasDSLFile,
  schemaDSLToJsonSchema,
  validateSchemaDSL,
  validateSchemaDSLFile,
  validateAll
};
//# sourceMappingURL=chunk-Y7W4M4I3.js.map