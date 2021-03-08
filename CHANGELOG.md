# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [4.5.0](https://github.com/serverless/enterprise-plugin/compare/v4.4.3...v4.5.0) (2021-03-04)

### Features

- Support `--use-local-credentials` flag to skip provider resolution ([#539](https://github.com/serverless/enterprise-plugin/pull/539)) ([c6048d1](https://github.com/serverless/enterprise-plugin/commit/c6048d162597441f0ad3e2c35509a3f00805c20e)) ([AJ Stuyvenberg](https://github.com/astuyve))

### Bug fixes

- Properly use namespaced `events` module ([#548](https://github.com/serverless/enterprise-plugin/pull/548)) ([72019bd](https://github.com/serverless/enterprise-plugin/commit/72019bd3d2657f3a558972d37772d0fc4379d9fa)) ([AJ Stuyvenberg](https://github.com/astuyve))

### Maintenance

- Drop dependency on `@serverless/platform-sdk` by replacing it with corresponding `@serverless/platform-client` methods ([#546](https://github.com/serverless/enterprise-plugin/pull/546)) ([924360f](https://github.com/serverless/enterprise-plugin/pull/546/commits/924360f7067d713bb6678af58709ee0cc1a4d9ab)) ([Piotr Grzesik](https://github.com/pgrzesik))

### [4.4.3](https://github.com/serverless/enterprise-plugin/compare/v4.4.2...v4.4.3) (2021-02-09)

### Maintenance

- Migrate `@serverless/platform-sdk` methods to corresponding `@serverless/utils` methods ([#536](https://github.com/serverless/enterprise-plugin/pull/536)) ([4416651](https://github.com/serverless/enterprise-plugin/commit/4416651c965c4d5a0ef98db41032fc87c8539852)) ([Piotr Grzesik](https://github.com/pgrzesik))
- Remove deprecated use of `git.silent` ([#537](https://github.com/serverless/enterprise-plugin/pull/537)) ([fab4f50](https://github.com/serverless/enterprise-plugin/commit/fab4f50733aa9ccbd90c4b4cc2d51d0843ac3be2)) ([Piotr Grzesik](https://github.com/pgrzesik))

### [4.4.2](https://github.com/serverless/enterprise-plugin/compare/v4.4.1...v4.4.2) (2021-01-07)

### Bug Fixes

- Update dependency on `@serverless/platform-client` to avoid security vulnerability of `axios` ([#528](https://github.com/serverless/enterprise-plugin/pull/528)) ([d7b6ac8](https://github.com/serverless/enterprise-plugin/pull/528/commits/d7b6ac8175dd13cf8134225b11031367a52fb165)) ([pgrzesik](https://github.com/pgrzesik))

### [4.4.1](https://github.com/serverless/enterprise-plugin/compare/v4.4.0...v4.4.1) (2020-12-30)

### Bug Fixes

- Fix handling of deploymentProfile resolution ([#526](https://github.com/serverless/enterprise-plugin/issues/526)) ([61a872b](https://github.com/serverless/enterprise-plugin/commit/61a872b2f3010905187b665b61d6236663948e35)) ([AJ Stuyvenberg](https://github.com/astuyve))

## [4.4.0](https://github.com/serverless/enterprise-plugin/compare/v4.3.0...v4.4.0) (2020-12-30)

### Features

- Support Parameters, override Profiles with Providers/Parameters ([#520](https://github.com/serverless/enterprise-plugin/issues/520)) ([5c56e2d](https://github.com/serverless/enterprise-plugin/commit/5c56e2d266d726abd5897739fe3f2825dde3cfb5)) ([AJ Stuyvenberg](https://github.com/astuyve))
- Deprecate variables usage in core properties ([#524](https://github.com/serverless/enterprise-plugin/issues/524)) ([697d701](https://github.com/serverless/enterprise-plugin/commit/697d701041dff5fd154de3e4d641851aa02d3e99)) ([AJ Stuyvenberg](https://github.com/astuyve))

### Bug Fixes

- Remove safeguards traces to not collide with safeguards-plugin ([#522](https://github.com/serverless/enterprise-plugin/issues/522)) ([28cf1ec](https://github.com/serverless/enterprise-plugin/commit/28cf1ecbfe24c69b2510a885ee732db7a1046797)) ([Martin Litvaj](https://github.com/Kamahl19))

## [4.3.0](https://github.com/serverless/enterprise-plugin/compare/v4.2.0...v4.3.0) (2020-12-15)

### Bug Fixes

- Support API Gateway event payload format version 2.0 ([#518](https://github.com/serverless/enterprise-plugin/pull/518)) ([37ff190](https://github.com/serverless/enterprise-plugin/commit/37ff190caaaa19c5fa922858e0b39f178e64e792)) ([Sandesh Devaraju](https://github.com/scouredimage))

## [4.2.0](https://github.com/serverless/enterprise-plugin/compare/v4.1.2...v4.2.0) (2020-12-04)

### Features

- Recognize lambdas referencing ECR images ([#517](https://github.com/serverless/enterprise-plugin/issues/517) ([b95f6aa](https://github.com/serverless/enterprise-plugin/commit/b95f6aa9b59f23c149f0377af8ba03664e514c19)) ([Mariusz Nowak](https://github.com/medikoo))

### [4.1.2](https://github.com/serverless/enterprise-plugin/compare/v4.1.1...v4.1.2) (2020-11-06)

### Bug Fixes

- Ensure `test` command exits with non zero code on fail ([#516](https://github.com/serverless/enterprise-plugin/issues/516)) ([8f217db](https://github.com/serverless/enterprise-plugin/commit/8f217dbbeab0e982b2b9ed17ff8f62911fd92f0a)) ([Mariusz Nowak](https://github.com/medikoo))
- Fix internal processes handling in `studio` commmand ([#515](https://github.com/serverless/enterprise-plugin/issues/515)) ([465ea01](https://github.com/serverless/enterprise-plugin/commit/465ea0141ca6ba621c8fe7452b1c3963e39735be)) ([Steve Willard](https://github.com/stevewillard))

### [4.1.1](https://github.com/serverless/enterprise-plugin/compare/v4.1.0...v4.1.1) (2020-10-15)

### Bug Fixes

- Includes a fix to encodeURI for instanceUIDs which may not be URI safe ([cb412b1](https://github.com/serverless/enterprise-plugin/commit/cb412b11f217772453679be57f3e29885af7762c)) ([AJ Stuyvenberg](https://github.com/astuyve))
- Major upgrade of platform-client which moves to namespaced SDK methods ([20b375f](https://github.com/serverless/enterprise-plugin/commit/20b375fd9ef935cf4aab44bff84d7daaeaa55f00)) ([AJ Stuyvenberg](https://github.com/astuyve))
- Expose SDK method to fetch dashboard url for current transaction ([5feba87](https://github.com/serverless/enterprise-plugin/commit/5feba8703eed6e41a76d9085135928bad91f7765)) ([Sandesh Devaraju](https://github.com/scouredimage))

### [4.1.0](https://github.com/serverless/enterprise-plugin/compare/v4.0.4...v4.1.0) (2020-10-13)

### Features

- Support retrieving provider credentials from backend dashboard service ([10a2abb](https://github.com/serverless/enterprise-plugin/commit/10a2abb23a198352171055f6a181ae5494f06e27)) ([AJ Stuyvenberg](https://github.com/astuyve))
- `sdk.getTransactionId` method for retrieving transaction id ([c8ade1c](https://github.com/serverless/enterprise-plugin/commit/c8ade1cdc8c8736de907207c55e9988114cec671)) ([Sandesh Devaraju](https://github.com/scouredimage))

### Bug Fixes

- **Fix `outputs` schema:**
  - Ensure to not convert output strings to arrays ([3bcd0bd](https://github.com/serverless/enterprise-plugin/commit/3bcd0bdcb17e51f35cf2eb454ced2882264ba368)) ([Mariusz Nowak](https://github.com/medikoo))
  - Fix schema for property names ([689e9b2](https://github.com/serverless/enterprise-plugin/commit/689e9b2c22e80e8708e603628ad669b2c59c2b35)) ([Mariusz Nowak](https://github.com/medikoo))

### [4.0.4](https://github.com/serverless/enterprise-plugin/compare/v4.0.3...v4.0.4) (2020-09-17)

### Bug Fixes

- Ensure to resolve git remote url for `vcs.originUrl` deployment data ([#502](https://github.com/serverless/enterprise-plugin/issues/502)) ([5fa5539](https://github.com/serverless/enterprise-plugin/commit/5fa553945120e02318379d4640978283815daca4)) ([Mariusz Nowak](https://github.com/medikoo))

### [4.0.3](https://github.com/serverless/enterprise-plugin/compare/v4.0.2...v4.0.3) (2020-09-16)

### Bug Fixes

- Fix request resolution in Python SDK ([#496](https://github.com/serverless/enterprise-plugin/issues/496)) ([5b1a07a](https://github.com/serverless/enterprise-plugin/commit/5b1a07a68309aa774478872de0f01e161e80174b)) ([Sandesh Devaraju](https://github.com/scouredimage))

### [4.0.2](https://github.com/serverless/enterprise-plugin/compare/v4.0.1...v4.0.2) (2020-09-09)

### Bug Fixes

- Configure missing "outputs" schema ([#494](https://github.com/serverless/enterprise-plugin/issues/494)) ([ec4552c](https://github.com/serverless/enterprise-plugin/commit/ec4552c8e7a154db155caaa298727279f54cd086)) ([Mariusz Nowak](https://github.com/medikoo))
- Fix handling of lack of API Gateway request headers ([#495](https://github.com/serverless/enterprise-plugin/issues/495)) ([4ba389b](https://github.com/serverless/enterprise-plugin/commit/4ba389bbd01db631bdb7df14a3e8ac0ab843f580)) ([Mariusz Nowak](https://github.com/medikoo))

### [4.0.1](https://github.com/serverless/enterprise-plugin/compare/v4.0.0...v4.0.1) (2020-09-03)

### Bug Fixes

- Fix schema config for safeguards ([e7b1b4a](https://github.com/serverless/enterprise-plugin/commit/e7b1b4a2a010ddd85c6a528c05e205e9eb2c0354))([Mariusz Nowak](https://github.com/medikoo))

### Maintanance improvements

- Remove new plugin version notifications ([#488](https://github.com/serverless/enterprise-plugin/issues/488)) ([c8e85c0](https://github.com/serverless/enterprise-plugin/commit/c8e85c0db5d6416445ad89d959a39afd89b67b5c)) ([Mariusz Nowak](https://github.com/medikoo))

## [4.0.0](https://github.com/serverless/enterprise-plugin/compare/v3.8.1...v4.0.0) (2020-08-28)

### ⚠ BREAKING CHANGES

- At least Node.js v10 is required (dropped support for v6 and v8)
- Safeguards validation functionality has been removed from the core.Use [@serverless/safeguards](https://github.com/serverless/safeguards-plugin) plugin instead
- `dev` command was removed (Use `studio` instead)

### Features

- **New dashboard ([app.serverless.com](https://app.serverless.com/)):**

  - Switch login/logout to new dashboard ([#477](https://github.com/serverless/enterprise-plugin/issues/477)) ([29dcc76](https://github.com/serverless/enterprise-plugin/commit/29dcc765b161869c420eb81dfea0a8bb9a49034b)) ([Mariusz Nowak](https://github.com/medikoo))
  - Update dashboard link to point new one ([#477](https://github.com/serverless/enterprise-plugin/issues/477)) ([eb68551](https://github.com/serverless/enterprise-plugin/commit/eb68551887d2c7a23830f0f67c041d99520b7441)) ([Mariusz Nowak](https://github.com/medikoo))

- Remove Safeguards implementation ([#483](https://github.com/serverless/enterprise-plugin/issues/483)) ([3e26d29](https://github.com/serverless/enterprise-plugin/commit/3e26d299fb63d2216325d467336938c825ddeccc)) ([Mariusz Nowak](https://github.com/medikoo))
- Drop support for Node.js versions lower than v10 ([#480](https://github.com/serverless/enterprise-plugin/issues/480)) ([e08f549](https://github.com/serverless/enterprise-plugin/commit/e08f549e711547dd9d1b86e373079046100f20e5)) ([Mariusz Nowak](https://github.com/medikoo))
- Remove `dev` command ([#484](https://github.com/serverless/enterprise-plugin/issues/484)) ([e3a4261](https://github.com/serverless/enterprise-plugin/commit/e3a4261e543cdea674506fee60b99f283c2d14fd)) ([Mariusz Nowak](https://github.com/medikoo))

### Bug Fixes

- Fix browser window openning issues ([#477](https://github.com/serverless/enterprise-plugin/issues/477)) ([345411e](https://github.com/serverless/enterprise-plugin/commit/345411ecf49e1eafa22eb1956418231eaaa1b377)) ([Mariusz Nowak](https://github.com/medikoo))
- Remove enforced process.exit ([#477](https://github.com/serverless/enterprise-plugin/issues/477)) ([9682a97](https://github.com/serverless/enterprise-plugin/commit/9682a97ed38da9ea1ae5d8f4266760773ce8d5ce)) ([Mariusz Nowak](https://github.com/medikoo))

### [3.8.4](https://github.com/serverless/enterprise-plugin/compare/v3.8.3...v3.8.4) (2020-09-09)

### Bug Fixes

- Configure missing "outputs" schema ([#494](https://github.com/serverless/enterprise-plugin/issues/494)) ([11d31fe](https://github.com/serverless/enterprise-plugin/commit/11d31fe74a1e332a1e62730c216d8de92805846a)) ([Mariusz Nowak](https://github.com/medikoo))
- Fix handling of lack of API Gateway request headers ([#495](https://github.com/serverless/enterprise-plugin/issues/495)) ([574fca7](https://github.com/serverless/enterprise-plugin/commit/574fca79f0b9ad8569cb9f829481e055b87914b6)) ([Mariusz Nowak](https://github.com/medikoo))

### [3.8.3](https://github.com/serverless/enterprise-plugin/compare/v3.8.2...v3.8.3) (2020-09-03)

### Maintanance improvements

- Remove new plugin version notifications ([#488](https://github.com/serverless/enterprise-plugin/issues/488)) ([1bbca1d](https://github.com/serverless/enterprise-plugin/commit/1bbca1db47843be6ccc8cef38d09fda86b757f98)) ([Mariusz Nowak](https://github.com/medikoo))

### [3.8.2](https://github.com/serverless/enterprise-plugin/compare/v3.8.1...v3.8.2) (2020-09-01)

### Bug Fixes

- Fix Safeguards config schema definition ([#488](https://github.com/serverless/enterprise-plugin/issues/488)) ([acd47e3](https://github.com/serverless/enterprise-plugin/commit/acd47e37a0a014738625f6a0323b57207ec6ee67)) ([Mariusz Nowak](https://github.com/medikoo))

### [3.8.1](https://github.com/serverless/enterprise-plugin/compare/v3.8.0...v3.8.1) (2020-08-28)

### Bug Fixes

- Ensure to extend schema only for supported providers ([79e5535](https://github.com/serverless/enterprise-plugin/commit/79e55353251fdd08dc1067d27e685962a1c3432e)) ([Mariusz Nowak](https://github.com/medikoo))
- Notify of new version only on patch and minor update ([#485](https://github.com/serverless/enterprise-plugin/issues/485)) ([d5fdc36](https://github.com/serverless/enterprise-plugin/commit/d5fdc363f67ef009b9aed20f604507ec63435df3)) ([Mariusz Nowak](https://github.com/medikoo))

## [3.8.0](https://github.com/serverless/enterprise-plugin/compare/v3.7.1...v3.8.0) (2020-08-27)

### Features

- Deprecate safeguards ([#478](https://github.com/serverless/enterprise-plugin/issues/478)) ([056d1d9](https://github.com/serverless/enterprise-plugin/commit/056d1d9afed31ed0af3c759c06f27d87a433e40f)) ([Mariusz Nowak](https://github.com/medikoo))

### Bug Fixes

- Ensure schema for "custom.enterprise.safeguards" ([#478](https://github.com/serverless/enterprise-plugin/issues/478)) ([0aba76c](https://github.com/serverless/enterprise-plugin/commit/0aba76c6f6a7ac78583ae9da6cfba8caf159a45c)) ([Mariusz Nowak](https://github.com/medikoo))

### [3.7.1](https://github.com/serverless/enterprise-plugin/compare/v3.7.0...v3.7.1) (2020-08-19)

### Bug Fixes

- Ensure to not write meta log with local invocation ([#467](https://github.com/serverless/enterprise-plugin/issues/467)) ([7fd2504](https://github.com/serverless/enterprise-plugin/commit/7fd2504868e4e44cffec8868ed9e80cd95067656)) ([Mariusz Nowak](https://github.com/medikoo))
- Mark "dashboard", "help" and "plugin" as unconditional commands ([#465](https://github.com/serverless/enterprise-plugin/issues/465)) ([2ec2172](https://github.com/serverless/enterprise-plugin/commit/2ec21728eafbe682a5c2d0619ee7f4c581616b03)) ([Mariusz Nowak](https://github.com/medikoo))
- Report unsupported region meaningfully ([#466](https://github.com/serverless/enterprise-plugin/issues/466)) ([d4eedb8](https://github.com/serverless/enterprise-plugin/commit/d4eedb8ccbee41bb3bde7d51db8faa200d5c84c7)) ([Mariusz Nowak](https://github.com/medikoo))

## [3.7.0](https://github.com/serverless/enterprise-plugin/compare/v3.6.18...v3.7.0) (2020-08-03)

### Features

- Configure validation schemas for plugin specific properties ([#460](https://github.com/serverless/enterprise-plugin/issues/460)) ([f83eadf](https://github.com/serverless/enterprise-plugin/commit/f83eadf4a95f8918f4f882f43c17b6b8deccb65f)) ([Mariusz Nowak](https://github.com/medikoo))

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
