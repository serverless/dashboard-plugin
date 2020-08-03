# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [3.7.0](https://github.com/serverless/enterprise-plugin/compare/v3.6.18...v3.7.0) (2020-08-03)

### Features

- Configure validation schemas for plugin specific properties ([f83eadf](https://github.com/serverless/enterprise-plugin/commit/f83eadf4a95f8918f4f882f43c17b6b8deccb65f))

### [3.6.18](https://github.com/serverless/enterprise-plugin/compare/v3.6.17...v3.6.18) (2020-07-27)

### Bug Fixes

- Fix support for TypeScript config files ([#456](https://github.com/serverless/enterprise-plugin/issues/456)) ([d858fb0](https://github.com/serverless/enterprise-plugin/commit/d858fb0ffba17ba516490a5e9ea925a5b6599be0)) ([Rob Burger](https://github.com/robburger))

### [3.6.17](https://github.com/serverless/enterprise-plugin/compare/v3.6.16...v3.6.17) (2020-07-23)

### Bug Fixes

- Replace dependencies resolver with Node.js dedidated version (previous choice bundled various transpilers which attributed to significant increase in size of standalone bundle) ([#453](https://github.com/serverless/enterprise-plugin/pull/453)) ([50d63a7](https://github.com/serverless/enterprise-plugin/commit/50d63a7e9efca1faf3f267785cc2190057069951)) ([Mariusz Nowak](https://github.com/medikoo))

### [3.6.16](https://github.com/serverless/enterprise-plugin/compare/v3.6.15...v3.6.16) (2020-07-15)

### Bug Fixes

- Hide and deprecate `dev` command ([53d68a6](https://github.com/serverless/enterprise-plugin/commit/53d68a606717a9b20f326c5252a71603d5f9e580))
- Upgrade `@serverles/platform-client` to v1 ([6e78d23](https://github.com/serverless/enterprise-plugin/commit/6e78d2376276972e1e5d02e1a273a9b6c53b0652)), which fixes issues with websocket connection handling when using `sls studio`

### [3.6.15](https://github.com/serverless/enterprise-plugin/compare/v3.6.14...v3.6.15) (2020-06-30)

### Minor improvements

- Return callback result in SDK span [#443](https://github.com/serverless/enterprise-plugin/pull/443) ([Sandesh Devaraju](https://github.com/scouredimage))

### Bug fixes

- Simplify Flask instrumentation [#444](https://github.com/serverless/enterprise-plugin/pull/444) ([Sandesh Devaraju](https://github.com/scouredimage))
