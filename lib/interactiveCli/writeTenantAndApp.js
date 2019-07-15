'use strict';

const chalk = require('chalk');
const { join } = require('path');
const { readFile, writeFile } = require('fs-extra');
const { safeLoad, safeDump } = require('js-yaml');

module.exports = async (serverless, tenantName, appName) => {
  const ymlPath = join(serverless.config.servicePath, 'serverless.yml');

  const ymlString = await (async () => {
    try {
      return await readFile(ymlPath);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  })();

  if (!ymlString) {
    process.stdout.write(
      'Add following settings to your serverless configuration file:\n\n' +
        `tenant: ${tenantName}\napp: ${appName}\n`
    );
    return false;
  }
  const yml = safeLoad(ymlString);
  delete yml.tenant;
  delete yml.app;

  const resultYml = {};
  const keys = Object.keys(yml);
  keys.splice(keys.indexOf('service') + 1, 0, 'tenant', 'app');
  for (const key of keys) {
    switch (key) {
      case 'tenant':
        resultYml.tenant = tenantName;
        break;
      case 'app':
        resultYml.app = appName;
        break;
      default:
        resultYml[key] = yml[key];
    }
  }

  await writeFile(ymlPath, safeDump(resultYml));
  serverless.service.tenant = tenantName;
  serverless.service.app = appName;

  process.stdout.write(
    `\n${chalk.green('Your project is now setup for monitoring, troubleshooting and testing')}\n`
  );

  return true;
};
