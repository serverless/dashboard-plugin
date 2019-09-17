'use strict';

const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { copy, readFile, remove, writeFile } = require('fs-extra');
const setupServerless = require('../test/setupServerless');

const spawn = (childProcessSpawn => (...args) => {
  const result = childProcessSpawn(...args);
  result.catch(error => {
    if (error.stdoutBuffer) process.stdout.write(error.stdoutBuffer);
    if (error.stderrBuffer) process.stdout.write(error.stderrBuffer);
  });
  return result;
})(require('child-process-ext/spawn'));

const tmpDir = os.tmpdir();

const SERVERLESS_PLATFORM_STAGE = process.env.SERVERLESS_PLATFORM_STAGE || 'dev';

module.exports = async function(templateName) {
  const randomPostfix = crypto.randomBytes(2).toString('hex');
  const serviceTmpDir = path.join(tmpDir, `serverless-enterprise-plugin-test-${randomPostfix}`);

  const serviceName = `plugin-test-${randomPostfix}`;
  console.info(
    `Setup '${serviceName}' service from '${templateName}' template at ${serviceTmpDir}`
  );
  // Copy template
  const [, serverlessBinPath] = await Promise.all([
    copy(path.join(__dirname, templateName), serviceTmpDir).then(async () => {
      const slsYamlPath = path.join(serviceTmpDir, 'serverless.yml');
      const slsYamlString = await readFile(slsYamlPath, 'utf8');
      return writeFile(slsYamlPath, slsYamlString.replace('CHANGEME', serviceName));
    }),
    setupServerless(),
  ]);

  console.info('... (done)');

  const sls = (args, options = {}) => {
    console.info(`Invoke sls ${args.join(' ')}`);
    const childDeferred = spawn('node', [serverlessBinPath, ...args], {
      ...options,
      cwd: serviceTmpDir,
      env: {
        ...process.env,
        SERVERLESS_PLATFORM_STAGE,
        FORCE_COLOR: '1',
        SLS_DEBUG: '*',
        ...options.env,
      },
    });
    if (childDeferred.stdout) {
      childDeferred.stdout.on('data', data => process.stdout.write(data));
    }
    if (childDeferred.stderr) {
      childDeferred.stderr.on('data', data => process.stderr.write(data));
    }
    return childDeferred;
  };
  return {
    sls,
    teardown: async () => {
      await sls(['remove']);
      return remove(serviceTmpDir);
    },
  };
};
