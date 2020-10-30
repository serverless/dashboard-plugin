# Serverless Framework Enterprise Plugin

[![Build Status](https://travis-ci.com/serverless/enterprise-plugin.svg)](https://travis-ci.com/serverless/enterprise-plugin)
[![license](https://img.shields.io/npm/l/@serverless/enterprise-plugin.svg)](https://www.npmjs.com/package/@serverless/enterprise-plugin)
[![coverage](https://img.shields.io/codecov/c/github/serverless/enterprise-plugin.svg)](https://codecov.io/gh/serverless/enterprise-plugin)
[![Known Vulnerabilities](https://snyk.io/test/github/serverless/enterprise-plugin/badge.svg?targetFile=package.json)](https://snyk.io/test/github/serverless/enterprise-plugin?targetFile=package.json)

To enable the various features of the [Serverless Framework Enterprise](https://github.com/serverless/enterprise) for a particular Service you must deploy or redeploy that Service, using Serverless Framework open-source CLI version 1.45.1 or later.

- If you are an existing Serverless Framework Enterprise dashboard user and have a previously deployed Service that you now want to configure to use Serverless Insights, Safeguards, Secrets or other Enteprise features, follow these steps to [update an existing Service](https://github.com/serverless/enterprise/blob/master/docs/update.md)
- If you are new to the Serverless Framework open source CLI or Serverless Framework Enterprise simply follow the steps in this [new user getting started guide](https://github.com/serverless/enterprise/blob/master/docs/getting-started.md) to get up and running

Upon deployment, the Serverless Framwork Enteprise Plugin will automatically wrap and instrument your functions to work with the Serverless Framework Enterprise dashboard.

## Dev notes

### Install dependencies

```
npm i
cd sdk-js
npm i
cd -
```

### Build

`sdk-js` needs to be compile, & tests use the `dist` build for integration purposes.

```
npm run build
```

### Test

```
npm t
cd sdk-js
npm t
cd -
npm run integration-test
```

### Using your checked out version of the plugin for test/dev purposes:

First build & link your plugin globally:

```
npm run build
npm link
```

Then clone & link sls & link the plugin into sls:

```
git clone https://github.com/serverless/serverless
cd serverless
npm i
npm link
npm link @serverless/enterprise-plugin
```

If you need to work with a development version of the platform SDK too, in the sdk, run:

```
npm run build
npm link
```

and then in both serverless & this plugin, run `npm link @serverless/platform-sdk`

### Release process

- Create a PR updating version in `package.json`
- Create a draft release on github with a change log
- Have it approved & merge
- Publish the release, Travis CI will publish it to NPM
- Verify the release is in the versions tab of NPM
