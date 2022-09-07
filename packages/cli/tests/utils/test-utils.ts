import { exec } from "node:child_process";
import * as path from "node:path";
import { Writable } from "readable-stream";
import execa, { node as execaNode, ExecaChildProcess, NodeOptions } from "execa";
import stripAnsi from "strip-ansi";
import * as internalIp from "internal-ip";

const PACKAGE_PATH = path.resolve(__dirname, "../../dist/index.js");
const isWindows = process.platform === "win32";

function processKill(process: ExecaChildProcess) {
  if (isWindows) {
    exec(`taskkill /pid ${process.pid} /T /F`);
  } else {
    process.kill();
  }
}

export function createProcess(cwd: string, args: string[], options: NodeOptions = {}) {
  const { nodeOptions = [] } = options;
  const processExecutor = nodeOptions.length ? execaNode : execa;

  return processExecutor(PACKAGE_PATH, args, {
    cwd: path.resolve(cwd),
    reject: false,
    stdio: "pipe",
    maxBuffer: Infinity,
    env: {},
    ...options
  });
}

export async function run(cwd: string, args: string[] = [], options: NodeOptions = {}) {
  return createProcess(cwd, args, options);
}

export function runWatch(
  cwd: string,
  args: string[] = [],
  _options: NodeOptions & {
    killString?: RegExp;
  } = {}
) {
  return new Promise((resolve, reject) => {
    const { killString, ...options } = _options;
    const process = createProcess(cwd, args, options);
    const outputKillStr = killString || /esbuild-utils \d+\.\d+\.\d/;

    process.stdout?.pipe(
      new Writable({
        write(chunk, _encoding, callback) {
          const output = stripAnsi(chunk.toString("utf8"));

          if (outputKillStr.test(output)) {
            processKill(process);
          }

          callback();
        }
      })
    );

    process.stderr?.pipe(
      new Writable({
        write(chunk, _encoding, callback) {
          const output = stripAnsi(chunk.toString("utf8"));

          if (outputKillStr.test(output)) {
            processKill(process);
          }

          callback();
        }
      })
    );

    process
      .then((result) => {
        resolve(result);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

const normalizeVersions = (output: string) => {
  return output.replace(
    /(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/gi,
    "x.x.x"
  );
};

const normalizeCwd = (output: string) => {
  return output.replace(/\\/g, "/").replace(new RegExp(process.cwd().replace(/\\/g, "/"), "g"), "<cwd>");
};

const normalizeError = (output: string) => {
  return output
    .replace(/SyntaxError: .+/, "SyntaxError: <error-message>")
    .replace(/\s+at .+(}|\)|\d)/gs, "\n    at stack");
};

export const normalizeStdout = (stdout: string) => {
  if (typeof stdout !== "string") {
    return stdout;
  }

  if (stdout.length === 0) {
    return stdout;
  }

  let normalizedStdout = stripAnsi(stdout);
  normalizedStdout = normalizeCwd(normalizedStdout);
  normalizedStdout = normalizeVersions(normalizedStdout);
  normalizedStdout = normalizeError(normalizedStdout);

  return normalizedStdout;
};

export const normalizeStderr = (stderr: string) => {
  if (typeof stderr !== "string") {
    return stderr;
  }

  if (stderr.length === 0) {
    return stderr;
  }

  let normalizedStderr: string = stripAnsi(stderr);
  normalizedStderr = normalizeCwd(normalizedStderr);

  const networkIPv4 = internalIp.v4.sync();

  if (networkIPv4) {
    normalizedStderr = normalizedStderr.replace(new RegExp(networkIPv4, "g"), "<network-ip-v4>");
  }

  const networkIPv6 = internalIp.v6.sync();

  if (networkIPv6) {
    normalizedStderr = normalizedStderr.replace(new RegExp(networkIPv6, "g"), "<network-ip-v6>");
  }

  normalizedStderr = normalizedStderr.replace(/:[0-9]+\//g, ":<port>/");

  if (!/On Your Network \(IPv6\)/.test(stderr)) {
    // Github Actions doesn't' support IPv6 on ubuntu in some cases
    const err: string[] = normalizedStderr.split("\n");

    const ipv4MessageIndex = err.findIndex((item) => /On Your Network \(IPv4\)/.test(item));

    if (ipv4MessageIndex !== -1) {
      err.splice(
        ipv4MessageIndex + 1,
        0,
        "<i> [webpack-dev-server] On Your Network (IPv6): http://[<network-ip-v6>]:<port>/"
      );
    }

    normalizedStderr = err.join("\n");
  }

  // the warning below is causing CI failure on some jobs
  if (/Gracefully shutting down/.test(stderr)) {
    normalizedStderr = normalizedStderr.replace(
      "\n<i> [webpack-dev-server] Gracefully shutting down. To force exit, press ^C again. Please wait...",
      ""
    );
  }

  normalizedStderr = normalizeVersions(normalizedStderr);
  normalizedStderr = normalizeError(normalizedStderr);

  return normalizedStderr;
};
