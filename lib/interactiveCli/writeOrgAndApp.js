'use strict';

const path = require('path');
const { readFile, writeFile } = require('fs-extra');
const getServerlessFilePath = require('../deployment/getServerlessFilePath');

const yamlExtensions = new Set(['.yml', '.yaml']);

module.exports = async (serverless, orgName, appName) => {
  const serverlessFileName = await getServerlessFilePath(
    serverless.processedInput.options.config,
    serverless.config.servicePath
  );

  let ymlString = await (async () => {
    if (!yamlExtensions.has(path.extname(serverlessFileName))) return null; // Non YAML config
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
        `org: ${orgName}\napp: ${appName}\n`
    );
    return;
  }
  ymlString = ymlString.toString();
  if (ymlString.match(/^\s*#?\s*app\s*:\s+.*$/m)) {
    ymlString = ymlString.replace(/^\s*#?\s*app\s*:\s+.*$/m, `app: ${appName}`);
  } else {
    ymlString = `app: ${appName}\n${ymlString}`;
  }
  if (ymlString.match(/^\s*#?\s*org\s*:\s+.*$/m)) {
    ymlString = ymlString.replace(/^\s*#?\s*org\s*:\s+.*$/m, `org: ${orgName}`);
  } else if (ymlString.match(/^\s*#?\s*tenant\s*:\s+.*$/m)) {
    ymlString = ymlString.replace(/^\s*#?\s*tenant\s*:\s+.*$/m, `org: ${orgName}`);
  } else {
    ymlString = `org: ${orgName}\n${ymlString}`;
  }
  await writeFile(serverlessFileName, ymlString);
  serverless.service.tenant = orgName;
  serverless.service.app = appName;
  serverless.enterpriseEnabled = true;
};
