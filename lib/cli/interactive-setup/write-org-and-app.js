'use strict';

// TODO: This whole module should be removed with next major release as the logic has been moved to Framework with https://github.com/serverless/serverless/pull/9766

const path = require('path');
const { readFile, writeFile } = require('fs-extra');

const yamlExtensions = new Set(['.yml', '.yaml']);

const appPattern = /^(?:#\s*)?app\s*:.+/m;
const orgPattern = /^(?:#\s*)?(?:tenant|org)\s*:.+/m;

module.exports = async (orgName, appName, { configurationFilename, serviceDir, configuration }) => {
  const configurationFilePath = path.resolve(serviceDir, configurationFilename);
  let ymlString = await (async () => {
    if (!yamlExtensions.has(path.extname(configurationFilename))) return null; // Non YAML config
    try {
      return await readFile(configurationFilePath);
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
  await writeFile(configurationFilePath, ymlString);
  configuration.org = orgName;
  configuration.app = appName;
};
