'use strict';

// This is only for use in CI to set the version number in package.json
// for publishing prerelease versions to npm

// Important: It's run before `npm install`, we cannot rely on non native modules

const { spawnSync } = require('child_process');
const { writeFileSync, readFileSync } = require('fs');

const packageJson = JSON.parse(readFileSync('package.json').toString());

const version = `${packageJson.version}-${spawnSync('git', ['rev-parse', 'HEAD'])
  .stdout.toString()
  .slice(0, 8)}`;

packageJson.version = version;
writeFileSync('package.json', `${JSON.stringify(packageJson, null, 2)}\n`);
