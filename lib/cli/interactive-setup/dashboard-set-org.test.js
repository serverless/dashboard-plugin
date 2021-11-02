'use strict';

// TODO: This whole module should be removed with next major release as the logic has been moved to Framework with https://github.com/serverless/serverless/pull/9766

const chai = require('chai');
const { join } = require('path');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const { readFile } = require('fs-extra');
const yaml = require('yamljs');
const resolveSync = require('ncjsm/resolve/sync');
const overrideCwd = require('process-utils/override-cwd');
const overrideStdoutWrite = require('process-utils/override-stdout-write');
const overrideEnv = require('process-utils/override-env');
const configureInquirerStub = require('@serverless/test/configure-inquirer-stub');
const semver = require('semver');
const stripAnsi = require('strip-ansi');
const { StepHistory } = require('@serverless/utils/telemetry');

const setupServerless = require('../../../test/setupServerless');
const fixtures = require('../../../test/fixtures');

const { expect } = chai;

chai.use(require('chai-as-promised'));

const fixturesPath = join(__dirname, '../../../test/fixtures');

describe('lib/cli/interactive-setup/dashboard-set-org.test.js', () => {
  let step;
  let serverlessPath;
  let serverlessVersion;
  let inquirer;
  let mockOrganizationsList = [
    { tenantName: 'testinteractivecli' },
    { tenantName: 'otherorg' },
    { tenantName: 'orgwithoutapps' },
  ];

  before(async () => {
    const { root, version } = await setupServerless();
    serverlessPath = root;
    serverlessVersion = version;
    const inquirerPath = resolveSync(serverlessPath, '@serverless/utils/inquirer').realPath;
    inquirer = require(inquirerPath);

    const ServerlessSDKMock = class ServerlessSDK {
      constructor() {
        this.metadata = {
          get: async () => {
            return {
              awsAccountId: '377024778620',
              supportedRuntimes: [
                'nodejs10.x',
                'nodejs12.x',
                'python2.7',
                'python3.6',
                'python3.7',
              ],
              supportedRegions: [
                'us-east-1',
                'us-east-2',
                'us-west-2',
                'eu-central-1',
                'eu-west-1',
                'eu-west-2',
                'ap-northeast-1',
                'ap-southeast-1',
                'ap-southeast-2',
              ],
            };
          },
        };

        this.apps = {
          create: async ({ app: { name } }) => ({ appName: name }),
          list: async ({ orgName }) => {
            if (orgName === 'orgwithoutapps') {
              return [];
            }

            return [
              { appName: 'some-aws-service-app' },
              { appName: 'other-app' },
              { appName: 'app-from-flag' },
            ];
          },
        };

        this.organizations = {
          list: async () => {
            return mockOrganizationsList;
          },
        };

        this.accessKeys = {
          get: async () => {
            return {
              orgName: 'fromaccesskey',
            };
          },
        };
      }

      async refreshToken() {
        return {};
      }

      config() {}
    };

    step = proxyquire('./dashboard-set-org', {
      '@serverless/platform-client': {
        ServerlessSDK: ServerlessSDKMock,
      },
      '../../clientUtils': {
        getPlatformClientWithAccessKey: async () => new ServerlessSDKMock(),
        getOrCreateAccessKeyForOrg: async () => 'accessKey',
      },
    });
  });
  after(() => {
    sinon.restore();
  });

  afterEach(async () => {
    if (inquirer.prompt.restore) inquirer.prompt.restore();
    sinon.reset();
  });

  it('Should be ineffective, when not at service path', async () => {
    const context = {};
    expect(await step.isApplicable(context)).to.be.false;
    expect(context.inapplicabilityReasonCode).to.equal('NOT_IN_SERVICE_DIRECTORY');
  });

  it('Should be ineffective, when not at AWS service path', async () => {
    const context = {
      serviceDir: process.cwd(),
      configuration: {},
      configurationFilename: 'serverless.yml',
      options: {},
      inquirer,
    };
    expect(await step.isApplicable(context)).to.equal(false);
    expect(context.inapplicabilityReasonCode).to.equal('NON_AWS_PROVIDER');
  });

  it('Should be ineffective, when not at supported runtime service path', async () => {
    const context = {
      serviceDir: process.cwd(),
      configuration: { service: 'some-aws-service', provider: { name: 'aws', runtime: 'java8' } },
      configurationFilename: 'serverless.yml',
      options: {},
      inquirer,
    };
    expect(await step.isApplicable(context)).to.equal(false);
    expect(context.inapplicabilityReasonCode).to.equal('UNSUPPORTED_RUNTIME');
  });

  it('Should be ineffective, when not logged in', async () => {
    const context = {
      serviceDir: process.cwd(),
      configuration: {
        service: 'some-aws-service',
        provider: { name: 'aws', runtime: 'nodejs12.x' },
      },
      configurationFilename: 'serverless.yml',
      options: {},
      inquirer,
    };
    expect(await step.isApplicable(context)).to.equal(false);
    expect(context.inapplicabilityReasonCode).to.equal('NOT_LOGGED_IN');
  });

  it('Should be ineffective, when no orgs are resolved', async () => {
    const freshStep = proxyquire('./dashboard-set-org', {
      '@serverless/platform-client': {
        ServerlessSDK: class ServerlessSDK {
          constructor() {
            this.metadata = {
              get: async () => {
                return {
                  awsAccountId: '377024778620',
                  supportedRuntimes: ['nodejs10.x', 'nodejs12.x'],
                  supportedRegions: ['us-east-1'],
                };
              },
            };
            this.organizations = {
              list: async () => [],
            };
          }

          config() {}
        },
      },
    });
    const context = {
      serviceDir: process.cwd(),
      configuration: {
        service: 'some-aws-service',
        provider: { name: 'aws', runtime: 'nodejs12.x' },
      },
      configurationFilename: 'serverless.yml',
      options: {},
      inquirer,
    };
    await overrideCwd(join(fixturesPath, 'aws-loggedin-service'), async () => {
      expect(await freshStep.isApplicable(context)).to.be.false;
    });
    expect(context.inapplicabilityReasonCode).to.equal('NO_ORGS_AVAILABLE');
  });

  it('Should be ineffective, when project has monitoring setup with recognized org and app', async () => {
    const context = {
      serviceDir: process.cwd(),
      configuration: {
        org: 'testinteractivecli',
        app: 'some-aws-service-app',
        service: 'some-aws-service',
        provider: { name: 'aws', runtime: 'nodejs12.x' },
      },
      configurationFilename: 'serverless.yml',
      options: {},
      inquirer,
    };
    expect(
      await overrideCwd(
        join(fixturesPath, 'aws-loggedin-service'),
        async () => await step.isApplicable(context)
      )
    ).to.equal(false);
    expect(context.inapplicabilityReasonCode).to.equal('HAS_MONITORING_SETUP');
  });

  it('Should reject an invalid app name', async () => {
    configureInquirerStub(inquirer, {
      input: { newAppName: 'invalid app name /* Ć */' },
      list: { orgName: 'testinteractivecli', appName: '_create_' },
    });
    const { servicePath } = await fixtures.setup('aws-loggedin-service');
    const context = {
      serviceDir: servicePath,
      configuration: {
        service: 'some-aws-service',
        provider: { name: 'aws', runtime: 'nodejs12.x' },
      },
      configurationFilename: 'serverless.yml',
      options: {},
      inquirer,
      stepHistory: new StepHistory(),
    };
    await expect(
      overrideCwd(servicePath, async () => {
        const stepData = await step.isApplicable(context);
        if (!stepData) throw new Error('Step resolved as not applicable');
        await step.run(context, stepData);
      })
    ).to.eventually.be.rejected.and.have.property('code', 'INVALID_ANSWER');
    expect(context.stepHistory.valuesMap()).to.deep.equal(
      new Map([
        ['orgName', '_user_provided_'],
        ['appName', '_create_'],
      ])
    );
  });

  it('Should recognize an invalid org and allow to opt out', async () => {
    configureInquirerStub(inquirer, {
      confirm: { shouldUpdateOrg: false },
    });
    const { servicePath } = await fixtures.setup('aws-loggedin-service');
    const context = {
      serviceDir: servicePath,
      configuration: {
        service: 'some-aws-service',
        org: 'some-other',
        app: 'some-aws-service-app',
        provider: { name: 'aws', runtime: 'nodejs12.x' },
      },
      configurationFilename: 'serverless.yml',
      options: {},
      inquirer,
      stepHistory: new StepHistory(),
    };
    await overrideCwd(servicePath, async () => {
      const stepData = await step.isApplicable(context);
      if (!stepData) throw new Error('Step resolved as not applicable');
      await step.run(context, stepData);
    });
    const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
    expect(serviceConfig).to.not.have.property('org');
    expect(serviceConfig).to.not.have.property('app');
    expect(context.configuration).to.not.have.property('org');
    expect(context.configuration).to.not.have.property('app');
    expect(context.stepHistory.valuesMap()).to.deep.equal(new Map([['shouldUpdateOrg', false]]));
  });

  it('Should recognize an invalid app and allow to opt out', async () => {
    configureInquirerStub(inquirer, {
      list: { appUpdateType: 'skip' },
    });
    const { servicePath } = await fixtures.setup('aws-loggedin-service');
    const context = {
      serviceDir: servicePath,
      configuration: {
        service: 'some-aws-service',
        org: 'testinteractivecli',
        app: 'not-created-app',
        provider: { name: 'aws', runtime: 'nodejs12.x' },
      },
      configurationFilename: 'serverless.yml',
      options: {},
      inquirer,
      stepHistory: new StepHistory(),
    };
    await overrideCwd(servicePath, async () => {
      const stepData = await step.isApplicable(context);
      if (!stepData) throw new Error('Step resolved as not applicable');
      await step.run(context, stepData);
    });
    const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
    expect(serviceConfig).to.not.have.property('org');
    expect(serviceConfig).to.not.have.property('app');
    expect(context.configuration.org).to.equal('testinteractivecli');
    expect(context.configuration.app).to.equal('not-created-app');
    expect(context.stepHistory.valuesMap()).to.deep.equal(new Map([['appUpdateType', 'skip']]));
  });

  describe('Monitoring setup', () => {
    it('Should setup monitoring for chosen org and app', async () => {
      configureInquirerStub(inquirer, {
        list: { orgName: 'testinteractivecli', appName: 'other-app' },
      });
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: {},
        inquirer,
        stepHistory: new StepHistory(),
      };
      let stdoutData = '';
      await overrideCwd(servicePath, async () => {
        await overrideStdoutWrite(
          (data) => (stdoutData += data),
          async () => {
            const stepData = await step.isApplicable(context);
            if (!stepData) throw new Error('Step resolved as not applicable');
            await step.run(context, stepData);
          }
        );
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(context.configuration.org).to.equal('testinteractivecli');
      expect(context.configuration.app).to.equal('other-app');
      expect(stripAnsi(stdoutData)).to.include(
        'Your project has been setup with org testinteractivecli and app other-app'
      );
      expect(context.stepHistory.valuesMap()).to.deep.equal(
        new Map([
          ['orgName', '_user_provided_'],
          ['appName', '_user_provided_'],
        ])
      );
    });

    it('Should setup monitoring for chosen app and org based on access key', async () => {
      configureInquirerStub(inquirer, {
        list: { orgName: 'fromaccesskey', appName: 'other-app' },
      });
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: {},
        inquirer,
        stepHistory: new StepHistory(),
      };
      let stdoutData = '';
      await overrideEnv({ variables: { SERVERLESS_ACCESS_KEY: 'validkey' } }, async () => {
        await overrideCwd(servicePath, async () => {
          await overrideStdoutWrite(
            (data) => (stdoutData += data),
            async () => {
              const stepData = await step.isApplicable(context);
              if (!stepData) throw new Error('Step resolved as not applicable');
              await step.run(context, stepData);
            }
          );
        });
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('fromaccesskey');
      expect(serviceConfig.app).to.equal('other-app');
      expect(context.configuration.org).to.equal('fromaccesskey');
      expect(context.configuration.app).to.equal('other-app');
      expect(stripAnsi(stdoutData)).to.include(
        'Your project has been setup with org fromaccesskey and app other-app'
      );
      expect(context.stepHistory.valuesMap()).to.deep.equal(
        new Map([
          ['orgName', '_user_provided_'],
          ['appName', '_user_provided_'],
        ])
      );
    });

    it('Should allow to skip monitoring when org is resolved from access key', async () => {
      configureInquirerStub(inquirer, {
        list: { orgName: '_skip_' },
      });
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: {},
        inquirer,
        stepHistory: new StepHistory(),
      };
      let stdoutData = '';
      await overrideEnv({ variables: { SERVERLESS_ACCESS_KEY: 'validkey' } }, async () => {
        await overrideCwd(servicePath, async () => {
          await overrideStdoutWrite(
            (data) => (stdoutData += data),
            async () => {
              const stepData = await step.isApplicable(context);
              if (!stepData) throw new Error('Step resolved as not applicable');
              await step.run(context, stepData);
            }
          );
        });
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.be.undefined;
      expect(serviceConfig.app).to.be.undefined;
      expect(context.configuration.org).to.be.undefined;
      expect(context.configuration.app).to.be.undefined;
      expect(context.stepHistory.valuesMap()).to.deep.equal(new Map([['orgName', '_skip_']]));
    });

    it('Should allow to skip setting monitoring when selecting org', async () => {
      configureInquirerStub(inquirer, {
        list: { orgName: '_skip_' },
      });
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: {},
        inquirer,
        stepHistory: new StepHistory(),
      };
      await overrideCwd(servicePath, async () => {
        const stepData = await step.isApplicable(context);
        if (!stepData) throw new Error('Step resolved as not applicable');
        await step.run(context, stepData);
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.be.undefined;
      expect(serviceConfig.app).to.be.undefined;
      expect(context.configuration.org).to.be.undefined;
      expect(context.configuration.app).to.be.undefined;
      expect(context.stepHistory.valuesMap()).to.deep.equal(new Map([['orgName', '_skip_']]));
    });
  });

  describe('Monitoring setup when only one org available', () => {
    before(() => {
      mockOrganizationsList = [{ tenantName: 'orgwithoutapps' }];
    });

    after(() => {
      mockOrganizationsList = [
        { tenantName: 'testinteractivecli' },
        { tenantName: 'otherorg' },
        { tenantName: 'orgwithoutapps' },
      ];
    });

    it('Should not automatically pre choose single available org if login/register step was not presented', async () => {
      configureInquirerStub(inquirer, {
        list: { orgName: '_skip_' },
      });
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: {},
        inquirer,
        history: new Map(),
        stepHistory: new StepHistory(),
      };
      await overrideCwd(servicePath, async () => {
        const stepData = await step.isApplicable(context);
        if (!stepData) throw new Error('Step resolved as not applicable');
        await step.run(context, stepData);
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.be.undefined;
      expect(serviceConfig.app).to.be.undefined;
      expect(context.configuration.org).to.be.undefined;
      expect(context.configuration.app).to.be.undefined;
      expect(context.stepHistory.valuesMap()).to.deep.equal(new Map([['orgName', '_skip_']]));
    });

    it('Should not automatically pre choose single available org if context history is not available', async () => {
      configureInquirerStub(inquirer, {
        list: { orgName: '_skip_' },
      });
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: {},
        inquirer,
        stepHistory: new StepHistory(),
      };
      await overrideCwd(servicePath, async () => {
        const stepData = await step.isApplicable(context);
        if (!stepData) throw new Error('Step resolved as not applicable');
        await step.run(context, stepData);
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.be.undefined;
      expect(serviceConfig.app).to.be.undefined;
      expect(context.configuration.org).to.be.undefined;
      expect(context.configuration.app).to.be.undefined;
      expect(context.stepHistory.valuesMap()).to.deep.equal(new Map([['orgName', '_skip_']]));
    });

    it('Should not automatically pre choose single available org if login/register step was presented but service step was not', async () => {
      configureInquirerStub(inquirer, {
        list: { orgName: '_skip_' },
      });
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: {},
        inquirer,
        history: new Map([['dashboardLogin', []]]),
        stepHistory: new StepHistory(),
      };
      await overrideCwd(servicePath, async () => {
        const stepData = await step.isApplicable(context);
        if (!stepData) throw new Error('Step resolved as not applicable');
        await step.run(context, stepData);
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.be.undefined;
      expect(serviceConfig.app).to.be.undefined;
      expect(context.configuration.org).to.be.undefined;
      expect(context.configuration.app).to.be.undefined;
      expect(context.stepHistory.valuesMap()).to.deep.equal(new Map([['orgName', '_skip_']]));
    });

    it('Should setup monitoring with the only available org if login/register and service steps were presented', async () => {
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: {},
        inquirer,
        history: new Map([
          ['dashboardLogin', []],
          ['service', []],
        ]),
        stepHistory: new StepHistory(),
      };
      let stdoutData = '';
      await overrideCwd(servicePath, async () => {
        await overrideStdoutWrite(
          (data) => (stdoutData += data),
          async () => {
            const stepData = await step.isApplicable(context);
            if (!stepData) throw new Error('Step resolved as not applicable');
            await step.run(context, stepData);
          }
        );
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('orgwithoutapps');
      expect(serviceConfig.app).to.equal('some-aws-service');
      expect(context.configuration.org).to.equal('orgwithoutapps');
      expect(context.configuration.app).to.equal('some-aws-service');
      expect(stripAnsi(stdoutData)).to.include(
        'Your project has been setup with org orgwithoutapps and app some-aws-service'
      );
      expect(context.stepHistory.valuesMap()).to.deep.equal(new Map());
    });
  });

  describe('Monitoring setup from CLI flags', () => {
    it('Should setup monitoring for chosen org and app', async () => {
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: { org: 'testinteractivecli', app: 'other-app' },
        inquirer,
        stepHistory: new StepHistory(),
      };
      let stdoutData = '';
      await overrideCwd(servicePath, async () => {
        await overrideStdoutWrite(
          (data) => (stdoutData += data),
          async () => {
            const stepData = await step.isApplicable(context);
            if (!stepData) throw new Error('Step resolved as not applicable');
            await step.run(context, stepData);
          }
        );
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(context.configuration.org).to.equal('testinteractivecli');
      expect(context.configuration.app).to.equal('other-app');
      expect(stripAnsi(stdoutData)).to.include(
        'Your project has been setup with org testinteractivecli and app other-app'
      );
      expect(context.stepHistory.valuesMap()).to.deep.equal(new Map());
    });

    it('Should setup monitoring for chosen org and app even if already configured', async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldOverrideDashboardConfig: true },
      });

      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          org: 'testinteractivecli',
          app: 'some-aws-service-app',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: { org: 'otherorg', app: 'app-from-flag' },
        inquirer,
        stepHistory: new StepHistory(),
      };
      let stdoutData = '';
      await overrideCwd(servicePath, async () => {
        await overrideStdoutWrite(
          (data) => (stdoutData += data),
          async () => {
            const stepData = await step.isApplicable(context);
            if (!stepData) throw new Error('Step resolved as not applicable');
            await step.run(context, stepData);
          }
        );
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('otherorg');
      expect(serviceConfig.app).to.equal('app-from-flag');
      expect(context.configuration.org).to.equal('otherorg');
      expect(context.configuration.app).to.equal('app-from-flag');
      expect(stripAnsi(stdoutData)).to.include(
        'Your project has been setup with org otherorg and app app-from-flag'
      );
      expect(context.stepHistory.valuesMap()).to.deep.equal(
        new Map([['shouldOverrideDashboardConfig', true]])
      );
    });

    it('Should not setup monitoring for chosen org and app even if already configured if rejected', async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldOverrideDashboardConfig: false },
      });
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          org: 'testinteractivecli',
          app: 'some-aws-service-app',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: { org: 'otherorg', app: 'app-from-flag' },
        inquirer,
        stepHistory: new StepHistory(),
      };
      await overrideCwd(servicePath, async () => {
        const stepData = await step.isApplicable(context);
        if (!stepData) throw new Error('Step resolved as not applicable');
        await step.run(context, stepData);
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig).to.not.have.property('org');
      expect(serviceConfig).to.not.have.property('app');
      expect(context.configuration).to.not.have.property('org');
      expect(context.configuration).to.not.have.property('app');
      expect(context.stepHistory.valuesMap()).to.deep.equal(
        new Map([['shouldOverrideDashboardConfig', false]])
      );
    });

    it('Should ask for org if passed in one is invalid', async () => {
      configureInquirerStub(inquirer, {
        list: { orgName: 'testinteractivecli', appName: 'other-app' },
      });
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: { org: 'invalid-testinteractivecli', app: 'irrelevant' },
        inquirer,
        stepHistory: new StepHistory(),
      };
      let stdoutData = '';
      await overrideCwd(servicePath, async () => {
        await overrideStdoutWrite(
          (data) => (stdoutData += data),
          async () => {
            const stepData = await step.isApplicable(context);
            if (!stepData) throw new Error('Step resolved as not applicable');
            await step.run(context, stepData);
          }
        );
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(context.configuration.org).to.equal('testinteractivecli');
      expect(context.configuration.app).to.equal('other-app');
      expect(stripAnsi(stdoutData)).to.include(
        'Your project has been setup with org testinteractivecli and app other-app'
      );
      expect(context.stepHistory.valuesMap()).to.deep.equal(
        new Map([
          ['orgName', '_user_provided_'],
          ['appName', '_user_provided_'],
        ])
      );
    });

    it('Should ask for org if passed in one is invalid and there is a valid on in config', async () => {
      if (semver.lt(serverlessVersion, '1.55.1')) return; // skip on old sls
      configureInquirerStub(inquirer, {
        confirm: { shouldOverrideDashboardConfig: true },
        list: { orgName: 'otherorg', appName: 'other-app' },
      });
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          org: 'testinteractivecli',
          app: 'some-aws-service-app',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: { org: 'invalid-testinteractivecli', app: 'irrelevant' },
        inquirer,
        stepHistory: new StepHistory(),
      };
      let stdoutData = '';
      await overrideCwd(servicePath, async () => {
        await overrideStdoutWrite(
          (data) => (stdoutData += data),
          async () => {
            const stepData = await step.isApplicable(context);
            if (!stepData) throw new Error('Step resolved as not applicable');
            await step.run(context, stepData);
          }
        );
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('otherorg');
      expect(serviceConfig.app).to.equal('other-app');
      expect(context.configuration.org).to.equal('otherorg');
      expect(context.configuration.app).to.equal('other-app');
      expect(stripAnsi(stdoutData)).to.include(
        'Your project has been setup with org otherorg and app other-app'
      );
      expect(context.stepHistory.valuesMap()).to.deep.equal(
        new Map([
          ['orgName', '_user_provided_'],
          ['appName', '_user_provided_'],
          ['shouldOverrideDashboardConfig', true],
        ])
      );
    });

    it('Should ask for app if passed in one is invalid and there is a valid on in config', async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldOverrideDashboardConfig: true },
        list: { orgName: 'testinteractivecli', appName: 'other-app' },
      });
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          org: 'testinteractivecli',
          app: 'some-aws-service-app',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: { org: 'invalid-testinteractivecli', app: 'irrelevant' },
        inquirer,
        stepHistory: new StepHistory(),
      };
      let stdoutData = '';
      await overrideCwd(servicePath, async () => {
        await overrideStdoutWrite(
          (data) => (stdoutData += data),
          async () => {
            const stepData = await step.isApplicable(context);
            if (!stepData) throw new Error('Step resolved as not applicable');
            await step.run(context, stepData);
          }
        );
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(context.configuration.org).to.equal('testinteractivecli');
      expect(context.configuration.app).to.equal('other-app');
      expect(stripAnsi(stdoutData)).to.include(
        'Your project has been setup with org testinteractivecli and app other-app'
      );
      expect(context.stepHistory.valuesMap()).to.deep.equal(
        new Map([
          ['orgName', '_user_provided_'],
          ['appName', '_user_provided_'],
          ['shouldOverrideDashboardConfig', true],
        ])
      );
    });

    it('Should ask for app if passed in one is invalid', async () => {
      configureInquirerStub(inquirer, {
        list: { orgName: 'testinteractivecli', appName: 'other-app' },
      });
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: { org: 'testinteractivecli', app: 'invalid' },
        inquirer,
        stepHistory: new StepHistory(),
      };
      let stdoutData = '';
      await overrideCwd(servicePath, async () => {
        await overrideStdoutWrite(
          (data) => (stdoutData += data),
          async () => {
            const stepData = await step.isApplicable(context);
            if (!stepData) throw new Error('Step resolved as not applicable');
            await step.run(context, stepData);
          }
        );
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(context.configuration.org).to.equal('testinteractivecli');
      expect(context.configuration.app).to.equal('other-app');
      expect(stripAnsi(stdoutData)).to.include(
        'Your project has been setup with org testinteractivecli and app other-app'
      );
      expect(context.stepHistory.valuesMap()).to.deep.equal(
        new Map([['appName', '_user_provided_']])
      );
    });

    it('Should create new app when requested, and setup monitoring with it', async () => {
      configureInquirerStub(inquirer, {
        input: { newAppName: 'frominput' },
        list: { orgName: 'testinteractivecli', appName: '_create_' },
      });
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: {},
        inquirer,
        stepHistory: new StepHistory(),
      };
      let stdoutData = '';
      await overrideCwd(servicePath, async () => {
        await overrideStdoutWrite(
          (data) => (stdoutData += data),
          async () => {
            const stepData = await step.isApplicable(context);
            if (!stepData) throw new Error('Step resolved as not applicable');
            await step.run(context, stepData);
          }
        );
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('frominput');
      expect(context.configuration.org).to.equal('testinteractivecli');
      expect(context.configuration.app).to.equal('frominput');
      expect(stripAnsi(stdoutData)).to.include(
        'Your project has been setup with org testinteractivecli and app frominput'
      );
      expect(context.stepHistory.valuesMap()).to.deep.equal(
        new Map([
          ['orgName', '_user_provided_'],
          ['appName', '_create_'],
          ['newAppName', '_user_provided_'],
        ])
      );
    });
  });

  describe('Monitoring setup when invalid org', () => {
    it('Should provide a way to setup monitoring with an invalid org setting', async () => {
      configureInquirerStub(inquirer, {
        confirm: { shouldUpdateOrg: true },
        list: { orgName: 'testinteractivecli', appName: 'other-app' },
      });
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          org: 'some-other',
          app: 'some-aws-service-app',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: {},
        inquirer,
        stepHistory: new StepHistory(),
      };
      let stdoutData = '';
      await overrideCwd(servicePath, async () => {
        await overrideStdoutWrite(
          (data) => (stdoutData += data),
          async () => {
            const stepData = await step.isApplicable(context);
            if (!stepData) throw new Error('Step resolved as not applicable');
            await step.run(context, stepData);
          }
        );
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(context.configuration.org).to.equal('testinteractivecli');
      expect(context.configuration.app).to.equal('other-app');
      expect(stripAnsi(stdoutData)).to.include(
        'Your project has been setup with org testinteractivecli and app other-app'
      );
      expect(context.stepHistory.valuesMap()).to.deep.equal(
        new Map([
          ['shouldUpdateOrg', true],
          ['orgName', '_user_provided_'],
          ['appName', '_user_provided_'],
        ])
      );
    });
  });

  describe('Monitoring setup when no app', () => {
    it('Should allow to setup app', async () => {
      configureInquirerStub(inquirer, {
        list: { appName: 'other-app' },
      });
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          org: 'testinteractivecli',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: {},
        inquirer,
        stepHistory: new StepHistory(),
      };
      let stdoutData = '';
      await overrideCwd(servicePath, async () => {
        await overrideStdoutWrite(
          (data) => (stdoutData += data),
          async () => {
            const stepData = await step.isApplicable(context);
            if (!stepData) throw new Error('Step resolved as not applicable');
            await step.run(context, stepData);
          }
        );
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(context.configuration.org).to.equal('testinteractivecli');
      expect(context.configuration.app).to.equal('other-app');
      expect(stripAnsi(stdoutData)).to.include(
        'Your project has been setup with org testinteractivecli and app other-app'
      );
      expect(context.stepHistory.valuesMap()).to.deep.equal(
        new Map([['appName', '_user_provided_']])
      );
    });
  });

  describe('Monitoring setup when no app with --app flag', () => {
    it('Should allow to setup app', async () => {
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          org: 'testinteractivecli',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: { app: 'app-from-flag' },
        inquirer,
        stepHistory: new StepHistory(),
      };
      let stdoutData = '';
      await overrideCwd(servicePath, async () => {
        await overrideStdoutWrite(
          (data) => (stdoutData += data),
          async () => {
            const stepData = await step.isApplicable(context);
            if (!stepData) throw new Error('Step resolved as not applicable');
            await step.run(context, stepData);
          }
        );
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('app-from-flag');
      expect(context.configuration.org).to.equal('testinteractivecli');
      expect(context.configuration.app).to.equal('app-from-flag');
      expect(stripAnsi(stdoutData)).to.include(
        'Your project has been setup with org testinteractivecli and app app-from-flag'
      );
      expect(context.stepHistory.valuesMap()).to.deep.equal(new Map());
    });

    it('Should create a default app if no apps exist', async () => {
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'someservice',
          org: 'orgwithoutapps',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        options: {},
        configurationFilename: 'serverless.yml',
        inquirer,
        stepHistory: new StepHistory(),
      };
      let stdoutData = '';
      await overrideCwd(servicePath, async () => {
        await overrideStdoutWrite(
          (data) => (stdoutData += data),
          async () => {
            const stepData = await step.isApplicable(context);
            if (!stepData) throw new Error('Step resolved as not applicable');
            await step.run(context, stepData);
          }
        );
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('orgwithoutapps');
      expect(serviceConfig.app).to.equal('someservice');
      expect(context.configuration.org).to.equal('orgwithoutapps');
      expect(context.configuration.app).to.equal('someservice');
      expect(stripAnsi(stdoutData)).to.include(
        'Your project has been setup with org orgwithoutapps and app someservice'
      );
      expect(context.stepHistory.valuesMap()).to.deep.equal(new Map());
    });

    it('Should allow to setup app when app is invalid', async () => {
      configureInquirerStub(inquirer, {
        list: { appName: 'other-app' },
      });
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          org: 'testinteractivecli',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: { app: 'invalid-app-from-flag' },
        inquirer,
        stepHistory: new StepHistory(),
      };
      let stdoutData = '';
      await overrideCwd(servicePath, async () => {
        await overrideStdoutWrite(
          (data) => (stdoutData += data),
          async () => {
            const stepData = await step.isApplicable(context);
            if (!stepData) throw new Error('Step resolved as not applicable');
            await step.run(context, stepData);
          }
        );
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(context.configuration.org).to.equal('testinteractivecli');
      expect(context.configuration.app).to.equal('other-app');
      expect(stripAnsi(stdoutData)).to.include(
        'Your project has been setup with org testinteractivecli and app other-app'
      );
      expect(context.stepHistory.valuesMap()).to.deep.equal(
        new Map([['appName', '_user_provided_']])
      );
    });
  });

  describe('Monitoring setup when invalid app', () => {
    it('Should recognize an invalid app and allow to create it', async () => {
      configureInquirerStub(inquirer, {
        list: { appUpdateType: 'create' },
      });
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          org: 'testinteractivecli',
          app: 'not-created-app',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: {},
        inquirer,
        stepHistory: new StepHistory(),
      };
      let stdoutData = '';
      await overrideCwd(servicePath, async () => {
        await overrideStdoutWrite(
          (data) => (stdoutData += data),
          async () => {
            const stepData = await step.isApplicable(context);
            if (!stepData) throw new Error('Step resolved as not applicable');
            await step.run(context, stepData);
          }
        );
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('not-created-app');
      expect(context.configuration.org).to.equal('testinteractivecli');
      expect(context.configuration.app).to.equal('not-created-app');
      expect(stripAnsi(stdoutData)).to.include(
        'Your project has been setup with org testinteractivecli and app not-created-app'
      );
      expect(context.stepHistory.valuesMap()).to.deep.equal(new Map([['appUpdateType', 'create']]));
    });

    it('Should recognize an invalid app and allow to replace it with existing one', async () => {
      configureInquirerStub(inquirer, {
        list: { appUpdateType: 'chooseExisting', appName: 'other-app' },
      });
      const { servicePath } = await fixtures.setup('aws-loggedin-service');
      const context = {
        serviceDir: servicePath,
        configuration: {
          service: 'some-aws-service',
          org: 'testinteractivecli',
          app: 'not-created-app',
          provider: { name: 'aws', runtime: 'nodejs12.x' },
        },
        configurationFilename: 'serverless.yml',
        options: {},
        inquirer,
        stepHistory: new StepHistory(),
      };
      let stdoutData = '';
      await overrideCwd(servicePath, async () => {
        await overrideStdoutWrite(
          (data) => (stdoutData += data),
          async () => {
            const stepData = await step.isApplicable(context);
            if (!stepData) throw new Error('Step resolved as not applicable');
            await step.run(context, stepData);
          }
        );
      });
      const serviceConfig = yaml.parse(String(await readFile(join(servicePath, 'serverless.yml'))));
      expect(serviceConfig.org).to.equal('testinteractivecli');
      expect(serviceConfig.app).to.equal('other-app');
      expect(context.configuration.org).to.equal('testinteractivecli');
      expect(context.configuration.app).to.equal('other-app');
      expect(stripAnsi(stdoutData)).to.include(
        'Your project has been setup with org testinteractivecli and app other-app'
      );
      expect(context.stepHistory.valuesMap()).to.deep.equal(
        new Map([
          ['appUpdateType', 'chooseExisting'],
          ['appName', '_user_provided_'],
        ])
      );
    });
  });
});
