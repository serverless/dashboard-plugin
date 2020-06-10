'use strict';

const { ServerlessSDK } = require('@serverless/platform-client');
const { readConfigFile, writeConfigFile } = require('@serverless/platform-sdk');
const { copyDirContentsSync, parseGitHubURL, downloadTemplate } = require('./utils');
const v1Resolver = require('./v1Resolver');
const componentsResolver = require('./componentResolver');

const spawn = require('child-process-ext/spawn');
const fs = require('fs-extra');
const AdmZip = require('adm-zip');
const path = require('path');
const chalk = require('chalk');

module.exports = {
  check(serverless) {
    return !!serverless.processedInput.options.token;
  },
  async run(serverless) {
    const initToken = serverless.processedInput.options.token;
    const sdk = new ServerlessSDK({
      platformStage: process.env.SERVERLESS_PLATFORM_STAGE || 'prod',
    });
    const configFile = readConfigFile();
    if (!configFile.users) {
      configFile.users = {};
    }
    const { auth0Id, tenantName, secretAccessKey, userName, template } = await sdk.getInitToken(
      initToken
    );
    sdk.accessKey = secretAccessKey;

    configFile.userId = auth0Id;
    if (secretAccessKey) {
      if (!configFile.users[auth0Id]) {
        configFile.users[auth0Id] = {
          username: userName,
          userId: auth0Id,
          dashboard: {
            username: userName,
            accessKeys: {},
          },
        };
      }
      configFile.users[auth0Id].dashboard.accessKeys[tenantName] = secretAccessKey;
      writeConfigFile(configFile);
    }

    if (template.url && template.directory) {
      const newServiceName = template.serviceName;
      const { url, branch, repo } = parseGitHubURL(template.url);
      // Create template directory
      fs.mkdirSync(template.directory);
      const servicePath = path.resolve(process.cwd(), template.directory);

      // Fetch template zip
      const zipFile = await downloadTemplate(url, servicePath);
      // Unzip
      const zip = new AdmZip(zipFile);
      zip.extractAllTo(servicePath);
      const tempPath = path.resolve(servicePath, `${repo}-${branch}`);
      // Move unzipped template to destination
      copyDirContentsSync(tempPath, servicePath);
      // Remove zip file
      fs.removeSync(zipFile);
      // Remove temp dir
      fs.removeSync(tempPath);
      // CD
      process.chdir(servicePath);

      for (const { command, options } of template.commands) {
        await spawn(command, options);
      }
      process.stdout.write(
        `\n${chalk.green(
          `${newServiceName} successfully created in '${template.directory}' folder.`
        )}\n`
      );
      if (template.projectType === 'components') {
        await componentsResolver(serverless, tenantName, newServiceName, servicePath);
      } else {
        await v1Resolver(serverless, tenantName, newServiceName, servicePath, secretAccessKey);
      }
    }
    return Promise.resolve();
  },
};
