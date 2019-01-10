// This is only for use in CI to set the version number in package.json
// for publishing prerelease versions to npm

const { spawnSync } = require('child_process')
const { writeFileSync, readFileSync } = require('fs')
const semver = require('semver')

const packageJson = JSON.parse(readFileSync('package.json').toString())

const version = semver.valid(
  spawnSync('git', ['describe', '--tags'])
    .stdout.toString()
    .slice(0, -1)
)

if (!semver.gt(packageJson.version, version)) {
  console.log(packageJson.version, version)
  packageJson.version = version
  writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n')
} else {
  console.error(`Error: ${packageJson.version} greater than ${version}
You need to make a tagged release or pre-release to continue 
making automatic prereleases after updating the version number`)
  process.exit(1)
}
