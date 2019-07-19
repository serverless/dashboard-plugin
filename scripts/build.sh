#!/bin/bash
set -e
rm -rf dist
mkdir -p dist
babel index.js -o dist/index.js --source-maps
babel runtime.js -o dist/runtime.js --source-maps
babel lib -d dist/lib --source-maps --ignore "**/*.test.js"
cp -a package.json dist/package.json
cd sdk-js
npm run build
cd ..
mkdir -p dist/sdk-js/dist
cp -a sdk-js/dist/index.js dist/sdk-js/dist/index.js
mkdir -p dist/sdk-py
cp -a sdk-py/serverless_sdk.py dist/sdk-py/serverless_sdk.py
