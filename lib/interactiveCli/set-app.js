'use strict';

const _ = require('lodash');
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

const appUpdateConfirm = async inquirer => {
  process.stdout.write(
    "Service has monitoring enabled, but provided configuration doesn't seem to correspond" +
      " to account you're logged in with.\n\n"
  );
  return (await inquirer.prompt({
    message: 'Would you like to update it?',
    type: 'confirm',
    name: 'isConfirmed',
  })).isConfirmed;
};

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

const resolveAccessKey = async (user, tenantName) => {
  if (user.accessKeys && user.accessKeys[tenantName]) return user.accessKeys[tenantName];
  const token = await createAccessKeyForTenant(tenantName);
  await writeConfigFile({
    users: { [user.userId]: { dashboard: { accessKeys: { [tenantName]: token } } } },
  });
  return token;
};

const steps = {
  resolveTenantNames: async user => {
    let tenants = new Set();
    if (!user.idToken) {
      // User registered over CLI hence idToken is not stored.
      // Still to resolve tenants (organizations) from platform idToken is needed.
      // Handling it gently by assuming that tenants listed in config file
      // make a valid representation
      for (const tenant of Object.keys(user.accessKeys)) tenants.add(tenant);
    } else {
      await refreshToken();
      user = getLoggedInUser();
      tenants = new Set(
        (await listTenants({ username: user.username, idToken: user.idToken })).map(
          tenant => tenant.tenantName
        )
      );
    }
    return tenants;
  },
  setTenantAndApp: async (serverless, { user, tenantNames, tenantName, apps }) => {
    const { inquirer } = serverless.interactiveCli;
    if (!tenantName) {
      tenantName = await (async () => {
        if (tenantNames.size === 1) return tenantNames.values().next().value;
        if (serverless.service.tenant && tenantNames.has(serverless.service.tenant)) {
          return serverless.service.tenant;
        }
        return tenantsChoice(inquirer, tenantNames);
      })();
    }

    const accessKey = await resolveAccessKey(user, tenantName);
    if (!apps) apps = await getApps({ tenant: tenantName, token: accessKey });

    let appName;
    const appNames = apps.map(app => app.appName);
    if (serverless.service.app && appNames.includes(serverless.service.app)) {
      appName = serverless.service.app;
    } else {
      appName = apps.length ? await appNameChoice(inquirer, appNames) : '_create_';
    }
    if (appName === '_create_') {
      const newAppName = await appNameInput(inquirer, appNames);
      ({ appName } = await createApp({ tenant: tenantName, app: newAppName, token: accessKey }));

      let deployProfiles = await getDeployProfiles({ tenant: tenantName, accessKey });
      let deploymentProfile;
      if (deployProfiles.length === 0) {
        await createDeployProfile({ name: 'default', tenant: tenantName, accessKey });
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
        accessKey,
        app: appName,
        tenant: tenantName,
        deploymentProfile,
      });
    }
    await writeTenantAndApp(serverless, tenantName, appName);
    return;
  },
};

module.exports = {
  async check(serverless) {
    if (!serverless.config.servicePath) return false;
    if (serverless.service.provider.name !== 'aws') return false;

    let user = getLoggedInUser();
    if (!user) return false;

    const tenantNames = await steps.resolveTenantNames(user);
    if (!tenantNames.size) return false;
    user = getLoggedInUser(); // Refreshed, as new token might have been generated

    const tenantName = serverless.service.tenant;
    const appName = serverless.service.app;
    if (tenantName && tenantNames.has(serverless.service.tenant)) {
      const accessKey = await resolveAccessKey(user, tenantName);
      const apps = await getApps({ tenant: tenantName, token: accessKey });
      if (apps.some(app => app.appName === appName)) return false;
      return { user, tenantName, apps };
    }
    return { user, tenantNames };
  },
  async run(serverless, options) {
    const { inquirer } = serverless.interactiveCli;
    if (!serverless.service.tenant) {
      if (!(await enableConfirm(inquirer))) return;
    } else if (!(await appUpdateConfirm(inquirer))) {
      delete serverless.service.tenant;
      delete serverless.service.app;
      return;
    }
    await steps.setTenantAndApp(serverless, options);
  },
  steps,
};
