'use strict';

const { expect } = require('chai');
const fs = require('fs');
const stripAnsi = require('strip-ansi');
const setup = require('./setup');

let sls1;
let sls2;
let serviceName;
let serviceTmpDir;
let teardown1;
let teardown2;

describe('integration: outputs', function () {
  this.timeout(1000 * 60 * 5);

  before(async () => {
    [
      { sls: sls1, serviceName, teardown: teardown1 },
      { sls: sls2, teardown: teardown2, serviceTmpDir },
    ] = await Promise.all([setup('service'), setup('service2')]);

    let slsYaml = fs.readFileSync(`${serviceTmpDir}/serverless.yml`).toString();
    slsYaml = slsYaml.replace(
      'output:service.outputVariable',
      `output:${serviceName}.outputVariable`
    );
    fs.writeFileSync(`${serviceTmpDir}/serverless.yml`, slsYaml);
  });

  after(() => {
    if (teardown1) return teardown1();
    if (teardown2) return teardown2();
    return null;
  });

  it('can publish and consume outputs', async () => {
    await sls1(['deploy']);

    const printStdout = stripAnsi(
      String((await sls2(['print', '--path', 'custom.testOutput'])).stdoutBuffer)
    );
    expect(printStdout).to.include('outputValue\n\n');
  });
});
