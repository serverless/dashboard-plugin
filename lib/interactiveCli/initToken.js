'use strict';

const { ServerlessSDK } = require('@serverless/platform-client');
const { readConfigFile, writeConfigFile } = require('@serverless/platform-sdk');
const createAppWithDeploymentProfile = require('./createAppWithDeploymentProfile');

const spawn = require('child-process-ext/spawn');
const fs = require('fs-extra');
const axios = require('axios');
const AdmZip = require('adm-zip');
const path = require('path');
const chalk = require('chalk');

const writeAttrs = require('./writeAttrs');

const isNotSymbolicLink = (src) => !fs.lstatSync(src).isSymbolicLink();

const copyDirContentsSync = (srcDir, destDir, { noLinks = false } = {}) => {
  const copySyncOptions = {
    dereference: true,
    filter: noLinks ? isNotSymbolicLink : null,
  };
  fs.copySync(srcDir, destDir, copySyncOptions);
};

const parseGitHubURL = (url) => {
  const split = url.split('/');
  const branch = split.pop().split('.')[0];
  const owner = split[3];
  const repo = split[4];

  return {
    url,
    branch,
    owner,
    repo,
  };
};

const downloadTemplate = async (url, dir) => {
  const zipDestination = path.resolve(dir, 'template.zip');
  const writer = fs.createWriteStream(zipDestination);

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      resolve(zipDestination);
    });
    writer.on('error', (error) => {
      reject(error);
    });
  });
};

module.exports = {
  check(serverless) {
    return !!serverless.processedInput.options.token;
  },
  async run(serverless) {
    const { inquirer } = serverless.interactiveCli;

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
      serverless.config.servicePath = servicePath;
      serverless.service.org = tenantName;
      serverless.service.app = 'new-service-name-1';
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
      await writeAttrs(serverless, tenantName, newServiceName, newServiceName);
      await serverless.reInitialize();
      await createAppWithDeploymentProfile(inquirer, tenantName, secretAccessKey, newServiceName);
      process.stdout.write(
        `\n${chalk.green(
          `${newServiceName} successfully created in '${template.directory}' folder.`
        )}\n`
      );
    }
    return Promise.resolve();
  },
};
