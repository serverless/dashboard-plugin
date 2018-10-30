# IOpipe Serverless Framework Plugin

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![CircleCI](https://circleci.com/gh/iopipe/serverless-plugin-iopipe/tree/master.svg?style=svg&circle-token=3787c8931aea4de4facb5fde25ae456f294f8cc1)](https://circleci.com/gh/iopipe/serverless-plugin-iopipe/tree/master)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

A [serverless](http://www.serverless.com) plugin to automatically wrap your functions with [iopipe](https://iopipe.com).

# Requirements
- Node >= `4.3.2`
- NPM >= `2.14.12`
- Serverless >= `1.13.0`
- Yarn >= `0.22.0` (optional)
- A valid `package.json` file
- A valid `serverless.yml` file

# Install
With [yarn](https://yarnpkg.com) (recommended) in project directory:
```
yarn add @iopipe/iopipe
yarn add serverless-plugin-iopipe --dev
```

OR with npm in project directory:
```
npm install @iopipe/iopipe
npm install serverless-plugin-iopipe --save-dev
```

Add the plugin to your `serverless.yml` file:
```yaml
plugins:
  - serverless-plugin-iopipe
```

You'll need to make sure your lambda functions have access to your [IOpipe project token](https://dashboard.iopipe.com/install). The recommended strategy is to use an environment variable. Just setup the variable in serverless.yml like any other.

```yaml
environment:
  IOPIPE_TOKEN: ${env:IOPIPE_TOKEN}
```

Alternatively, you can add an [iopipe configuration to your package.json](https://github.com/iopipe/iopipe-js-core#packagejson-configuration).

You're set! The plugin will run during an `sls deploy` or during `sls invoke local`.

Check out an [example here](https://github.com/iopipe/serverless-plugin-iopipe/blob/master/example/serverless.yml).

# How Does it Work?
`serverless-plugin-iopipe` outputs files that import and wrap the function handlers defined in `serverless.yml` with IOpipe so you don't have to. It allows you to deploy and upgrade multiple functions simultaneously.

# Commands
- `sls iopipe clean` This command cleans up your project folder of extraneous `*-iopipe.js` files if needed. This can be useful when using the [serverless-offline](https://github.com/dherault/serverless-offline) plugin.

# Options
Beyond the required $IOPIPE_TOKEN environment variable, some options can be set [in the "custom" config](https://serverless.com/framework/docs/providers/aws/guide/plugins#installing-plugins) in `serverless.yml`. [See Example](https://github.com/iopipe/serverless-plugin-iopipe/blob/master/example/serverless.yml)

#### `iopipeToken` (optional)

If not using the environment variable of `$IOPIPE_TOKEN`, the token of the project you would like to wrap your functions with.

#### `iopipeNoVerify` (optional)

Skip a check that ensures iopipe is installed via npm/yarn and present in package.json

#### `iopipeNoUpgrade` (optional)

The plugin automatically upgrades the IOpipe library to the latest available version that satisfies the semver range specified in package.json. Use this option to disable that feature.

#### `iopipeNoYarn` (optional)

When auto-upgrading, Yarn will be used in place of NPM if a yarn.lock file is found. Use this flag disable yarn and use NPM to upgrade the iopipe library.

#### `iopipeExclude` (optional)

Exclude certain lambda functions from being wrapped by the plugin. Comma separated string.

#### `iopipeNoStats` (optional)

By default, the plugin sends _anonymized_, non-identifying usage statistics to Google Analytics. IOpipe will use this info to prioritize updates and enhancements to the plugin. If you'd like to opt out of this, just set this option.

#### `iopipeHandlerDir` (optional)

Change the directory that the IOpipe handler files will be generated in. Defaults to `iopipe_handlers`. Note, watch out using directories beginning with a `.` character due to current bugs within Serverless framework and serverless-offline:
- [serverless/issues/4633](https://github.com/serverless/serverless/issues/4633)
- [serverless-offline/pull/346](https://github.com/dherault/serverless-offline/pull/346)

## FAQ
- Does this work with webpack?
  - Yes, you can use this plugin with webpack or serverless plugins utilizing webpack. For best results, make sure this plugin is specified _before_ the webpack plugins in serverless.yml, i.e.
  ```yaml
  plugins:
    - serverless-plugin-iopipe
    - serverless-webpack
  ```
- Does this work with [serverless-offline](https://github.com/dherault/serverless-offline)?
  - Yes, list `serverless-plugin-iopipe` first before any other plugins in `serverless.yml`.
  - You will likely need to use the `iopipeHandlerDir` option to change where the IOpipe handler files are generated until [this PR is merged](https://github.com/dherault/serverless-offline/pull/346).
- Can I use IOpipe plugins?
  - Yes, you can specify iopipe plugins through your [package.json file, or an iopipe.rc file](https://github.com/iopipe/iopipe-js-core#packagejson-configuration). Ensure those plugins are installed into your node_modules folder (yarn or npm).

## Known Issues
- If you have lambda functions that are already wrapped by iopipe via code, you may experience unexpected results. Remove the iopipe wrapping code from those handlers.
- If your `package.json` is located in a non-standard place, auto-upgrading may not work.
- If attempting to use es6 modules natively i.e. `export function handler...`, may not work.

## Support
File an issue here, hit us up [on Slack](https://iopipe.now.sh/), or send us a note at [support@iopipe.com](mailto:support@iopipe.com)

## Contributing
- This project uses [Prettier](https://github.com/prettier/prettier). Please execute `npm run eslintFix` to auto-format the code before submitting pull requests.
