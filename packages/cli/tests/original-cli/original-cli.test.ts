import { normalizeStderr, normalizeStdout, run } from "../utils/test-utils";

describe("original-cli", () => {
  test("should exec original esbuild cli", async () => {
    const { exitCode, stderr, stdout } = await run(__dirname, ["index.js", "--outfile=dist/index.js", "--bundle"]);

    expect(exitCode).toBe(0);
    expect(normalizeStderr(stderr)).toMatchInlineSnapshot(`
      "
        dist/index.js  66b 

      Done in 3ms"
    `);
    expect(normalizeStdout(stdout)).toMatchInlineSnapshot(`""`);
  });
});
