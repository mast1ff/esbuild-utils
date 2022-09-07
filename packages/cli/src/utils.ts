import * as os from "node:os";
import * as path from "node:path";
import { createRequire } from "node:module";
import * as fs from "fs-extra";
import debug from "debug";

/** Debugger */

const filter = process.env.DEBUG_FILTER;
const DEBUG = process.env.DEBUG;

interface DebuggerOptions {
  onlyWhenFocused?: boolean | string;
}

type DebuggerNamespace = `esbuild-utils:cli:${string}`;

export function createDebugger(namespace: DebuggerNamespace = `esbuild-utils:cli:core`, options: DebuggerOptions = {}) {
  const log = debug("esbuild-utils:cli");
  const { onlyWhenFocused } = options;
  const focus = typeof onlyWhenFocused === "string" ? onlyWhenFocused : namespace;
  return (msg: string, ...args: any[]) => {
    if (filter && !msg.includes(filter)) {
      return;
    }
    if (options.onlyWhenFocused && !DEBUG?.includes(focus)) {
      return;
    }

    log(msg, ...args);
  };
}

/** File utils */

interface LookupFileOptions {
  pathOnly?: boolean;
  rootDir?: string;
  predicate?: (file: string) => boolean;
}

export function lookupFile(dir: string, formats: string[], options?: LookupFileOptions): string | undefined {
  for (const format of formats) {
    const fullPath = path.join(dir, format);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const result = options?.pathOnly ? fullPath : fs.readFileSync(fullPath, "utf-8");
      if (!options?.predicate || options.predicate(result)) {
        return result;
      }
    }
  }
  const parentDir = path.dirname(dir);
  if (parentDir !== dir && (!options?.rootDir || parentDir.startsWith(options?.rootDir))) {
    return lookupFile(parentDir, formats, options);
  }
}

/** System utils */

export const isWindows = os.platform() === "win32";

export function isObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === `[object Object]`;
}

export function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? slash(id) : id);
}

export function slash(p: string): string {
  return p.replace(/\\/g, "/");
}

const _require = createRequire(import.meta.url);

// @ts-expect-error
export const usingDynamicImport = typeof jest === "undefined";

export const dynamicImport = usingDynamicImport ? new Function("file", "return import(file)") : _require;
