'use strict';

const chalk = require('chalk');
const _ = require('lodash');
const {
  createApp,
  createAccessKeyForTenant,
  createDeployProfile,
  getApps,
  getDeployProfiles,
  getLoggedInUser,
  getMetadata,
  listTenants,
  refreshToken,
  setDefaultDeploymentProfile,
  writeConfigFile,
} = require('@serverless/platform-sdk');
const enableConfirm = require('./enableConfirm');
const writeTenantAndApp = require('./writeTenantAndApp');

const isValidAppName = RegExp.prototype.test.bind(/^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/);

const tenantsChoice = async (inquirer, tenantNames) =>
  (await inquirer.prompt({
    message: 'What org do you want to add this to?',
    type: 'list',
    name: 'tenantName',
    choices: Array.from(tenantNames),
  })).tenantName;

const deployProfileChoice = async (inquirer, deployProfiles) =>
  (await inquirer.prompt({
    message: 'What deployment profile do you want to use?',
    type: 'list',
    name: 'deploymentProfile',
    choices: Array.from(deployProfiles),
  })).deploymentProfile;

const appNameChoice = async (inquirer, appNames) =>
  (await inquirer.prompt({
    message: 'What application do you want to add this to?',
    type: 'list',
    name: 'appName',
    choices: Array.from(appNames).concat({ name: '[create a new app]', value: '_create_' }),
  })).appName;

const appNameInput = async (inquirer, appNames) =>
  (await inquirer.prompt({
    message: 'What do you want to name this application?',
    type: 'input',
    name: 'appName',
    validate: input => {
      input = input.trim();
      if (!isValidAppName(input)) {
        return (
          'App name is not valid.\n' +
          '   - It should only contain lowercase alphanumeric and hyphens.\n' +
          '   - It should start and end with an alphanumeric character.\n' +
          "   - Shouldn't exceed 128 characters"
        );
      }
      if (appNames.includes(input)) return 'App of this name already exists';
      return true;
    },
  })).appName.trim();

module.exports = {
  async check(serverless) {
    if (!serverless.config.servicePath) return false;
    let user = getLoggedInUser();
    if (serverless.service.provider.name !== 'aws') {
      if (serverless.processedInput.options.org || serverless.processedInput.options.app) {
        serverless.cli.log(
          `Sorry, the provider ${serverless.service.provider.name}  is not yet supported by the dashboard. Check out the docs at http://slss.io/dashboard-requirements" for supported providers.`
        );
      }
      return false;
    }
    const { supportedRuntimes } = await getMetadata();
    if (!supportedRuntimes.includes(serverless.service.provider.runtime)) {
      serverless.cli.log(
        `Sorry, the runtime ${serverless.service.provider.runtime}  is not yet supported by the dashboard. Check out the docs at http://slss.io/dashboard-requirements" for supported runtime.`
      );
      return false;
    }
    if (!user) {
      return false;
    }
    if (
      serverless.service.tenant &&
      serverless.service.app &&
      !(serverless.processedInput.options.org || serverless.processedInput.options.app)
    ) {
      return false;
    }
    let tenants = new Set();
    if (!user.idToken) {
      for (const tenant of Object.keys(user.accessKeys)) {
        tenants.add(tenant);
      }
    } else {
      await refreshToken();
      user = getLoggedInUser();
      tenants = new Set(
        (await listTenants({ username: user.username, idToken: user.idToken })).map(
          tenant => tenant.tenantName
        )
      );
    }
    if (!tenants.size) return false;
    return { user, tenants };
  },
  async run(serverless, { user, tenants }) {
    const { inquirer } = serverless.interactiveCli;
    if (!serverless.service.tenant) {
      if (
        !serverless.processedInput.options.org &&
        !serverless.processedInput.options.app &&
        !(await enableConfirm(inquirer))
      ) {
        return null;
      }
    }

    const tenantName = await (async () => {
      if (tenants.size === 1) return tenants.values().next().value;
      if (
        serverless.service.tenant &&
        tenants.has(serverless.service.tenant) &&
        !serverless.processedInput.options.org
      ) {
        return serverless.service.tenant;
      }
      if (serverless.processedInput.options.org) {
        if (!tenants.has(serverless.processedInput.options.org)) {
          serverless.cli.log('The org you specified is not available to you.');
        } else {
          return serverless.processedInput.options.org;
        }
      }
      return tenantsChoice(inquirer, tenants);
    })();

    let token;
    if (user.accessKeys && user.accessKeys[tenantName]) {
      token = user.accessKeys[tenantName];
    } else {
      token = await createAccessKeyForTenant(tenantName);
      await writeConfigFile({
        users: { [user.userId]: { dashboard: { accessKeys: { [tenantName]: token } } } },
      });
    }
    const apps = await getApps({ tenant: tenantName, token });

    const appNames = apps.map(app => app.appName);
    let appName = serverless.processedInput.options.app || serverless.service.app;
    if (!appNames.includes(appName)) {
      serverless.cli.log('The app you specified is not available to you.');
      appName = undefined;
    }
    if (!appName) {
      appName = apps.length ? await appNameChoice(inquirer, appNames) : '_create_';
    }
    if (appName === '_create_') {
      const newAppName = await appNameInput(inquirer, appNames);
      ({ appName } = await createApp({ tenant: tenantName, app: newAppName, token }));
      let deployProfiles = await getDeployProfiles({ tenant: tenantName, accessKey: token });
      let deploymentProfile;
      if (deployProfiles.length === 0) {
        await createDeployProfile({ name: 'default', tenant: tenantName, accessKey: token });
        deployProfiles = await getDeployProfiles({ tenant: tenantName });
      }
      if (deployProfiles.length === 1) {
        deploymentProfile = deployProfiles[0].deploymentProfileUid;
      } else {
        deploymentProfile = await deployProfileChoice(
          inquirer,
          deployProfiles.map(({ name }) => name)
        );
        deploymentProfile = _.find(deployProfiles, ({ name }) => name === deploymentProfile)
          .deploymentProfileUid;
      }
      await setDefaultDeploymentProfile({
        accessKey: token,
        app: appName,
        tenant: tenantName,
        deploymentProfile,
      });
    }
    let writeConfig = true;
    if (
      serverless.service.tenant &&
      serverless.service.app &&
      serverless.processedInput.options.org &&
      serverless.processedInput.options.app
    ) {
      ({ writeConfig } = await inquirer.prompt({
        message: `Are you sure you want to update monitoring settings from ${chalk.bold(
          `app: ${serverless.service.app}, org: ${serverless.service.tenant}`
        )} to ${chalk.bold(
          `app: ${serverless.processedInput.options.app}, org: ${serverless.processedInput.options.org}`
        )}`,
        type: 'confirm',
        name: 'writeConfig',
      }));
    }
    if (writeConfig) {
      return writeTenantAndApp(serverless, tenantName, appName);
    }
    return null;
  },
};
