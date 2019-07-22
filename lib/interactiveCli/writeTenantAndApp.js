'use strict';

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
      'Add the following settings to your serverless configuration file:\n\n' +
        `org: ${tenantName}\napp: ${appName}\n`
    );
  }
  ymlString = ymlString.toString();
  if (ymlString.match(/^\s*#\s*app\s*:\s+.*$/m)) {
    ymlString = ymlString.replace(/^\s*#\s*app\s*:\s+.*$/m, `app: ${appName}`);
  } else {
    ymlString = `app: ${appName}\n${ymlString}`;
  }
  if (ymlString.match(/^\s*#\s*org\s*:\s+.*$/m)) {
    ymlString = ymlString.replace(/^\s*#\s*org\s*:\s+.*$/m, `org: ${tenantName}`);
  } else if (ymlString.match(/^\s*#\s*tenant\s*:\s+.*$/m)) {
    ymlString = ymlString.replace(/^\s*#\s*tenant\s*:\s+.*$/m, `org: ${tenantName}`);
  } else {
    ymlString = `org: ${tenantName}\n${ymlString}`;
  }
  await writeFile(serverlessFileName, ymlString);
  serverless.service.tenant = tenantName;
  serverless.service.app = appName;
};
