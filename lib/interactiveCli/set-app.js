'use strict';

const _ = require('lodash');
const chalk = require('chalk');
const {
  createApp,
  createDeployProfile,
  getApps,
  getDeployProfiles,
  getLoggedInUser,
  getMetadata,
  listTenants,
  refreshToken,
  setDefaultDeploymentProfile,
} = require('@serverless/platform-sdk');
const enableConfirm = require('./enableConfirm');
const writeOrgAndApp = require('./writeOrgAndApp');
const { resolveAccessKey } = require('./utils');

const isValidAppName = RegExp.prototype.test.bind(/^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/);

const orgUpdateConfirm = async (inquirer) => {
  process.stdout.write(
    "Service has monitoring setup, but provided configuration doesn't seem to correspond" +
      " to account you're logged in with.\n\n"
  );
  return (
    await inquirer.prompt({
      message: 'Would you like to update it?',
      type: 'confirm',
      name: 'shouldUpdateOrg',
    })
  ).shouldUpdateOrg;
};
const appUpdateConfirm = async (inquirer, appName, orgName) => {
  process.stdout.write(
    "Service seems to have monitoring enabled, but configured app doesn't seem to exist in an organization.\n\n"
  );
  return (
    await inquirer.prompt({
      message: 'What would you like to do?',
      type: 'list',
      name: 'appUpdateType',
      choices: [
        { name: `Create '${appName}' app in '${orgName}' org`, value: 'create' },
        {
          name: 'Switch to one of the existing apps (or create new one with different name)',
          value: 'chooseExisting',
        },
        { name: "Skip, I'll sort this out manually", value: 'skip' },
      ],
    })
  ).appUpdateType;
};

const orgsChoice = async (inquirer, orgNames) =>
  (
    await inquirer.prompt({
      message: 'What org do you want to add this to?',
      type: 'list',
      name: 'orgName',
      choices: Array.from(orgNames),
    })
  ).orgName;

const deployProfileChoice = async (inquirer, deployProfiles) =>
  (
    await inquirer.prompt({
      message: 'What deployment profile do you want to use?',
      type: 'list',
      name: 'deploymentProfile',
      choices: Array.from(deployProfiles),
    })
  ).deploymentProfile;

const appNameChoice = async (inquirer, appNames) =>
  (
    await inquirer.prompt({
      message: 'What application do you want to add this to?',
      type: 'list',
      name: 'appName',
      choices: Array.from(appNames).concat({ name: '[create a new app]', value: '_create_' }),
    })
  ).appName;

const appNameInput = async (inquirer, appNames) =>
  (
    await inquirer.prompt({
      message: 'What do you want to name this application?',
      type: 'input',
      name: 'newAppName',
      validate: (input) => {
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
    })
  ).newAppName.trim();

const createAppWithDeploymentProfile = async (inquirer, orgName, accessKey, newAppName) => {
  const { appName } = await createApp({ tenant: orgName, app: newAppName, token: accessKey });

  let deployProfiles = await getDeployProfiles({ tenant: orgName, accessKey });
  let deploymentProfile;
  if (deployProfiles.length === 0) {
    await createDeployProfile({ name: 'default', tenant: orgName, accessKey });
    deployProfiles = await getDeployProfiles({ tenant: orgName });
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
    tenant: orgName,
    deploymentProfile,
  });
  return appName;
};

const steps = {
  enableConfirm,
  resolveOrgNames: async (user) => {
    let orgs = new Set();
    if (!user.idToken) {
      // User registered over CLI hence idToken is not stored.
      // Still to resolve organizations from platform idToken is needed.
      // Handling it gently by assuming that orgs listed in config file
      // make a valid representation
      for (const org of Object.keys(user.accessKeys)) orgs.add(org);
    } else {
      await refreshToken();
      user = getLoggedInUser();
      orgs = new Set(
        (await listTenants({ username: user.username, idToken: user.idToken })).map(
          (org) => org.tenantName
        )
      );
    }
    return orgs;
  },
  setOrgAndApp: async (serverless, { user, orgNames, orgName, apps, appName, newAppName }) => {
    const { inquirer } = serverless.interactiveCli;
    if (!orgName) {
      orgName = await (async () => {
        if (orgNames.size === 1) return orgNames.values().next().value;
        return orgsChoice(inquirer, orgNames);
      })();
    }

    const accessKey = await resolveAccessKey(user, orgName);
    if (!newAppName && !appName) {
      if (!apps) apps = await getApps({ tenant: orgName, token: accessKey });

      const appNames = apps.map((app) => app.appName);
      appName = apps.length ? await appNameChoice(inquirer, appNames) : '_create_';
      if (appName === '_create_') newAppName = await appNameInput(inquirer, appNames);
    }
    if (newAppName) {
      appName = await createAppWithDeploymentProfile(inquirer, orgName, accessKey, newAppName);
    }
    if (
      serverless.service.isDashboardMonitoringOverridenByCli &&
      serverless.service.isDashboardAppPreconfigured
    ) {
      const { shouldOverrideDashboardConfig } = await inquirer.prompt({
        message:
          'Are you sure you want to update monitoring settings ' +
          `to ${chalk.bold(`app: ${appName}, org: ${orgName}`)}`,
        type: 'confirm',
        name: 'shouldOverrideDashboardConfig',
      });
      if (!shouldOverrideDashboardConfig) {
        delete serverless.service.app;
        delete serverless.service.org;
        return;
      }
    }
    await writeOrgAndApp(serverless, orgName, appName);
    return;
  },
};

module.exports = {
  async check(serverless) {
    if (!serverless.config.servicePath) return false;
    if (serverless.service.provider.name !== 'aws') return false;
    const { supportedRegions, supportedRuntimes } = await getMetadata();
    if (!supportedRuntimes.includes(serverless.service.provider.runtime || 'nodejs12.x')) {
      return false;
    }
    if (!supportedRegions.includes(serverless.getProvider('aws').getRegion())) return false;

    let user = getLoggedInUser();
    if (!user) return false;

    const orgNames = await steps.resolveOrgNames(user);
    if (!orgNames.size) return false;
    user = getLoggedInUser(); // Refreshed, as new token might have been generated

    const orgName = serverless.service.org;
    const appName = serverless.service.app;
    if (orgName && orgNames.has(orgName)) {
      const accessKey = await resolveAccessKey(user, orgName);
      if (!isValidAppName(appName)) return { user, orgName };
      const apps = await getApps({ tenant: orgName, token: accessKey });
      if (serverless.processedInput.options.org || serverless.processedInput.options.app) {
        if (apps.some((app) => app.appName === appName)) {
          if (
            serverless.service.isDashboardMonitoringPreconfigured &&
            serverless.service.isDashboardAppPreconfigured &&
            !serverless.service.isDashboardMonitoringOverridenByCli
          ) {
            return false;
          }
          return { user, orgName, appName };
        }
        if (serverless.processedInput.options.app) {
          process.stdout.write(
            chalk.red(
              "\nPassed value for `--app` doesn't seem to correspond to chosen organization.\n"
            )
          );
        }
        return { user, orgName };
      } else if (apps.some((app) => app.appName === appName)) {
        return false;
      }
      return { user, orgName, apps, newAppName: appName };
    } else if (orgName) {
      if (serverless.processedInput.options.org) {
        process.stdout.write(
          chalk.red(
            "\nPassed value for `--org` doesn't seem to correspond to account with which you're logged in with.\n"
          )
        );
      } else {
        process.stdout.write(
          chalk.red(`\nConfigured org '${orgName}' is not available in your account.\n`)
        );
      }
    }
    return { user, orgNames };
  },
  async run(serverless, options) {
    const { inquirer } = serverless.interactiveCli;
    if (!options.orgName) delete serverless.service.org;
    if (!options.appName && !options.newAppName) delete serverless.service.app;
    if (!serverless.processedInput.options.org && !serverless.processedInput.options.app) {
      if (serverless.service.isDashboardMonitoringPreconfigured) {
        if (!options.orgName) {
          if (!(await orgUpdateConfirm(inquirer))) return;
        } else if (options.newAppName) {
          const appUpdateTypeChoice = await appUpdateConfirm(
            inquirer,
            options.newAppName,
            options.orgName
          );
          switch (appUpdateTypeChoice) {
            case 'create':
              break;
            case 'chooseExisting':
              delete options.newAppName;
              break;
            case 'skip':
              return;
            default:
              throw new Error('Unexpected app update type');
          }
        } else if (!(await steps.enableConfirm(inquirer, serverless.processedInput.options))) {
          return;
        }
      } else if (!(await steps.enableConfirm(inquirer, serverless.processedInput.options))) {
        return;
      }
    }
    await steps.setOrgAndApp(serverless, options);
  },
  steps,
};
