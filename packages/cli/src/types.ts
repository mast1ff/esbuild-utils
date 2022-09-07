import type { BuildFailure, BuildOptions, BuildResult } from "esbuild";

export interface EsbuildConfig extends BuildOptions {
  onBuildSuccess?(build: BuildResult): void | Promise<void>;
  onBuildFailure?(error: Error | BuildFailure): void | Promise<void>;
}
