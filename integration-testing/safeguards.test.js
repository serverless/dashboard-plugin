'use strict';

const stripAnsi = require('strip-ansi');
const setup = require('./setup');

let sls;
let teardown;

describe('integration: safeguards', function() {
  this.timeout(1000 * 60 * 5);

  beforeAll(async () => ({ sls, teardown } = await setup('service')));

  afterAll(() => {
    if (teardown) return teardown();
    return null;
  });

  it('deploys with no extra options, warns on cfn role', async () => {
    const stdout = stripAnsi(String((await sls(['deploy'])).stdoutBuffer));
    expect(stdout).to.include('warned - require-cfn-role');
    expect(stdout).to.include('Warned - no cfnRole set');
  });

  it('deploys blocks deploy on illegal stage name', async () => {
    try {
      await sls(['deploy', '-s', 'bad-stage']);
    } catch (error) {
      const stdout = stripAnsi(String(error.stdoutBuffer));
      expect(stdout).to.include('failed - allowed-stages');
      expect(stdout).to.include(
        'Failed - Stage name "bad-stage" not in list of permitted names: ["dev","qa","prod"]'
      );
      return;
    }
    throw new Error('Unexpected');
  });

  it('deploys blocks deploy on disallowed region', async () => {
    try {
      await sls(['deploy', '-r', 'us-west-2']);
    } catch (error) {
      const stdout = stripAnsi(String(error.stdoutBuffer));
      expect(stdout).to.include('failed - allowed-regions');
      expect(stdout).to.include('Failed - ');
      return;
    }
    throw new Error('Unexpected');
  });

  it('deploys warns when using a bad IAM role', async () => {
    const proc = await sls(['deploy'], { env: { IAM_ROLE: 'badIamRole' } });
    const stdout = stripAnsi(String(proc.stdoutBuffer));
    expect(stdout).to.include('warned - no-wild-iam-role-statements');
    expect(stdout).to.include(
      "Warned - iamRoleStatement granting Resource='*'. Wildcard resources in iamRoleStatements are not permitted."
    );
  });

  it('deploys warns when using a env var', async () => {
    const proc = await sls(['deploy'], { env: { ENV_OPT: '-----BEGIN RSA PRIVATE KEY-----' } });
    const stdout = stripAnsi(String(proc.stdoutBuffer));
    expect(stdout).to.include('warned - no-secret-env-vars');
    expect(stdout).to.include(
      "Warned - Environment variable variable1 on function 'hello' looks like it contains a secret value"
    );
  });

  it('deploys warns about dlq when not using an HTTP event', async () => {
    const proc = await sls(['deploy'], { env: { EVENTS: 'noEvents' } });
    const stdout = stripAnsi(String(proc.stdoutBuffer));
    expect(stdout).to.include('warned - require-dlq');
    expect(stdout).to.include(
      'Warned - Function "hello" doesn\'t have a Dead Letter Queue configured.'
    );
  });
});
