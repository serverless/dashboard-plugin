'use strict';

const _ = require('lodash');

const {
  createApp,
  createDeployProfile,
  getDeployProfiles,
  setDefaultDeploymentProfile,
} = require('@serverless/platform-sdk');

const deployProfileChoice = async (inquirer, deployProfiles) =>
  (
    await inquirer.prompt({
      message: 'What deployment profile do you want to use?',
      type: 'list',
      name: 'deploymentProfile',
      choices: Array.from(deployProfiles),
    })
  ).deploymentProfile;

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

module.exports = createAppWithDeploymentProfile;
