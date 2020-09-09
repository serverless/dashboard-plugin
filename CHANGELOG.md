# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
