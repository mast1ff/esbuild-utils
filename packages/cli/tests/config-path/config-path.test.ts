import { normalizeStderr, normalizeStdout, run } from "../utils/test-utils";

describe("config-path", () => {
  test("command with config path", async () => {
    const { exitCode, stderr, stdout } = await run(__dirname, ["--config=esbuild.config.js"]);

    expect(exitCode).toBe(0);
    expect(normalizeStderr(stderr)).toMatchInlineSnapshot(`""`);
    expect(normalizeStdout(stdout)).toMatchInlineSnapshot(`"[esbuild] Built in 2.42ms"`);
  });
});
