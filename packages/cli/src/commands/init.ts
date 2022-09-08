import path from "node:path";
import fs from "fs-extra";

const tsContentsHeader = `import type { EsbuildConfig } from "@esbuild-utils/cli";

const config: EsbuildConfig = {`;

const jsContentsHeader = `/** @type { import("@esbuild-utils/cli").EsbuildConfig } */
module.exports = {`;

function createContents({ ts = false, input, output }: InitOptions) {
  let header = ts ? tsContentsHeader : jsContentsHeader;

  if (input) {
    header += `\n`;
    header += `  entryPoints: ["${input}"],`;
  }
  if (output) {
    header += `\n`;
    header += `  outfile: "${output}",`;
  }
  if (input || output) {
    header += `\n`;
  }

  header += `};\n`;
  if (ts) {
    header += `\n`;
    header += `export default config;\n`;
  }
  return header;
}

export interface InitOptions {
  ts?: boolean;
  input?: string;
  output?: string;
}

export async function init(file: string, options: InitOptions = {}) {
  return new Promise<void>((resolve, reject) => {
    try {
      const contents = createContents(options);

      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) {
        fs.ensureDirSync(dir);
      }

      fs.writeFileSync(file, contents, "utf-8");
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}
