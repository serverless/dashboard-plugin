'use strict';

const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { copy, ensureDir, readFile, remove, writeFile, writeJson, realpath } = require('fs-extra');
const fetch = require('node-fetch');
const tar = require('tar');
const { memoize } = require('lodash');

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

const retrieveServerless = memoize(async () => {
  const serverlessTmpDir = path.join(
    tmpDir,
    `serverless-enterprise-plugin-test-serverless-${crypto.randomBytes(2).toString('hex')}`
  );
  if (process.env.LOCAL_SERVERLESS_LINK_PATH) {
    // Test against local serverless installation which is expected to have
    // this instance of `@serverless/enterprise-plugin` linked in its node_modules
    const serverlessPath = path.join(process.cwd(), process.env.LOCAL_SERVERLESS_LINK_PATH);
    let pluginPath;
    let serverlessPluginPath;
    try {
      [pluginPath, serverlessPluginPath] = await Promise.all([
        realpath(path.join(__dirname, '..')),
        realpath(path.join(serverlessPath, 'node_modules/@serverless/enterprise-plugin')),
      ]);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (!pluginPath || pluginPath !== serverlessPluginPath) {
      throw new Error(
        `SERVERLESS_LINK_PATH which resolves to ${serverlessPath}, doesn't point a ` +
          'serverless installation which links this installation of a plugin'
      );
    }
    return path.join(serverlessPath, 'bin/serverless.js');
  }
  console.info(`Setup 'serverless' at ${serverlessTmpDir}`);
  const servelressDirDeferred = ensureDir(serverlessTmpDir);
  console.info('... fetch metadata');
  // const metaData = await (await fetch('https://registry.npmjs.org/serverless')).json();

  await servelressDirDeferred;
  console.info('... fetch tarball');
  const res = await fetch('https://github.com/serverless/serverless/archive/master.tar.gz');
  const tarDeferred = tar.x({ cwd: serverlessTmpDir, strip: 1 });
  res.body.pipe(tarDeferred);
  await new Promise((resolve, reject) => {
    res.body.on('error', reject);
    tarDeferred.on('error', reject);
    tarDeferred.on('finish', resolve);
  });

  console.info('... strip @serverless/enterprise-plugin dependency');
  const pkgJsonPath = `${serverlessTmpDir}/package.json`;
  const pkgJson = require(pkgJsonPath);
  pkgJson.dependencies['@serverless/enterprise-plugin'] = `file:${path.join(__dirname, '../dist')}`;
  await writeJson(pkgJsonPath, pkgJson);

  console.info('... npm install');
  await spawn('npm', ['install', '--production'], { cwd: serverlessTmpDir });

  return path.join(serverlessTmpDir, 'bin/serverless');
});

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
    retrieveServerless(),
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
      childDeferred.stdout.on('data', data => console.info(String(data)));
    }
    if (childDeferred.stderr) {
      childDeferred.stderr.on('data', data => console.info(String(data)));
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
