/**
 * @param { string } packageName
 * @param { string } version
 * @param { boolean } [executable]
 */
export function createBanner(packageName, version, executable = false) {
  const banner = `/**
  * ${packageName} v${version}
  *
  * Copyright (c) mast1ff
  *
  * This source code is licensed under the MIT license found in the
  * LICENSE file in the root directory of this source tree.
  *
  * @license MIT
  */`;
  return executable ? `#!/usr/bin/env node\n${banner}` : banner;
}
