'use strict';

const chalk = require('chalk');
const {
  configureFetchDefaults,
  getLoggedInUser,
  openBrowser,
} = require('@serverless/platform-sdk');
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
const { hookIntoVariableGetter } = require('./variables');
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

    // forward compatibility with org
    sls.service.tenant = sls.service.org || sls.service.tenant;

    // Doubled check due to SLS bug: https://github.com/serverless/serverless/pull/6367
    // TODO: Remove with next major
    if (sls.processedInput.commands.includes('interactiveCli')) {
      const interactiveCliHooks = interactiveCli(sls);
      if (interactiveCliHooks) {
        this.hooks = interactiveCliHooks;
        return;
      }
    }

    configureFetchDefaults();
    const user = getLoggedInUser();
    const currentCommand = sls.processedInput.commands[0];

    // default hook, only applies if user isn't using SFE. gets overridden if they are
    this.hooks = {
      'after:aws:deploy:finalize:cleanup': () =>
        sls.cli.log(
          'Run the "serverless" command to setup monitoring, troubleshooting and testing.',
          'Serverless Enterprise'
        ),
    };

    // Check if Enterprise is configured
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

    // Skip everything if user is not logged in and not trying to log in or out...
    if (
      !user &&
      (currentCommand !== 'login' &&
        currentCommand !== 'logout' &&
        !process.env.SERVERLESS_ACCESS_KEY)
    ) {
      if (missing.includes('tenant') && missing.includes('app')) {
        return; // user isn't trying to use SFE
      }
      const errorMessage = 'You are not currently logged in. To log in, use: $ serverless login';
      console.log(''); // eslint-disable-line no-console
      sls.cli.log(errorMessage, 'Serverless Enterprise');
      throw new Error(errorMessage);
    }
    if (currentCommand !== 'login' && currentCommand !== 'logout' && missing.length > 0) return;

    sls.enterpriseEnabled = true;

    // Defaults
    this.state = {}; // Useful for storing data across hooks
    this.state.secretsUsed = new Set();
    this.provider = this.sls.getProvider('aws');

    // Add commands
    this.commands = {
      'login': {
        usage: 'Login or sign up for Serverless Enterprise',
        lifecycleEvents: ['login'],
        enterprise: true,
      },
      'logout': {
        usage: 'Logout from Serverless Enterprise',
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
        usage: 'Open the Serverless Enterprise dashboard',
        lifecycleEvents: ['dashboard'],
        enterprise: true,
      },
    };

    // Set Plugin hooks for all Enteprise Plugin features here
    this.hooks = {
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
      'after:aws:deploy:finalize:cleanup': this.route('after:aws:deploy:finalize:cleanup').bind(
        this
      ),
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
      'before:step-functions-offline:start': this.route('before:step-functions-offline:start').bind(
        this
      ),
      'login:login': this.route('login:login').bind(this),
      'logout:logout': this.route('logout:logout').bind(this),
      'generate-event:generate-event': this.route('generate-event:generate-event').bind(this),
      'test:test': this.route('test:test').bind(this),
      'dashboard:dashboard': this.route('dashboard:dashboard').bind(this),
    };
  }

  /*
   * Route
   */

  route(hook) {
    const self = this;
    return async () => {
      switch (hook) {
        case 'before:package:createDeploymentArtifacts':
          Object.assign(
            self.sls.service,
            await getAppUids(self.sls.service.tenant, self.sls.service.app)
          );
          createAndSetDeploymentUid(self);
          await wrap(self);
          await injectLogsIamRole(self);
          await injectOutputOutputs(self);
          await setApiGatewayAccessLogFormat(self);
          break;
        case 'after:package:createDeploymentArtifacts':
          await wrapClean(self);
          break;
        case 'before:deploy:function:packageFunction':
          createAndSetDeploymentUid(self);
          await wrap(self);
          break;
        case 'after:deploy:function:packageFunction':
          await wrapClean(self);
          break;
        case 'before:aws:package:finalize:saveServiceState':
          await getCredentials(self);
          await logsCollection(self);
          break;
        case 'before:deploy:deploy':
          this.enterprise = {
            errorHandler: errorHandler(this), // V.1 calls this when it crashes
          };
          await runPolicies(self);
          break;
        case 'before:aws:deploy:deploy:createStack':
          break;
        case 'after:aws:deploy:finalize:cleanup':
          await saveDeployment(self);
          break;
        case 'before:info:info':
          await getCredentials(self);
          break;
        case 'after:info:info':
          // eslint-disable-next-line no-console
          console.log(
            chalk.yellow(
              `Run "serverless dashboard" to open the dashboard or visit ${getDashboardUrl(self)}`
            )
          );
          break;
        case 'dashboard:dashboard':
          openBrowser(getDashboardUrl(self));
          break;
        case 'before:logs:logs':
          await getCredentials(self);
          break;
        case 'before:metrics:metrics':
          await getCredentials(self);
          break;
        case 'before:remove:remove':
          await getCredentials(self);
          break;
        case 'after:remove:remove':
          Object.assign(
            self.sls.service,
            await getAppUids(self.sls.service.tenant, self.sls.service.app)
          );
          await removeDestination(self);
          await saveDeployment(self, true);
          break;
        case 'before:invoke:local:invoke':
          Object.assign(self.sls.service, {
            appUid: '000000000000000000',
            tenantUid: '000000000000000000',
          });
          await wrap(self);
          break;
        case 'after:invoke:local:invoke':
          await wrapClean(self);
          break;
        case 'before:offline:start:init':
          // await wrap(self)
          break;
        case 'before:step-functions-offline:start':
          // await wrap(self)
          break;
        case 'login:login':
          await login(self);
          break;
        case 'logout:logout':
          await logout(self);
          break;
        case 'generate-event:generate-event':
          await generate(self);
          break;
        case 'test:test':
          await test(self);
          break;
        default:
      }
    };
  }

  async asyncInit() {
    if (
      !this.sls.enterpriseEnabled ||
      this.sls.processedInput.commands[0] === 'login' ||
      this.sls.processedInput.commands[0] === 'logout'
    ) {
      hookIntoVariableGetter(this, {});
      return;
    }

    await configureDeployProfile(this);
  }
}

module.exports = ServerlessEnterprisePlugin;
