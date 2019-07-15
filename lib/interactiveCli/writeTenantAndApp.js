'use strict';

const chalk = require('chalk');
const { readFile, writeFile } = require('fs-extra');
const getServerlessFilePath = require('../deployment/getServerlessFilePath');

module.exports = async (serverless, tenantName, appName) => {
  const serverlessFileName = await getServerlessFilePath(
    serverless.processedInput.options.config,
    serverless.config.servicePath
  );

  let ymlString = await (async () => {
    try {
      return await readFile(serverlessFileName);
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
  ymlString = ymlString.toString();
  if (ymlString.match(/^\s*#\s*app\s*:\s+.*$/m)) {
    ymlString = ymlString.replace(/^\s*#\s*app\s*:\s+.*$/m, `app: ${appName}`);
  } else {
    ymlString = `app: ${appName}\n${ymlString}`;
  }
  if (ymlString.match(/^\s*#\s*tenant\s*:\s+.*$/m)) {
    ymlString = ymlString.replace(/^\s*#\s*tenant\s*:\s+.*$/m, `tenant: ${tenantName}`);
  } else {
    ymlString = `tenant: ${appName}\n${ymlString}`;
  }
  await writeFile(serverlessFileName, ymlString);
  serverless.service.tenant = tenantName;
  serverless.service.app = appName;

  process.stdout.write(
    `\n${chalk.green('Your project is now setup for monitoring, troubleshooting and testing')}\n`
  );

  return true;
};
