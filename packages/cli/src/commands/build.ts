import colors from "picocolors";
import * as esbuild from "esbuild";
import { EsbuildConfig } from "../types";

export async function build(config: EsbuildConfig) {
  const { watch, onBuildFailure, onBuildSuccess, ...options } = config;

  return new Promise<esbuild.BuildResult>((resolve, reject) => {
    esbuild
      .build({
        ...options,
        watch: watch
          ? {
              onRebuild(err, res) {
                if (err) {
                  console.error(colors.red(`[esbuild] Build failure\n`));
                  console.error(String(err.stack));
                  onBuildFailure?.(err);
                }
                if (res) {
                  console.log(colors.green(`[esbuild] Rebuilt`));
                  onBuildSuccess?.(res);
                }
                if (typeof config.watch === "object") {
                  config.watch.onRebuild?.(err, res);
                }
              }
            }
          : false
      })
      .then((res) => {
        onBuildSuccess?.(res);
        resolve(res);
      })
      .catch((err: Error | esbuild.BuildFailure) => {
        onBuildFailure?.(err);
        reject(err);
      });
  });
}
