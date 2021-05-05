'use strict';

const { expect } = require('chai');
const path = require('path');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('getServerlessFilePath', () => {
  let lstat;
  let getServerlessFilePath;
  before(() => {
    lstat = sinon.stub().resolves({ isFile: () => true });
    getServerlessFilePath = proxyquire('./getServerlessFilePath', {
      'fs-extra': { lstat },
    });
  });
  it('returns the serverless.yml first', async () => {
    const serverlessFilePath = await getServerlessFilePath(undefined, '/foobar');
    expect(serverlessFilePath).to.equal(path.sep + ['foobar', 'serverless.yml'].join(path.sep));
    expect(lstat.calledWith(path.sep + ['foobar', 'serverless.yml'].join(path.sep))).to.be.true;
    expect(lstat.calledWith(path.sep + ['foobar', 'serverless.yaml'].join(path.sep))).to.be.true;
    expect(lstat.calledWith(path.sep + ['foobar', 'serverless.json'].join(path.sep))).to.be.true;
    expect(lstat.calledWith(path.sep + ['foobar', 'serverless.js'].join(path.sep))).to.be.true;
    expect(lstat.calledWith(path.sep + ['foobar', 'serverless.ts'].join(path.sep))).to.be.true;
  });

  it('returns the custom.yml first', async () => {
    const serverlessFilePath = await getServerlessFilePath('custom.yml', '/foobar');
    expect(serverlessFilePath).to.equal(path.sep + ['foobar', 'custom.yml'].join(path.sep));
    expect(lstat.calledWith(path.sep + ['foobar', 'custom.yml'].join(path.sep)));
  });
});
