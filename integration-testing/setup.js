'use strict';

const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { copy, readFile, writeFile } = require('fs-extra');
const setupServerless = require('../test/setupServerless');

const spawn = require('child-process-ext/spawn');

const tmpDir = os.tmpdir();

const SERVERLESS_PLATFORM_STAGE = process.env.SERVERLESS_PLATFORM_STAGE || 'dev';

module.exports = async function (templateName) {
  const randomPostfix = crypto.randomBytes(2).toString('hex');
  const serviceTmpDir = path.join(tmpDir, `serverless-dashboard-plugin-test-${randomPostfix}`);

  const serviceName = `plugin-test-${randomPostfix}`;
  const region = process.env.SERVERLESS_PLATFORM_TEST_REGION || 'us-east-1';
  console.info(
    `Setup '${serviceName}' (for region ${region}) service from '${templateName}' template at ${serviceTmpDir}`
  );
  // Copy template
  const [, serverlessBinPath] = await Promise.all([
    copy(path.join(__dirname, templateName), serviceTmpDir).then(async () => {
      const slsYamlPath = path.join(serviceTmpDir, 'serverless.yml');
      const slsYamlString = await readFile(slsYamlPath, 'utf8');
      return writeFile(
        slsYamlPath,
        slsYamlString
          .replace(/SERVICE_PLACEHOLDER/g, serviceName)
          .replace(/REGION_PLACEHOLDER/g, region)
          .replace(/ORG_PLACEHOLDER/g, process.env.SERVERLESS_PLATFORM_TEST_ORG || 'integration')
          .replace(/APP_PLACEHOLDER/g, process.env.SERVERLESS_PLATFORM_TEST_APP || 'integration')
          .replace(/STAGE_PLACEHOLDER/g, process.env.SERVERLESS_PLATFORM_TEST_STAGE || 'dev')
      );
    }),
    setupServerless().then((data) => data.binary),
  ]);

  console.info('... (done)');

  const sls = (args, options = {}) => {
    console.info(`Invoke sls ${args.join(' ')}`);
    return spawn('node', [serverlessBinPath, ...args], {
      ...options,
      cwd: serviceTmpDir,
      env: {
        ...process.env,
        SERVERLESS_PLATFORM_STAGE,
        SLS_DEBUG: '*',
        ...options.env,
      },
    });
  };
  return {
    sls,
    serviceTmpDir,
    serviceName,
    teardown: async () => sls(['remove']),
  };
};
