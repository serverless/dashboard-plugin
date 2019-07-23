'use strict';

const {
  createApp,
  createAccessKeyForTenant,
  createDeployProfile,
  getApps,
  getDeployProfiles,
  getLoggedInUser,
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
    message: 'What tenant do you want to add this to?',
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

    const appNames = apps.map(app => app.appName);
    if (serverless.service.app && appNames.includes(serverless.service.app)) {
      return serverless.service.app;
    }
    const chosenAppName = apps.length ? await appNameChoice(inquirer, appNames) : '_create_';
    let appName = chosenAppName;
    if (chosenAppName === '_create_') {
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
      }
      await setDefaultDeploymentProfile({
        accessKey: token,
        app: appName,
        tenant: tenantName,
        deploymentProfile,
      });
    }
    return writeTenantAndApp(serverless, tenantName, appName);
  },
};
