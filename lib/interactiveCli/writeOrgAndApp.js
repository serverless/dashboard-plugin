'use strict';

const path = require('path');
const { readFile, writeFile } = require('fs-extra');
const getServerlessFilePath = require('../deployment/getServerlessFilePath');

const yamlExtensions = new Set(['.yml', '.yaml']);

const appPattern = /^(?:#\s*)?app\s*:.+/m;
const orgPattern = /^(?:#\s*)?(?:tenant|org)\s*:.+/m;

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
  const appMatch = ymlString.match(appPattern);
  if (appMatch) {
    ymlString = ymlString.replace(appMatch[0], `app: ${appName}`);
  } else {
    ymlString = `app: ${appName}\n${ymlString}`;
  }
  const orgMatch = ymlString.match(orgPattern);
  if (orgMatch) {
    ymlString = ymlString.replace(orgMatch[0], `org: ${orgName}`);
  } else {
    ymlString = `org: ${orgName}\n${ymlString}`;
  }
  await writeFile(serverlessFileName, ymlString);
  serverless.service.org = orgName;
  serverless.service.app = appName;
  serverless.enterpriseEnabled = true;
};
