/*eslint-disable import/no-dynamic-require*/
import path from 'path';
import _ from 'lodash';
import {
  copySync,
  renameSync,
  removeSync,
  readdirSync,
  readFileSync
} from 'fs-extra';

import sls from './__mocks__/sls';

const ServerlessPlugin = require('../dist/index');

let Plugin;
const prefix = path.resolve(__dirname, '../testProjects/default');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

test('Can instantiate main class', () => {
  // allows missing package.json next to serverless.yml
  renameSync(
    path.resolve(prefix, 'package.json'),
    path.resolve(prefix, 'package1.json')
  );
  // start the plugin
  Plugin = new ServerlessPlugin(sls, {
    prefix
  });
  // reset package.json
  renameSync(
    path.resolve(prefix, 'package1.json'),
    path.resolve(prefix, 'package.json')
  );
  expect(Plugin).toBeDefined();
});

test('Options module is a function', () => {
  expect(Plugin.getOptions).toBeInstanceOf(Function);
});

test('Options are set with defaults', () => {
  let opts = Plugin.getOptions();
  expect(opts.testInterpolate).toBeUndefined();
  // set the options state as if we were triggering Plugin.run()
  sls.service.custom.iopipeTestInterpolate = 'wow-fun';
  Plugin.setOptions({});
  opts = Plugin.getOptions();
  expect(opts).toBeDefined();
  expect(opts).toHaveProperty('quote');
  expect(opts.testInterpolate).toBe('wow-fun');
  expect(opts.noVerify).toBeUndefined();
});

test('Plugin has props', () => {
  ['sls', 'package', 'funcs', 'commands', 'hooks'].forEach(str => {
    expect(Plugin).toHaveProperty(str);
  });
});

test('Plugin has proper executeable methods', () => {
  [
    'log',
    'run',
    'setPackage',
    'setOptions',
    'checkForLib',
    'upgradeLib',
    'checkToken',
    'getFuncs',
    'createFiles',
    'assignHandlers',
    'finish'
  ].forEach(str => {
    expect(Plugin[str]).toBeDefined();
    expect(Plugin[str]).toBeInstanceOf(Function);
  });
});

test('Options are set via Plugin', () => {
  const opts = Plugin.getOptions();
  expect(opts).toBeInstanceOf(Object);
  expect(opts.token).toEqual('SAMPLE_TOKEN_FOO');
});

test('Options can be overridden', () => {
  let opts = Plugin.getOptions();
  expect(opts.exclude).toContain('excluded');
  opts = Plugin.getOptions({ token: 'WOW_FUN_TOKEN' });
  expect(opts.token).toEqual('WOW_FUN_TOKEN');
  expect(opts.exclude).toContain('excluded');
});

test('Tracking works', async () => {
  const res = await Plugin.track({ action: 'dummy-test-action' });
  expect(res).toEqual(1);
});

test('Tracking noops when noStats is set', async () => {
  Plugin.getOptions({ noStats: true });
  const res = await Plugin.track({ action: 'dummy-test-action' });
  expect(res).toEqual('no-stats');
});

test('Package is set via Plugin', () => {
  expect(Plugin.package).toBeDefined();
  expect(Plugin.package.dependencies).not.toBeDefined();
  Plugin.setPackage();
  expect(Plugin.package.dependencies).toBeDefined();
});

test('Can check for lib, all is well', () => {
  const check = Plugin.checkForLib();
  expect(check).toBe(true);
});

test('Skips lib check if package.json has no dependencies', () => {
  const check = Plugin.checkForLib({});
  expect(check).toBe('no-package-skip');
});

test('Skips lib check if opts specify noVerify', () => {
  Plugin.getOptions({ noVerify: true });
  const check = Plugin.checkForLib({ dependencies: {} });
  expect(check).toBe('no-verify-skip');
  Plugin.getOptions({ noVerify: false });
});

test('Throws error if iopipe is not found in valid package.json', () => {
  let targetErr;
  try {
    Plugin.checkForLib({ dependencies: { lodash: '4.17.4' } });
  } catch (err) {
    targetErr = err;
  }
  expect(targetErr).toBeInstanceOf(Error);
  expect(targetErr.message).toMatch(/module not found/);
});

test('Warns if iopipe token is not found', () => {
  Plugin.getOptions({ token: '' });
  const msg = Plugin.checkToken();
  expect(msg).toMatchSnapshot();
});

test('Does not upgrade if noUpgrade option is set', async () => {
  Plugin.getOptions({ noUpgrade: true });
  const result = await Plugin.upgradeLib();
  expect(result).toBe('no-upgrade');
});

test('Uses npm if no yarn.lock (no upgrade needed)', async () => {
  Plugin.getOptions({ noUpgrade: false });
  renameSync(
    path.resolve(prefix, 'yarn.lock'),
    path.resolve(prefix, 'yarn1.lock')
  );
  const upgradeResult = await Plugin.upgradeLib();
  expect(upgradeResult).toBe('success-no-upgrade-npm');
  renameSync(
    path.resolve(prefix, 'yarn1.lock'),
    path.resolve(prefix, 'yarn.lock')
  );
});

test('Uses yarn if available lockfile found (no upgrade needed)', async () => {
  const upgradeResult = await Plugin.upgradeLib();
  expect(upgradeResult).toBe('success-no-upgrade-yarn');
});

async function upgrade(manager) {
  let err;
  try {
    //prepare dummy new package.json
    copySync(
      path.join(prefix, 'package.json'),
      path.join(prefix, 'packageOld.json')
    );
    manager === 'npm' &&
      renameSync(
        path.join(prefix, 'yarn.lock'),
        path.join(prefix, 'yarn1.lock')
      );
    const upgradeResult = await Plugin.upgradeLib(
      '1.6.0',
      'cd testProjects/default'
    );
    expect(upgradeResult).toBe(`success-upgrade-${manager}-1.6.0`);
    //reset back to original
  } catch (e) {
    err = e;
  }
  removeSync(path.join(prefix, 'package.json'));
  renameSync(
    path.join(prefix, 'packageOld.json'),
    path.join(prefix, 'package.json')
  );
  manager === 'npm' &&
    renameSync(path.join(prefix, 'yarn1.lock'), path.join(prefix, 'yarn.lock'));
  if (err) {
    throw new Error(err);
  }
  return manager;
}

test('Upgrades lib with yarn', async () => {
  const test = await upgrade('yarn');
  expect(test).toBe('yarn');
});

test('Upgrades lib with npm', async () => {
  const test = await upgrade('npm');
  expect(test).toBe('npm');
});

test('Gets funcs', () => {
  expect(Plugin.funcs).toEqual(expect.arrayContaining([]));
  expect(sls.service.functions.python.runtime).toEqual('python2.7');
  Plugin.getFuncs();
  expect(_.find(Plugin.funcs, f => f.name === 'python')).toBeUndefined();
  const simple = _.find(Plugin.funcs, f => f.name === 'simple');
  expect(simple).toBeDefined();
  ['handler', 'name', 'method', 'path', 'relativePath'].forEach(str => {
    expect(simple).toHaveProperty(str);
  });
});

test('Can create iopipe handler file', () => {
  Plugin.getOptions({ token: 'TEST_TOKEN' });
  Plugin.createFiles();
  const file = readFileSync(
    path.join(prefix, 'iopipe_handlers/simple-iopipe.js'),
    'utf8'
  );
  expect(file).toBeDefined();
  expect(file).toMatchSnapshot();
});

test('Agent instantiation only includes installMethod if no iopipeToken in custom section of serverless.yml', () => {
  Plugin.getOptions({ token: '' });
  Plugin.createFiles();
  const file = readFileSync(
    path.join(prefix, 'iopipe_handlers/simple-iopipe.js'),
    'utf8'
  );
  expect(file).toBeDefined();
  expect(file.split('\n')[0]).toMatchSnapshot();
});

test('Cleans up', () => {
  Plugin.finish();
  const files = readdirSync(prefix);
  expect(_.includes(files, 'iopipe_handlers')).toBeFalsy();
  expect(_.includes(files, 'serverless.yml')).toBeTruthy();
});
