'use strict';

const {
  createApp,
  getAccessKeyForTenant,
  getApps,
  getLoggedInUser,
  listTenants,
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
    if (serverless.service.app) return false;
    const user = getLoggedInUser();
    if (!user || !user.idToken) return false;
    const tenants = new Set(
      (await listTenants({ username: user.username, idToken: user.idToken })).map(
        tenant => tenant.tenantName
      )
    );
    if (!tenants.size) return false;
    return { user, tenants };
  },
  async run(serverless, { user, tenants }) {
    const { inquirer } = serverless.interactiveCli;
    if (!(await enableConfirm(inquirer))) return null;

    const tenantName = await (async () => {
      if (tenants.size === 1) return tenants.values().next().value;
      if (serverless.service.tenant) {
        if (tenants.has(serverless.service.tenant)) return serverless.service.tenant;
      }
      if (user.accessKeys) {
        const loggedTennants = Object.keys(user.accessKeys);
        if (loggedTennants.length === 1) {
          if (tenants.has(loggedTennants[0])) return loggedTennants[0];
        }
      }
      return tenantsChoice(inquirer, tenants);
    })();

    const token =
      (user.accessKeys && user.accessKeys[tenantName]) || (await getAccessKeyForTenant(tenantName));
    const apps = await getApps({ tenant: tenantName, token });

    const appName = await (async () => {
      const appNames = apps.map(app => app.appName);
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
