const gotLib = require('got');
const spawn = require('cross-spawn');

const got = str => gotLib(str, { json: true });
const BASE = `http://127.0.0.1:4982`;

async function run() {
  // make sure that the error state works too
  const { body: { err } } = await got(`${BASE}?fail=true`);
  if (err !== 'No iopipe object found on context') {
    throw new Error(err || 'Wrong');
  }
  const { body: { success } } = await got(BASE);
  if (success !== true) {
    throw new Error('No success msg');
  }
  return true;
}

const offlineChild = spawn('npm', ['start'], {
  stdio: 'inherit',
  // http://azimi.me/2014/12/31/kill-child_process-node-js.html
  detached: true
});

setTimeout(async () => {
  let err;
  try {
    await run();
  } catch (e) {
    err = e;
  }
  process.kill(-offlineChild.pid, 'SIGINT');
  if (err) {
    throw err;
  }
}, process.env.OFFLINE_STARTUP_MILLIS || 5000);
