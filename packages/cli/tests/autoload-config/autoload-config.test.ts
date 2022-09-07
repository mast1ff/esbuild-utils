import { normalizeStderr, normalizeStdout, run } from "../utils/test-utils";

describe("autoload-config", () => {
  test("should validate config successfully", async () => {
    const { exitCode, stderr, stdout } = await run(__dirname, []);

    expect(exitCode).toBe(0);
    expect(normalizeStderr(stderr)).toMatchInlineSnapshot(`""`);
    expect(normalizeStdout(stdout)).toMatchInlineSnapshot(`"[esbuild] Built in 3.36ms"`);
  });

  test("should throw load config error", async () => {
    const { exitCode, stderr, stdout } = await run(__dirname, ["--config=error.config.ts"]);

    expect(exitCode).toBe(0);
    expect(normalizeStderr(stderr)).toMatchInlineSnapshot(`
      "[esbuild] Build failure

      Error: Invalid value \\"umd\\" in \\"--format=umd\\"
          at stack"
    `);
    expect(normalizeStdout(stdout)).toMatchInlineSnapshot(`""`);
  });
});
