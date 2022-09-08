# esbuild-utils
[![npm version](https://img.shields.io/npm/v/@esbuild-utils/cli.svg?style=flat)](https://www.npmjs.com/package/esbuild-plugin-nodemon)
[![test](https://github.com/mast1ff/esbuild-utils/actions/workflows/test.yaml/badge.svg)](https://github.com/mast1ff/esbuild-plugin-nodemon/actions/workflows/test.yml)


CLI extension to esbuild that supports loading of configuration files like webpack-cli.

## Usage

### Installation
```bash
npm install --save-dev esbuild @esbuild-utils/cli
# or
yarn add -D @esbuild-utils/cli
# or
pnpm add -D @esbuild-utils/cli
```

### Commands
```
init  [options]      Create a config file for esbuild.
build [options]      Perform build with options in config file.
```

### Init Options
```
--typescript         Create a Typescript config file.
-i, --input <file>   Add entry points to the config file.
-o, --output <file>  Add output file option to the config file.
```

### Build Options
```
-c, --config <file>  Specifies the config file to be read.
```
