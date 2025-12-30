#!/usr/bin/env node

// src/cli.ts
import { Command } from "commander";
import chalk from "chalk";
var program = new Command();
program.name("pkf").description("Project Knowledge Framework - Declarative documentation management").version("1.0.0");
program.command("init").description("Initialize PKF in the current project").option("-y, --yes", "Skip prompts and use defaults", false).option("--template <name>", "Use a specific template (minimal, standard, full)", "standard").action(async (options) => {
  const { initCommand } = await import("./init-L5WEA2BP.js");
  await initCommand(options);
});
program.command("build").description("Process pkf.config.yaml and generate validation artifacts").option("-c, --config <path>", "Path to pkf.config.yaml", "pkf.config.yaml").option("-o, --output <dir>", "Output directory for generated artifacts", ".pkf/generated").option("--strict", "Enable strict validation mode", false).action(async (options) => {
  const { buildCommand } = await import("./build-65ZDO6PO.js");
  await buildCommand(options);
});
program.command("validate").description("Validate documentation structure and content").option("-c, --config <path>", "Path to pkf.config.yaml", "pkf.config.yaml").option("--structure", "Validate directory structure only", false).option("--content", "Validate content only (frontmatter, links)", false).option("--fix", "Attempt to auto-fix issues where possible", false).action(async (options) => {
  const { validateCommand } = await import("./validate-L5DUKBUB.js");
  await validateCommand(options);
});
program.command("check").description("Quick validation check (alias for validate)").action(async () => {
  const { validateCommand } = await import("./validate-L5DUKBUB.js");
  await validateCommand({});
});
program.command("status").description("Show PKF status in current project").action(async () => {
  const { statusCommand } = await import("./status-ZOXJYKMG.js");
  await statusCommand();
});
program.showHelpAfterError("(add --help for additional information)");
program.addHelpText("after", `
${chalk.bold("Examples:")}
  ${chalk.gray("# Initialize PKF in current project")}
  $ pkf init

  ${chalk.gray("# Build validation artifacts")}
  $ pkf build

  ${chalk.gray("# Validate documentation")}
  $ pkf validate

  ${chalk.gray("# Quick status check")}
  $ pkf status

${chalk.bold("Documentation:")}
  https://github.com/pantheon-tech/pkf
`);
program.parse();
//# sourceMappingURL=cli.js.map