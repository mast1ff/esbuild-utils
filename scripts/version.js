const path = require("path");
const { execSync } = require("child_process");
const fs = require("fs-extra");
const semver = require("semver");
const Confirm = require("prompt-confirm");
const jsonfile = require("jsonfile");

const rootDirectory = path.resolve(__dirname, "..");

function updateVersion(packageName, directory, nextVersion) {
  const file = path.join(rootDirectory, directory, packageName, "package.json");
  const json = jsonfile.readFileSync(file);
  json.version = nextVersion;
  jsonfile.writeFileSync(file, json, { spaces: 2 });
}

function getPackageVersion(packageName) {
  const file = path.join(rootDirectory, "packages", packageName, "package.json");
  const json = JSON.parse(fs.readFileSync(file, "utf-8"));
  return json.version;
}

function getNextVersion(currentVersion, givenVersion, prereleaseId = "pre") {
  if (givenVersion == null) {
    console.error(`Missing next version. Usage: node scripts/version.js [next version]`);
    process.exit(1);
  }

  let nextVersion;
  if (givenVersion === "experimental") {
    const hash = execSync(`git rev-parse --short HEAD`).toString().trim();
    nextVersion = `0.0.0-experimental-${hash}`;
  } else {
    nextVersion = semver.inc(currentVersion, givenVersion, prereleaseId);
  }

  if (nextVersion == null) {
    console.error(`Invalid version specifier: ${givenVersion}`);
    process.exit(1);
  }
}

function incrementVersion(nextVersion) {
  updateVersion("cli", "packages", nextVersion);

  execSync(`git commit --all --message="Version ${nextVersion}"`);
  execSync(`git tag -a -m "Version ${nextVersion}" v${nextVersion}`);
  console.log(` Commited and tagged version ${nextVersion}`);
}

/** @param {string[]} args */
async function run(args) {
  const givenVersion = args[0];
  const prereleaseId = args[1];

  const currentVersion = await getPackageVersion("cli");
  let nextVersion = semver.valid(givenVersion);
  if (nextVersion == null) {
    nextVersion = getNextVersion(currentVersion, givenVersion, prereleaseId);
  }

  if (prereleaseId !== "--skip-prompt") {
    const confirm = new Confirm(`Are you sure you want to bump version ${currentVersion} to ${nextVersion}? [Yn]`);
    const answer = await confirm.getAnswer();
    if (answer === false) return 0;
  }

  await incrementVersion(nextVersion);
}

run(process.argv.slice(2))
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
