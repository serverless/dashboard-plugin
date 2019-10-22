'use strict';

const chalk = require('chalk');
const updateNotifier = require('update-notifier');
const {
  configureFetchDefaults,
  getLoggedInUser,
  openBrowser,
} = require('@serverless/platform-sdk');
const sfePkgJson = require('../package');
const errorHandler = require('./errorHandler');
const logsCollection = require('./logsCollection');
const login = require('./login');
const logout = require('./logout');
const wrap = require('./wrap');
const injectLogsIamRole = require('./injectLogsIamRole');
const injectOutputOutputs = require('./injectOutputOutputs');
const wrapClean = require('./wrapClean');
const runPolicies = require('./safeguards');
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

/*
 * Serverless Enterprise Plugin
 */

class ServerlessEnterprisePlugin {
  constructor(sls) {
    this.sls = sls;

    // Defaults
    this.state = {}; // Useful for storing data across hooks
    this.state.secretsUsed = new Set();

    // forward compatibility with org
    sls.service.tenant = sls.service.org || sls.service.tenant;

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
            usage: `Specify event type. ${Object.keys(eventDict).join(', ')} are supported.`,
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
    };
    this.hooks = {
      'login:login': this.route('login:login').bind(this),
      'logout:logout': this.route('logout:logout').bind(this),
      'generate-event:generate-event': this.route('generate-event:generate-event').bind(this),
      'test:test': this.route('test:test').bind(this),
      'dashboard:dashboard': this.route('dashboard:dashboard').bind(this),
      // behavior is conditional on this.sls.enterpriseEnabled
      'after:aws:deploy:finalize:cleanup': this.route('after:aws:deploy:finalize:cleanup').bind(
        this
      ),
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

    // set allowed interactive CLI options
    const coreInteractivePlugin = sls.pluginManager.plugins.find(
      plugin => plugin.constructor.name === 'InteractiveCli'
    );
    if (coreInteractivePlugin && coreInteractivePlugin.commands) {
      if (!coreInteractivePlugin.commands.interactiveCli.options) {
        coreInteractivePlugin.commands.interactiveCli.options = {};
      }
      // Extend options
      coreInteractivePlugin.commands.interactiveCli.options.app = { usage: 'Dashboard app' };
      coreInteractivePlugin.commands.interactiveCli.options.org = { usage: 'Dashboard org' };
    }

    // Add interactive CLI hooks
    Object.assign(this.hooks, interactiveCli(this));

    // Check if dashboard is configured
    const missing = [];
    if (!sls.service.tenant) {
      missing.push('tenant');
    }
    if (!sls.service.app) {
      missing.push('app');
    }
    if (!sls.service.service) {
      missing.push('service');
    }
    if (missing.length > 0) {
      // user isn't configured to use SFE
      Object.assign(this.hooks, {
        'after:aws:deploy:finalize:cleanup': () =>
          sls.cli.log(
            'Run the "serverless" command to setup monitoring, troubleshooting and testing.'
          ),
      });
      this.sfeEnabledHooks = {};
    } else {
      if (
        sls.service.app.match(new RegExp(sls.service.provider.variableSyntax)) ||
        sls.service.tenant.match(new RegExp(sls.service.provider.variableSyntax))
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
      // throw an error if SFE is disabled and running an SFE only hook
      if (!this.sls.enterpriseEnabled && Object.keys(this.sfeEnabledHooks).includes(hook)) {
        const errorMessage = process.env.CI
          ? 'You are not currently logged in. Follow instructions in http://slss.io/run-in-cicd to setup env vars for authentication.'
          : 'You are not currently logged in. To log in, use: $ serverless login';
        console.log(''); // eslint-disable-line no-console
        this.sls.cli.log(errorMessage);
        throw new this.sls.classes.Error(errorMessage);
      }

      switch (hook) {
        case 'before:package:createDeploymentArtifacts':
          Object.assign(
            this.sls.service,
            await getAppUids(this.sls.service.tenant, this.sls.service.app)
          );
          createAndSetDeploymentUid(this);
          await wrap(this);
          await injectLogsIamRole(this);
          await injectOutputOutputs(this);
          await setApiGatewayAccessLogFormat(this);
          break;
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
          await runPolicies(this);
          break;
        case 'before:aws:deploy:deploy:createStack':
          break;
        case 'after:aws:deploy:finalize:cleanup':
          if (!this.sls.enterpriseEnabled) {
            this.sls.cli.log(
              'Run the "serverless" command to setup monitoring, troubleshooting and testing.'
            );
          } else {
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
          openBrowser(getDashboardUrl(this));
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
            await getAppUids(this.sls.service.tenant, this.sls.service.app)
          );
          await removeDestination(this);
          await saveDeployment(this, true);
          break;
        case 'before:invoke:local:invoke':
          Object.assign(this.sls.service, {
            appUid: '000000000000000000',
            tenantUid: '000000000000000000',
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
        case 'generate-event:generate-event':
          await generate(this);
          break;
        case 'test:test':
          await test(this);
          break;
        default:
      }
    };
  }

  async asyncInit() {
    // Filter available projects to create
    if (
      this.sls.interactiveCli &&
      this.sls.interactiveCli.initializeServiceConfiguration &&
      this.sls.interactiveCli.initializeServiceConfiguration.initializeProjectChoices
    ) {
      for (
        let i = 0;
        i < this.sls.interactiveCli.initializeServiceConfiguration.initializeProjectChoices.length;
        i++
      ) {
        if (
          !['aws-nodejs', 'aws-python3', 'aws-python'].includes(
            this.sls.interactiveCli.initializeServiceConfiguration.initializeProjectChoices[i].value
          )
        ) {
          this.sls.interactiveCli.initializeServiceConfiguration.initializeProjectChoices.splice(
            i,
            1
          );
          i--;
        }
      }
    }

    // override app & tenant from CLI flags if set and not in interactive mode
    if (!this.sls.interactiveCli) {
      if (this.sls.processedInput.options.org) {
        this.sls.service.tenant = this.sls.processedInput.options.org;
      }
      if (this.sls.processedInput.options.app) {
        this.sls.service.app = this.sls.processedInput.options.app;
      }
    }
    const missingConfigSettings = [];
    if (!this.sls.service.tenant) {
      missingConfigSettings.push('tenant');
    }
    if (!this.sls.service.app) {
      missingConfigSettings.push('app');
    }
    if (!this.sls.service.service) {
      missingConfigSettings.push('service');
    }
    const user = getLoggedInUser();
    const currentCommand = this.sls.processedInput.commands[0];
    if (
      missingConfigSettings.length === 0 &&
      (user || process.env.SERVERLESS_ACCESS_KEY) &&
      !['login', 'logout', 'generate-event'].includes(currentCommand)
    ) {
      this.sls.enterpriseEnabled = true;
    }
    // this.provider, intentionally not set in constructor, as then it affects plugin validation
    // in serverless, which will discard plugin when command not run in service context:
    // https://github.com/serverless/serverless/blob/f0ccf6441ace7b5cc524e774f025a39c3c0667f2/lib/classes/PluginManager.js#L78
    this.provider = this.sls.getProvider('aws');
    if (!this.sls.interactiveCli && this.sls.enterpriseEnabled) {
      const updates = updateNotifier({ pkg: sfePkgJson, interval: 1 });
      if (updates.update) {
        this.sls.cli.log(
          'An updated version of the Serverless Dashboard is available. ' +
            'Please upgrade by running `npm i -g serverless`'
        );
      }
      await configureDeployProfile(this);
    }
  }
}

module.exports = ServerlessEnterprisePlugin;
