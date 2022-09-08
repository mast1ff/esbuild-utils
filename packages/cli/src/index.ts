import * as path from "node:path";
import { performance } from "node:perf_hooks";
import * as fs from "fs-extra";
import colors from "picocolors";
import * as esbuild from "esbuild";
import cac from "cac";
import { loadConfigFromFile } from "./config";
import { init } from "./commands/init";
import { build } from "./commands/build";

function isInstalled(packageName: string): boolean {
  if (process.versions.pnp) {
    return true;
  }

  let dir = __dirname;

  do {
    try {
      if (fs.statSync(path.join(dir, "node_modules", packageName)).isDirectory()) {
        return true;
      }
    } catch (err) {
      //
    }
  } while (dir !== (dir = path.dirname(dir)));

  return false;
}

const commands = cac("esbuild-cli");

commands
  .command("init", `Create a config file for esbuild.`)
  .option(`--typescript`, `Create a TypeScript config file.`)
  .option(`-i, --input <file>`, `Add entrypoints to the config file.`)
  .option(`-o, --output <file>`, `Add output file option to the config file.`)
  .action(async (options) => {
    let ts = false;
    let filename = `esbuild.config.js`;
    const input: string | undefined = options.input;
    const output: string | undefined = options.output;
    if (options.typescript) {
      ts = true;
      filename = `esbuild.config.ts`;
    }

    const file = path.resolve(process.cwd(), filename);

    await init(file, { ts, input, output })
      .then(() => {
        console.log(colors.green(`[esbuild] Initialized in ${path.dirname(file)}`));
      })
      .catch((err) => {
        console.error(colors.red(`[esbuild] Initialization failure`));
        console.error(colors.red(`  ${err?.message}`));
        console.error(String(err.stack));
      });
  });

commands
  .command("build", `Perform build with options in config file.`)
  .option(`-c, --config <file>`, `Specifies the config file to be read.`)
  .action(async (options) => {
    const configFile = options.config || undefined;
    const loadResult = await loadConfigFromFile(configFile);
    if (!loadResult) {
      throw new Error(`Could not load config file.`);
    }

    for (const config of loadResult.config) {
      const start = performance.now();
      await build(config)
        .then((build) => {
          console.log(colors.green(`[esbuild] Built in ${(performance.now() - start).toFixed(2)}ms`));
          build.outputFiles?.forEach((file) => {
            console.log(`    ${file.path}  ${file.contents.byteLength}b`);
          });
        })
        .catch((err: Error | esbuild.BuildFailure) => {
          console.error(colors.red(`[esbuild] Build failure`));
          console.error(colors.red(`  ${err.message}`));
          console.error(String(err.stack));
        });
    }
  });

commands.option(`-v, --version`, `Display version number`);
commands.help();

interface CLIOption {
  name: string;
  package: string;
  binName: string;
  installed: boolean;
  url: string;
}

const cli: CLIOption = {
  name: "esbuild",
  package: "esbuild",
  binName: "esbuild",
  installed: isInstalled("esbuild"),
  url: `https://github.com/evanw/esbuild`
};

async function run() {
  let packagemanager;
  if (fs.existsSync(path.resolve(process.cwd(), "yarn.lock"))) {
    packagemanager = `yarn`;
  } else if (fs.existsSync(path.resolve(process.cwd(), "pnpm-lock.yaml"))) {
    packagemanager = `pnpm`;
  } else {
    packagemanager = `npm`;
  }

  if (!cli.installed) {
    const notify = `CLI for esbuild must be installed.\n ${cli.name} (${cli.url})\n`;
    console.error(notify);

    const installOptions = [packagemanager === "yarn" ? "add" : "install", "-D"];

    console.error(
      `We will use "${packagemanager}" to install the package via ${packagemanager} ${installOptions.join(" ")} ${
        cli.package
      }`
    );
    process.exit(1);
  }

  const parsed = commands.parse();
  if (parsed.options.version) {
    const pkg = require("../package.json");
    const version = pkg.version;
    console.log(version);
  }
}

run();
