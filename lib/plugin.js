'use strict';

const chalk = require('chalk');
const _ = require('lodash');
const {
  configureFetchDefaults,
  getAccessKeyForTenant,
  getMetadata,
} = require('@serverless/platform-sdk');
const open = require('open');
const errorHandler = require('./errorHandler');
const logsCollection = require('./logsCollection');
const login = require('./login');
const logout = require('./logout');
const wrap = require('./wrap');
const injectLogsIamRole = require('./injectLogsIamRole');
const injectOutputOutputs = require('./injectOutputOutputs');
const wrapClean = require('./wrapClean');
const getCredentials = require('./credentials');
const getAppUids = require('./appUids');
const removeDestination = require('./removeDestination');
const { saveDeployment, createAndSetDeploymentUid } = require('./deployment');
const variables = require('./variables');
const { generate, eventDict } = require('./generateEvent');
const { configureDeployProfile } = require('./deployProfile');
const { test } = require('./test');
const { getDashboardUrl } = require('./dashboard');
const setApiGatewayAccessLogFormat = require('./setApiGatewayAccessLogFormat');
const interactiveCli = require('./interactiveCli');
const paramCommand = require('./paramCommand');
const outputCommand = require('./outputCommand');
const isAuthenticated = require('./isAuthenticated');
const throwAuthError = require('./throwAuthError');

const userNodeVersion = Number(process.version.split('.')[0].slice(1));

const unconditionalCommands = new Set([
  'dashboard',
  'generate-event',
  'help',
  'login',
  'logout',
  'plugin',
]);

/*
 * Serverless Enterprise Plugin
 */

class ServerlessEnterprisePlugin {
  constructor(sls) {
    this.sls = sls;

    // Defaults
    this.state = {}; // Useful for storing data across hooks
    this.state.secretsUsed = new Set();

    // Backward compatibility with `tenant`
    sls.service.org = sls.service.org || sls.service.tenant;
    delete sls.service.tenant;

    if (sls.configSchemaHandler && sls.service.provider.name === 'aws') {
      // Source:
      // https://github.com/serverless/enterprise-dashboard/blob/6c3a0fa28bff97a80d5f3f88a907fa887f734151/backend/src/utils/formats.js#L44-L48
      sls.configSchemaHandler.defineTopLevelProperty('org', {
        type: 'string',
        pattern: '^[a-z0-9]{5,39}$',
      });
      // Source:
      // https://github.com/serverless/enterprise-dashboard/blob/6c3a0fa28bff97a80d5f3f88a907fa887f734151/backend/src/utils/formats.js#L50-L56
      sls.configSchemaHandler.defineTopLevelProperty('app', {
        type: 'string',
        pattern: '^[a-z0-9][a-z0-9-]{1,37}[a-z0-9]$',
      });
      sls.configSchemaHandler.defineTopLevelProperty('outputs', {
        type: 'object',
        additionalProperties: {
          anyOf: [
            { type: 'string' },
            { type: 'number' },
            { type: 'boolean' },
            { type: 'array' },
            { type: 'object' },
          ],
        },
      });
      sls.configSchemaHandler.defineCustomProperties({
        properties: {
          enterprise: {
            type: 'object',
            properties: {
              collectApiGatewayLogs: { type: 'boolean' },
              collectLambdaLogs: { type: 'boolean' },
              compressLogs: { type: 'boolean' },
              disableAwsSpans: { type: 'boolean' },
              disableFrameworkInstrumentation: { type: 'boolean' },
              disableHttpSpans: { type: 'boolean' },
              logAccessIamRole: { $ref: '#/definitions/awsArnString' },
              logIngestMode: { enum: ['push', 'pull'] },
            },
            additionalProperties: false,
          },
          safeguards: {
            type: 'object',
            properties: {
              isDisabled: { type: 'boolean' },
            },
            additionalProperties: false,
          },
        },
      });
    }

    const {
      service,
      processedInput: { options: cliOptions },
    } = this.sls;
    service.isDashboardMonitoringPreconfigured = Boolean(service.org);
    if (service.isDashboardMonitoringPreconfigured) {
      service.isDashboardAppPreconfigured = Boolean(service.app);
      service.isDashboardMonitoringOverridenByCli =
        (cliOptions.org && cliOptions.org !== service.org) ||
        (cliOptions.app && cliOptions.app !== service.app);
    }
    if (cliOptions.org) service.org = cliOptions.org;
    if (cliOptions.app) service.app = cliOptions.app;

    configureFetchDefaults();

    // Configure commands available to logged out users
    this.commands = {
      'login': {
        usage: 'Login or sign up for Serverless',
        lifecycleEvents: ['login'],
        enterprise: true,
      },
      'logout': {
        usage: 'Logout from Serverless',
        lifecycleEvents: ['logout'],
        enterprise: true,
      },
      'generate-event': {
        usage: 'Generate event',
        lifecycleEvents: ['generate-event'],
        options: {
          type: {
            usage: `Specify event type. ${_.keys(eventDict).join(', ')} are supported.`,
            shortcut: 't',
            required: true,
          },
          body: {
            usage: 'Specify the body for the message, request, or stream event.',
            shortcut: 'b',
          },
        },
        enterprise: true,
      },
      'test': {
        usage: 'Run HTTP tests',
        lifecycleEvents: ['test'],
        options: {
          function: {
            usage: 'Specify the function to test',
            shortcut: 'f',
          },
          test: {
            usage: 'Specify a specific test to run',
            shortcut: 't',
          },
        },
        enterprise: true,
      },
      'dashboard': {
        usage: 'Open the Serverless dashboard',
        lifecycleEvents: ['dashboard'],
        enterprise: true,
      },
      'output': {
        usage: '',
        commands: {
          get: {
            usage: 'Get value of dashboard deployment profile parameter',
            lifecycleEvents: ['get'],
            options: {
              name: { usage: 'Ouptut name' },
              org: { usage: 'Dashboard org' },
              app: { usage: 'Dashboard app' },
              service: { usage: 'Dashboard service' },
              stage: { usage: 'Dashboard stage' },
              region: { usage: 'Region' },
            },
          },
          list: {
            usage: 'List all dashboard deployment profile parameters',
            lifecycleEvents: ['list'],
            options: {
              org: { usage: 'Dashboard org' },
              app: { usage: 'Dashboard app' },
              service: { usage: 'Dashboard service' },
              stage: { usage: 'Dashboard stage' },
              region: { usage: 'Region' },
            },
          },
        },
      },
      'param': {
        usage: '',
        commands: {
          get: {
            usage: 'Get value of dashboard service output',
            lifecycleEvents: ['get'],
            options: {
              org: { usage: 'Dashboard org' },
              app: { usage: 'Dashboard app' },
              stage: { usage: 'Dashboard stage' },
            },
          },
          list: {
            usage: 'List all dashboard service outputs',
            lifecycleEvents: ['list'],
            options: {
              org: { usage: 'Dashboard org' },
              app: { usage: 'Dashboard app' },
              stage: { usage: 'Dashboard stage' },
            },
          },
        },
      },
      'studio': {
        usage: 'Develop a Serverless application in the cloud.',
        lifecycleEvents: ['studio'],
        options: {
          stage: {
            usage: 'Stage to use for development.',
            shortcut: 's',
          },
          region: {
            usage: 'Region to use for development.',
            shortcut: 'r',
          },
          autoStage: {
            usage: 'If specified, generate a random stage. This stage will be removed on exit.',
            shortcut: 'a',
          },
        },
        enterprise: true,
        configDependent: true,
      },
    };
    this.hooks = {
      'login:login': this.route('login:login').bind(this),
      'logout:logout': this.route('logout:logout').bind(this),
      'generate-event:generate-event': this.route('generate-event:generate-event').bind(this),
      'test:test': this.route('test:test').bind(this),
      'dashboard:dashboard': this.route('dashboard:dashboard').bind(this),
      'output:get:get': this.route('output:get:get').bind(this),
      'output:list:list': this.route('output:list:list').bind(this),
      'param:get:get': this.route('param:get:get').bind(this),
      'param:list:list': this.route('param:list:list').bind(this),
      // behavior is conditional on this.sls.enterpriseEnabled
      'after:aws:deploy:finalize:cleanup': this.route('after:aws:deploy:finalize:cleanup').bind(
        this
      ),
      'studio:studio': this.route('studio:studio').bind(this),
    };
    this.variableResolvers = {
      param: {
        resolver: variables.getValueFromDashboardParams(this),
        serviceName: 'Serverless Parameters',
        isDisabledAtPrepopulation: true,
      },
      secrets: {
        resolver: variables.getValueFromDashboardParams(this),
        serviceName: 'Serverless Secrets',
        isDisabledAtPrepopulation: true,
      },
      output: {
        resolver: variables.getValueFromDashboardOutputs(this),
        serviceName: 'Serverless Outputs',
        isDisabledAtPrepopulation: true,
      },
      state: {
        resolver: variables.getValueFromDashboardOutputs(this),
        serviceName: 'Serverless Outputs',
        isDisabledAtPrepopulation: true,
      },
    };

    // set allowed plugin options
    for (const plugin of sls.pluginManager.plugins) {
      if (plugin.constructor.name === 'InteractiveCli' && plugin.commands) {
        if (!plugin.commands.interactiveCli.options) {
          plugin.commands.interactiveCli.options = {};
        }
        plugin.commands.interactiveCli.options.app = { usage: 'Dashboard app' };
        plugin.commands.interactiveCli.options.org = { usage: 'Dashboard org' };
      } else if (plugin.commands) {
        for (const command of _.values(plugin.commands)) {
          if (command.configDependent) {
            command.options.app = { usage: 'Dashboard app' };
            command.options.org = { usage: 'Dashboard org' };
          }
        }
      }
    }
    // Also adding in commands object of plugin man bc generating help doesn't reread the plugin
    // itself
    for (const command of _.values(sls.pluginManager.commands)) {
      if (command.configDependent) {
        command.options.app = { usage: 'Dashboard app' };
        command.options.org = { usage: 'Dashboard org' };
      }
    }

    // Add interactive CLI hooks
    Object.assign(this.hooks, interactiveCli(this));

    // Check if dashboard is configured
    const missing = [];
    if (!sls.service.org) {
      missing.push('org');
    }
    if (!sls.service.app) {
      missing.push('app');
    }
    if (!sls.service.service) {
      missing.push('service');
    }
    if (missing.length > 0) {
      this.sfeEnabledHooks = {};
    } else {
      if (
        sls.service.app.match(new RegExp(sls.service.provider.variableSyntax)) ||
        sls.service.org.match(new RegExp(sls.service.provider.variableSyntax))
      ) {
        throw new this.sls.classes.Error(
          '"app" and "org" in your serverless config can not use the variable system'
        );
      }

      this.sfeEnabledHooks = {
        'before:package:createDeploymentArtifacts': this.route(
          'before:package:createDeploymentArtifacts'
        ).bind(this),
        'after:package:createDeploymentArtifacts': this.route(
          'after:package:createDeploymentArtifacts'
        ).bind(this),
        'before:deploy:function:packageFunction': this.route(
          'before:deploy:function:packageFunction'
        ).bind(this),
        'after:deploy:function:packageFunction': this.route(
          'after:deploy:function:packageFunction'
        ).bind(this),
        'before:invoke:local:invoke': this.route('before:invoke:local:invoke').bind(this),
        'before:aws:package:finalize:saveServiceState': this.route(
          'before:aws:package:finalize:saveServiceState'
        ).bind(this),
        'before:deploy:deploy': this.route('before:deploy:deploy').bind(this),
        'before:aws:deploy:deploy:createStack': this.route(
          'before:aws:deploy:deploy:createStack'
        ).bind(this),
        'after:deploy:finalize': this.route('after:deploy:finalize').bind(this),
        'after:deploy:deploy': this.route('after:deploy:deploy').bind(this),
        'before:info:info': this.route('before:info:info').bind(this),
        'after:info:info': this.route('after:info:info').bind(this),
        'before:logs:logs': this.route('before:logs:logs').bind(this),
        'before:metrics:metrics': this.route('before:metrics:metrics').bind(this),
        'before:remove:remove': this.route('before:remove:remove').bind(this),
        'after:remove:remove': this.route('after:remove:remove').bind(this),
        'after:invoke:local:invoke': this.route('after:invoke:local:invoke').bind(this),
        'before:offline:start:init': this.route('before:offline:start:init').bind(this),
        'before:step-functions-offline:start': this.route(
          'before:step-functions-offline:start'
        ).bind(this),
      };
      // Set Plugin hooks for authenticated Enteprise Plugin features
      Object.assign(this.hooks, this.sfeEnabledHooks);
    }
  }

  /*
   * Route
   */

  route(hook) {
    return async () => {
      if (_.get(this.sls.service, 'custom.safeguards.isDisabled')) {
        this.sls.logDeprecation(
          'DASHBOARD_SAFEGUARDS_DISABLER',
          '"custom.safeguards.isDisabled" setting is safe to remove. It will not be recognized as valid with next major release.'
        );
      }
      // throw an error if SFE is disabled and running an SFE only hook
      if (!this.sls.enterpriseEnabled && _.keys(this.sfeEnabledHooks).includes(hook)) {
        throwAuthError(this.sls);
      }

      switch (hook) {
        case 'before:package:createDeploymentArtifacts': {
          const accessKey = await getAccessKeyForTenant(this.sls.service.org);
          const { supportedRegions } = await getMetadata(accessKey);
          const region = this.provider.getRegion();
          if (!supportedRegions.includes(region)) {
            throw new this.sls.classes.Error(
              `"${region}" region is not supported by dashboard`,
              'DASHBOARD_NOT_SUPPORTED_REGION'
            );
          }
          Object.assign(
            this.sls.service,
            await getAppUids(this.sls.service.org, this.sls.service.app)
          );
          createAndSetDeploymentUid(this);
          await wrap(this);
          await injectLogsIamRole(this);
          await injectOutputOutputs(this);
          await setApiGatewayAccessLogFormat(this);
          break;
        }
        case 'after:package:createDeploymentArtifacts':
          await wrapClean(this);
          break;
        case 'before:deploy:function:packageFunction':
          createAndSetDeploymentUid(this);
          await wrap(this);
          break;
        case 'after:deploy:function:packageFunction':
          await wrapClean(this);
          break;
        case 'before:aws:package:finalize:saveServiceState':
          await getCredentials(this);
          await logsCollection(this);
          break;
        case 'before:deploy:deploy':
          this.enterprise = {
            errorHandler: errorHandler(this), // V.1 calls this when it crashes
          };
          break;
        case 'before:aws:deploy:deploy:createStack':
          break;
        case 'after:aws:deploy:finalize:cleanup':
          if (this.sls.enterpriseEnabled) {
            await saveDeployment(this);
          }
          break;
        case 'before:info:info':
          await getCredentials(this);
          break;
        case 'after:info:info':
          // eslint-disable-next-line no-console
          console.log(
            chalk.yellow(
              `Run "serverless dashboard" to open the dashboard or visit ${getDashboardUrl(this)}`
            )
          );
          break;
        case 'dashboard:dashboard':
          open(getDashboardUrl(this));
          break;
        case 'before:logs:logs':
          await getCredentials(this);
          break;
        case 'before:metrics:metrics':
          await getCredentials(this);
          break;
        case 'before:remove:remove':
          await getCredentials(this);
          break;
        case 'after:remove:remove':
          Object.assign(
            this.sls.service,
            await getAppUids(this.sls.service.org, this.sls.service.app)
          );
          await removeDestination(this);
          await saveDeployment(this, true);
          break;
        case 'before:invoke:local:invoke':
          Object.assign(this.sls.service, {
            appUid: '000000000000000000',
            orgUid: '000000000000000000',
          });
          await wrap(this);
          break;
        case 'after:invoke:local:invoke':
          await wrapClean(this);
          break;
        case 'before:offline:start:init':
          // await wrap(this)
          break;
        case 'before:step-functions-offline:start':
          // await wrap(this)
          break;
        case 'login:login':
          await login(this);
          break;
        case 'logout:logout':
          await logout(this);
          break;
        case 'studio:studio':
          if (userNodeVersion >= 8) {
            const studio = require('./studio');
            await studio(this);
          } else {
            this.sls.cli.log('Node 8 or higher is required to run Serverless Studio.');
          }
          break;
        case 'generate-event:generate-event':
          await generate(this);
          break;
        case 'test:test':
          await test(this);
          break;
        case 'param:get:get':
          await paramCommand.get(this);
          break;
        case 'param:list:list':
          await paramCommand.list(this);
          break;
        case 'output:get:get':
          await outputCommand.get(this);
          break;
        case 'output:list:list':
          await outputCommand.list(this);
          break;

        default:
      }
    };
  }

  async asyncInit() {
    if (
      this.sls.processedInput.options['help-interactive'] ||
      this.sls.processedInput.options.help
    ) {
      return;
    }
    if (this.sls.interactiveCli && this.sls.interactiveCli.initializeServiceConfiguration) {
      // Filter available projects to create if there's an intention to configure dashboard
      if (this.sls.processedInput.options.org || this.sls.processedInput.options.app) {
        this.sls.interactiveCli.initializeServiceConfiguration.initializeProjectChoices = this.sls.interactiveCli.initializeServiceConfiguration.initializeProjectChoices.filter(
          ({ value }) => ['aws-nodejs', 'aws-python3', 'aws-python'].includes(value)
        );
      }
    }

    const missingConfigSettings = [];
    if (!this.sls.service.org) {
      missingConfigSettings.push('org');
    }
    if (!this.sls.service.app) {
      missingConfigSettings.push('app');
    }
    if (!this.sls.service.service) {
      missingConfigSettings.push('service');
    }
    const currentCommand = this.sls.processedInput.commands[0];
    if (
      missingConfigSettings.length === 0 &&
      isAuthenticated() &&
      !unconditionalCommands.has(currentCommand)
    ) {
      this.sls.enterpriseEnabled = true;
    }
    // this.provider, intentionally not set in constructor, as then it affects plugin validation
    // in serverless, which will discard plugin when command not run in service context:
    // https://github.com/serverless/serverless/blob/f0ccf6441ace7b5cc524e774f025a39c3c0667f2/lib/classes/PluginManager.js#L78
    this.provider = this.sls.getProvider('aws');
    if (this.sls.enterpriseEnabled) await configureDeployProfile(this);
  }
}

module.exports = ServerlessEnterprisePlugin;
