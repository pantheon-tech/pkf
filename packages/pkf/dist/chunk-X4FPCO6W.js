// src/commands/build.ts
import { existsSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";
import chalk from "chalk";
async function buildCommand(options) {
  const cwd = process.cwd();
  const configPath = options.config || "pkf.config.yaml";
  const outputDir = options.output || ".pkf/generated";
  console.log(chalk.bold("\nPKF Build\n"));
  if (!existsSync(join(cwd, configPath))) {
    console.log(chalk.red(`\u2717 Configuration file not found: ${configPath}`));
    console.log(chalk.gray("  Run `pkf init` to initialize PKF in this project.\n"));
    process.exit(1);
  }
  console.log(chalk.gray(`Config: ${configPath}`));
  console.log(chalk.gray(`Output: ${outputDir}
`));
  const pkfProcessorPaths = [
    join(cwd, "node_modules/.bin/pkf-processor"),
    join(cwd, "node_modules/@pantheon-tech/pkf-processor/dist/cli.js"),
    "pkf-processor"
  ];
  let pkfProcessorPath = null;
  for (const p of pkfProcessorPaths) {
    if (existsSync(p) || p === "pkf-processor") {
      pkfProcessorPath = p;
      break;
    }
  }
  if (!pkfProcessorPath) {
    console.log(chalk.red("\u2717 pkf-processor not found"));
    console.log(chalk.gray("  Install with: npm install @pantheon-tech/pkf-processor\n"));
    process.exit(1);
  }
  const args = [
    "build",
    "--config",
    join(cwd, configPath),
    "--output",
    join(cwd, outputDir)
  ];
  if (options.strict) {
    args.push("--strict");
  }
  const isJsFile = pkfProcessorPath.endsWith(".js");
  const command = isJsFile ? "node" : pkfProcessorPath;
  const cmdArgs = isJsFile ? [pkfProcessorPath, ...args] : args;
  return new Promise((resolve, reject) => {
    const proc = spawn(command, cmdArgs, {
      stdio: "inherit",
      cwd
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        process.exit(code || 1);
      }
      resolve();
    });
    proc.on("error", (err) => {
      console.log(chalk.red("\u2717 Failed to run pkf-processor"));
      console.log(chalk.gray(`  Error: ${err.message}
`));
      process.exit(1);
    });
  });
}

export {
  buildCommand
};
//# sourceMappingURL=chunk-X4FPCO6W.js.map