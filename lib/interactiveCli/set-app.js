'use strict';

const {
  createApp,
  createAccessKeyForTenant,
  getApps,
  getLoggedInUser,
  listTenants,
  refreshToken,
  writeConfigFile,
} = require('@serverless/platform-sdk');
const enableConfirm = require('./enableConfirm');
const writeTenantAndApp = require('./writeTenantAndApp');

const isValidAppName = RegExp.prototype.test.bind(/^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/);

const tenantsChoice = async (inquirer, tenantNames) =>
  (await inquirer.prompt({
    message: 'What tenant do you want to add this to?',
    type: 'list',
    name: 'tenantName',
    choices: Array.from(tenantNames),
  })).tenantName;

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
    if (serverless.service.provider.name !== 'aws') return false;
    if (serverless.service.tenant && serverless.service.app) return false;
    let user = getLoggedInUser();
    let tenants = new Set();
    if (!user) {
      return false;
    } else if (!user.idToken) {
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
      if (!(await enableConfirm(inquirer))) return null;
    }

    const tenantName = await (async () => {
      if (tenants.size === 1) return tenants.values().next().value;
      if (serverless.service.tenant && tenants.has(serverless.service.tenant)) {
        return serverless.service.tenant;
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

    const appName = await (async () => {
      const appNames = apps.map(app => app.appName);
      if (serverless.service.app && appNames.includes(serverless.service.app)) {
        return serverless.service.app;
      }
      if (apps.length) {
        const chosenAppName = await appNameChoice(inquirer, appNames);
        if (chosenAppName !== '_create_') return chosenAppName;
      }
      const newAppName = await appNameInput(inquirer, appNames);
      return (await createApp({ tenant: tenantName, app: newAppName, token })).appName;
    })();

    return writeTenantAndApp(serverless, tenantName, appName);
  },
};
