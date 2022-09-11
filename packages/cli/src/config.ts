import * as path from "node:path";
import { performance } from "node:perf_hooks";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import * as fs from "fs-extra";
import { build } from "esbuild";
import colors from "picocolors";
import { createDebugger, dynamicImport, isObject, lookupFile, normalizePath } from "./utils";
import { DEFAULT_CONFIG_FILES } from "./constants";
import { EsbuildConfig } from "./types";

const debug = createDebugger(`esbuild-utils:cli:config`);

export interface LoadConfigResult {
  path: string;
  config: EsbuildConfig[];
  dependencies: string[];
}

export async function loadConfigFromFile(
  configFile?: string,
  configRoot: string = process.cwd()
): Promise<LoadConfigResult | null> {
  const start = performance.now();
  function getTime() {
    return `${(performance.now() - start).toFixed(2)}ms`;
  }

  let resolvedPath: string | undefined;
  if (configFile) {
    resolvedPath = path.resolve(configFile);
  } else {
    for (const filename of DEFAULT_CONFIG_FILES) {
      const filePath = path.resolve(configRoot, filename);
      if (!fs.existsSync(filePath)) continue;

      resolvedPath = filePath;
      break;
    }
  }

  if (!resolvedPath) {
    debug("no config file found.");
    return null;
  }

  let isESM = false;
  if (/\.m[jt]s$/.test(resolvedPath)) {
    isESM = true;
  } else if (/\.c[jt]s$/.test(resolvedPath)) {
    isESM = false;
  } else {
    try {
      const pkg = lookupFile(configRoot, ["package.json"]);
      isESM = !!pkg && JSON.parse(pkg).type === "module";
    } catch (e) {
      //
    }
  }

  try {
    const bundled = await bundleConfigFile(resolvedPath, isESM);
    const config = await loadConfigFromBundledFile(resolvedPath, bundled.code, isESM);
    debug(`bundled config file loaded in ${getTime()}`);

    if (!isObject(config) || !Array.isArray(config)) {
      throw new Error(`config must export an object.`);
    }

    return {
      path: normalizePath(resolvedPath),
      config: resolveConfig(config),
      dependencies: bundled.dependencies
    };
  } catch (e) {
    console.error(colors.red(`failed to load config from ${resolvedPath}`));
    throw e;
  }
}

async function bundleConfigFile(filename: string, isESM: boolean): Promise<{ code: string; dependencies: string[] }> {
  const buildResult = await build({
    absWorkingDir: process.cwd(),
    entryPoints: [filename],
    outfile: "out.js",
    write: false,
    target: ["node14", "node16"],
    platform: "node",
    bundle: true,
    format: isESM ? "esm" : "cjs",
    sourcemap: "inline",
    metafile: true
  });
  const { text } = buildResult.outputFiles[0];
  return {
    code: text,
    dependencies: buildResult.metafile ? Object.keys(buildResult.metafile.inputs) : []
  };
}

interface NodeModuleWithCompile extends NodeModule {
  _compile(code: string, filename: string): any;
}

const _require = createRequire(import.meta.url);
async function loadConfigFromBundledFile(
  fileName: string,
  bundledCode: string,
  isESM: boolean
): Promise<EsbuildConfig | EsbuildConfig[]> {
  if (isESM) {
    const fileBase = `${fileName}.timestamp-${Date.now()}`;
    const fileNameTmp = `${fileBase}.mjs`;
    const fileUrl = `${pathToFileURL(fileBase)}.mjs`;
    fs.writeFileSync(fileNameTmp, bundledCode);
    try {
      return (await dynamicImport(fileUrl)).default;
    } finally {
      try {
        fs.unlinkSync(fileNameTmp);
      } catch {
        // already removed if this function is called twice simultaneously
      }
    }
  } else {
    const extension = path.extname(fileName);
    const realFileName = fs.realpathSync(fileName);
    const loaderExt = extension in _require.extensions ? extension : ".js";
    const defaultLoader = _require.extensions[loaderExt]!;
    _require.extensions[loaderExt] = (module: NodeModule, filename: string) => {
      if (filename === realFileName) {
        (module as NodeModuleWithCompile)._compile(bundledCode, filename);
      } else {
        defaultLoader(module, filename);
      }
    };
    // clear cache in case of server restart
    delete _require.cache[_require.resolve(fileName)];
    const raw = _require(fileName);
    _require.extensions[loaderExt] = defaultLoader;
    return raw.__esModule ? raw.default : raw;
  }
}

function resolveConfig(config: EsbuildConfig | EsbuildConfig[]) {
  if (!Array.isArray(config)) {
    return [config];
  }
  return config;
}
