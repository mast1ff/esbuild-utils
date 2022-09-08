import childProcess from "node:child_process";
import os from "node:os";
import path from "node:path";
import util from "node:util";
import fs from "fs-extra";
import semver from "semver";

const execFile = util.promisify(childProcess.execFile);

const TEMP_DIR = path.join(fs.realpathSync(os.tmpdir()), `esbuild-utils-tests-${Math.random().toString(32).slice(2)}`);
const projectDir = path.join(TEMP_DIR, "app");

beforeAll(async () => {
  await fs.remove(TEMP_DIR);
  await fs.ensureDir(TEMP_DIR);
  await fs.ensureDir(projectDir);
});

afterAll(async () => {
  await fs.remove(TEMP_DIR);
});

async function exec(args: string[], options: Parameters<typeof execFile>[2] = {}) {
  if (process.platform === "win32") {
    const cp = childProcess.spawnSync("node", [path.resolve(__dirname, "../dist/index.js"), ...args], {
      cwd: TEMP_DIR,
      ...options,
      env: {
        ...process.env,
        NO_COLOR: "1",
        ...options?.env
      }
    });

    return {
      stdout: cp.stdout?.toString("utf-8")
    };
  }
  const result = await execFile("node", [path.resolve(__dirname, "../dist/index.js"), ...args], {
    cwd: TEMP_DIR,
    ...options,
    env: {
      ...process.env,
      NO_COLOR: "1",
      ...options?.env
    }
  });
  return {
    ...result,
    stdout: result.stdout.replace(TEMP_DIR, "<TEMP_DIR>").trim()
  };
}

describe("esbuild-cli", () => {
  describe("--help flag", () => {
    test("should prints help info", async () => {
      const { stdout } = await exec(["--help"]);
      expect(stdout.trim()).toMatchInlineSnapshot(`
        "esbuild-cli

        Usage:
          $ esbuild-cli <command> [options]

        Commands:
          init   Create a config file for esbuild.
          build  Perform build with options in config file.

        For more info, run any command with the \`--help\` flag:
          $ esbuild-cli init --help
          $ esbuild-cli build --help

        Options:
          -v, --version  Display version number 
          -h, --help     Display this message"
      `);
    });
  });

  describe("--version flag", () => {
    test("should prints the current version", async () => {
      const { stdout } = await exec(["--version"]);
      expect(!!semver.valid(stdout.trim())).toBe(true);
    });
  });

  describe("init command", () => {
    test("should create a js config file", () => {
      childProcess.spawnSync("node", [path.resolve(__dirname, "../dist/index.js"), "init"], {
        cwd: projectDir,
        env: { ...process.env, NO_COLOR: "1" }
      });

      const configFile = path.join(projectDir, "esbuild.config.js");
      expect(fs.existsSync(configFile)).toBeTruthy();
      fs.removeSync(configFile);
    });

    test("should create a ts config file", () => {
      const projectDir = path.join(TEMP_DIR, "app");
      childProcess.spawnSync("node", [path.resolve(__dirname, "../dist/index.js"), "init", "--typescript"], {
        cwd: projectDir,
        env: { ...process.env, NO_COLOR: "1" }
      });

      const configFile = path.join(projectDir, "esbuild.config.ts");
      expect(fs.existsSync(path.join(projectDir, "esbuild.config.ts"))).toBeTruthy();
      fs.removeSync(configFile);
    });

    test("should build ts file", () => {
      const contents = `const x: number = 1; console.log(x);`;
      fs.writeFileSync(path.join(projectDir, "input.ts"), contents, "utf-8");

      childProcess.spawnSync(
        "node",
        [path.resolve(__dirname, "../dist/index.js"), "init", "-i", "input.ts", "-o", "out.js"],
        {
          cwd: projectDir,
          env: { ...process.env, NO_COLOR: "1" }
        }
      );
      childProcess.spawnSync(
        "node",
        [path.resolve(__dirname, "../dist/index.js"), "build", "-c", "./esbuild.config.js"],
        {
          cwd: projectDir,
          env: { ...process.env, NO_COLOR: "1" }
        }
      );

      expect(fs.existsSync(path.join(projectDir, "out.js"))).toBeTruthy();
      expect(fs.readFileSync(path.join(projectDir, "out.js"), "utf-8")).toMatchInlineSnapshot(`
        "const x = 1;
        console.log(x);
        "
      `);
    });
  });
});
