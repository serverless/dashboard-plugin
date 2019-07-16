'use strict';

// This is only for use in CI to set the version of platform-sdk in package.json
// for publishing prerelease versions to npm

// Important: It's run before `npm install`, we cannot rely on non native modules

const { writeFileSync, readFileSync } = require('fs');

const packageJson = JSON.parse(readFileSync('package.json').toString());

packageJson.dependencies['@serverless/platform-sdk'] = 'next';
writeFileSync('package.json', `${JSON.stringify(packageJson, null, 2)}\n`);
