'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const uuidv1 = require('uuid').v1;
const { path: get, mergeDeepRight } = require('ramda');
const writeFileAtomic = require('write-file-atomic');

// Locate the correct .serverlessrc per current environment
let fileName = 'serverless';
if (process.env.SERVERLESS_PLATFORM_STAGE && process.env.SERVERLESS_PLATFORM_STAGE !== 'prod') {
  fileName = `serverless${process.env.SERVERLESS_PLATFORM_STAGE.toLowerCase()}`;
  fileName = fileName.trim();
}

/*
 * Get Config File Path
 * - .serverlessrc can either be in the current working dir or system root dir.
 * - This function returns the local path first, if it exists.
 */

const getConfigFilePath = () => {
  const localPath = path.join(process.cwd(), `.${fileName}rc`);
  const globalPath = path.join(os.homedir(), `.${fileName}rc`);
  const localConfigExists = fs.existsSync(localPath);
  const globalConfigExists = fs.existsSync(globalPath);

  if (localConfigExists) {
    return localPath;
  } else if (globalConfigExists) {
    return globalPath;
  }

  // If neither exist, create the config file in the home dir
  // Normally the Framework does this, but just in case...
  const config = {
    userId: null,
    frameworkId: uuidv1(),
    trackingDisabled: false, // default false
    meta: {
      created_at: Math.round(+new Date() / 1000), // config file creation date
      updated_at: null, // config file updated date
    },
  };

  writeFileAtomic.sync(globalPath, JSON.stringify(config, null, 2));
  return globalPath;
};

/*
 * Read Config File
 * - The Framework always creates a config file on post-install via the logstat method.  (This isn't optimal and should be changed in the Framework.)
 * - The "rc" package automatically looks in many places (local folder, up a few levels, root dir)
 */

const readConfigFile = () => {
  const configFilePath = getConfigFilePath();
  const configFile = configFilePath ? fs.readFileSync(configFilePath) : null;
  return configFile ? JSON.parse(configFile) : {};
};

/*
 * Write Config File
 * - Writes a .serverlessrc file on the local machine in the root dir
 */

const writeConfigFile = (data) => {
  const configFilePath = getConfigFilePath();
  const configFile = readConfigFile();
  const updatedConfigFile = mergeDeepRight(configFile, data);
  updatedConfigFile.meta.updated_at = Math.round(+new Date() / 1000);
  writeFileAtomic.sync(configFilePath, JSON.stringify(updatedConfigFile, null, 2));
  return updatedConfigFile;
};

/*
 * Get Logged In User
 * - Fetches the current logged in user from the .serverlessrc file
 */

const getLoggedInUser = () => {
  const config = readConfigFile();
  if (!config.userId) {
    return null;
  }
  const user = get(['users', config.userId, 'dashboard'], config);
  if (!user || !user.username) {
    return null; // user is logged out
  }
  return {
    userId: config.userId,
    username: user.username,
    accessKeys: user.accessKeys,
    idToken: user.idToken,
  };
};

module.exports = {
  getConfigFilePath,
  readConfigFile,
  writeConfigFile,
  getLoggedInUser,
};
