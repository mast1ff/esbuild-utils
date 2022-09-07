import path from "path";
import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";
import { createBanner } from "../../rollup-utils";

const version = require("./package.json").version;
const sourceDir = path.resolve(__dirname, "src");
const outputDir = path.resolve(__dirname, "dist");

/**
 * @type { import("rollup").RollupOptions }
 */
export default {
  watch: {
    clearScreen: false
  },
  input: `${sourceDir}/index.ts`,
  output: {
    file: `${outputDir}/index.js`,
    format: "cjs",
    externalLiveBindings: false,
    freeze: false,
    banner: createBanner("@esbuild-utils/cli", version, true),
    sourcemap: true
  },
  treeshake: {
    moduleSideEffects: "no-external",
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false
  },
  external: [
    ...Object.keys(require("./package.json").dependencies),
    ...Object.keys(require("./package.json").devDependencies)
  ],
  plugins: [
    nodeResolve({ extensions: [".ts"] }),
    typescript({
      tsconfig: "./tsconfig.json",
      rootDir: "src",
      outDir: "./dist"
    })
  ]
};
