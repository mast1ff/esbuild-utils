import * as path from "node:path";
import { performance } from "node:perf_hooks";
import * as fs from "fs-extra";
import colors from "picocolors";
import { build, BuildFailure } from "esbuild";
import { loadConfigFromFile, LoadConfigResult } from "./config";
import "./types";

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

function runCli(cli: CLIOption) {
  const packagePath = require.resolve(`${cli.package}/package.json`);
  const pkg = require(packagePath);
  require(path.resolve(path.dirname(packagePath), pkg.bin[cli.binName]));
}

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
  if (!cli.installed) {
    const notify = `CLI for esbuild must be installed.\n ${cli.name} (${cli.url})\n`;
    console.error(notify);

    let packagemanager;
    if (fs.existsSync(path.resolve(process.cwd(), "yarn.lock"))) {
      packagemanager = `yarn`;
    } else if (fs.existsSync(path.resolve(process.cwd(), "pnpm-lock.yaml"))) {
      packagemanager = `pnpm`;
    } else {
      packagemanager = `npm`;
    }

    const installOptions = [packagemanager === "yarn" ? "add" : "install", "-D"];

    console.error(
      `We will use "${packagemanager}" to install the package via ${packagemanager} ${installOptions.join(" ")} ${
        cli.package
      }`
    );
  } else {
    const args = process.argv.slice(2);

    if (args[0] === "--help") {
      console.log(`*** @esbuild-utils/cli ***\n`);
      console.log(`Usage:`);
      console.log(`  esbuild [options]`);
      console.log(`\n`);
      console.log(`Options:`);
      console.log(`  --config=...        The config file`);
    }

    const arg = args[0];
    const specifyConfig = typeof arg === "string" && /^--config=(.*)/.test(arg);
    if (typeof args[0] === "undefined" || specifyConfig) {
      let configResult: LoadConfigResult | null;
      if (specifyConfig) {
        const configFile = arg.split("=")[1];
        if (typeof configFile === "undefined") {
          throw new Error(`config file path is required`);
        }
        configResult = await loadConfigFromFile(configFile);
      } else {
        configResult = await loadConfigFromFile();
      }

      if (configResult) {
        const { config: configs } = configResult;

        for (const _config of configs) {
          const start = performance.now();
          const { onBuildFailure, onBuildSuccess, ...config } = _config;
          await build({
            ...config,
            watch: config.watch
              ? {
                  onRebuild(err, res) {
                    if (err) {
                      console.error(colors.red(`[esbuild] Build failure\n`));
                      console.error(String(err.stack));
                      onBuildFailure?.(err);
                    }
                    if (res) {
                      console.log(colors.green(`[esbuild] ReBuilt`));
                      onBuildSuccess?.(res);
                    }
                    if (typeof config.watch === "object") {
                      config.watch.onRebuild?.(err, res);
                    }
                  }
                }
              : false
          })
            .then((build) => {
              console.log(colors.green(`[esbuild] Built in ${(performance.now() - start).toFixed(2)}ms`));
              onBuildSuccess?.(build);
            })
            .catch((err: Error | BuildFailure) => {
              console.error(colors.red(`[esbuild] Build failure\n`));
              console.error(String(err.stack));
              onBuildFailure?.(err);
            });
        }
        return;
      }
    }
    runCli(cli);
  }
}

run();
