'use strict';

const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const spawn = require('child-process-ext/spawn');
const { ensureDir, ensureSymlink, writeJson, realpath, removeSync } = require('fs-extra');
const fetch = require('node-fetch');
const tar = require('tar');
const { memoize } = require('lodash');
const log = require('log').get('test');

const nodeVersion = Number(process.version.split('.')[0].slice(1));
const tmpDir = os.tmpdir();

const resolveMode = (options) => {
  if (!options) return 'direct';
  return options.mode === 'compiled' ? 'compiled' : 'direct';
};

module.exports = memoize(async (options = {}) => {
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
        `LOCAL_SERVERLESS_LINK_PATH which resolves to ${serverlessPath}, doesn't point a ` +
          'serverless installation which links this installation of a plugin'
      );
    }
    log.notice(`Rely on 'serverless' at ${serverlessPath}`);
    return {
      root: serverlessPath,
      binary: path.join(serverlessPath, 'bin/serverless.js'),
      version: require(path.join(serverlessPath, 'package.json')).version,
      plugin: pluginPath,
    };
  }
  log.notice(`Setup 'serverless' at ${serverlessTmpDir}`);
  await ensureDir(serverlessTmpDir);
  if (!options.shouldKeepServerlessDir) {
    process.on('exit', () => {
      try {
        removeSync(serverlessTmpDir);
      } catch (error) {
        // Safe to ignore
      }
    });
  }

  log.debug('... fetch tarball');
  const res = await fetch('https://github.com/serverless/serverless/archive/master.tar.gz');
  const tarDeferred = tar.x({ cwd: serverlessTmpDir, strip: 1 });
  res.body.pipe(tarDeferred);
  await new Promise((resolve, reject) => {
    res.body.on('error', reject);
    tarDeferred.on('error', reject);
    tarDeferred.on('finish', resolve);
  });

  log.debug('... patch serverless/package.json');
  const pkgJsonPath = `${serverlessTmpDir}/package.json`;
  const pkgJson = require(pkgJsonPath);
  // Do not npm install @serverless/enterprise-plugin
  // (local installation will be linked in further steps)
  delete pkgJson.dependencies['@serverless/enterprise-plugin'];
  // Prevent any postinstall setup (stats requests, automcomplete setup, logs etc.)
  delete pkgJson.scripts.postinstall;
  await writeJson(pkgJsonPath, pkgJson);

  if (nodeVersion === 6 && process.platform !== 'win32') {
    // Usync async spawn when testing with Node.js v6 occasionally paves path to
    // "Segmentation fault" error (which happen on bebel patched require to linked plugin)
    // Reason is unknown, workaround seems to use sync spawn
    log.debug('... npm install (sync)');
    spawnSync('npm', ['install', '--production'], { cwd: serverlessTmpDir });
  } else {
    log.debug('... npm install');
    await spawn('npm', ['install', '--production'], { cwd: serverlessTmpDir });
  }

  log.debug('... link @serverless/enterprise-plugin dependency');
  const mode = resolveMode(options);
  await ensureSymlink(
    path.join(__dirname, `../${mode === 'direct' ? '' : 'dist'}`),
    path.join(serverlessTmpDir, 'node_modules/@serverless/enterprise-plugin')
  );

  return {
    root: serverlessTmpDir,
    binary: path.join(serverlessTmpDir, 'bin/serverless.js'),
    version: pkgJson.version,
    plugin: await realpath(
      path.join(serverlessTmpDir, 'node_modules/@serverless/enterprise-plugin')
    ),
  };
}, resolveMode);
