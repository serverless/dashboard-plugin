'use strict';

const { expect } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const path = require('path');

describe('wrapClean', () => {
  let fs;
  let wrapClean;
  let wrapUtils;
  before(() => {
    fs = {
      pathExistsSync: sinon.stub().returns(true),
      removeSync: sinon.spy(),
      existsSync: sinon.stub().onCall(0).returns(false).onCall(1).returns(true),
    };
    wrapUtils = {
      shouldWrap: sinon.stub().returns(true),
      shouldWrapFunction: sinon.stub().returns(true),
    };
    wrapClean = proxyquire('./wrap-clean', {
      'fs-extra': fs,
      './wrap-utils': wrapUtils,
    });
  });

  after(() => sinon.resetHistory());

  it('deletes wrapper files', async () => {
    wrapClean({
      sls: { config: { servicePath: '/service' } },
      state: {
        pathAssets: '/assets',
        functions: {
          func: {
            runtime: 'nodejs8.10',
            entryNew: 's-func',
          },
        },
      },
    });

    expect(fs.pathExistsSync.callCount).to.equal(2);
    expect(fs.removeSync.callCount).to.equal(2);
    expect(fs.pathExistsSync.calledWith('/assets')).to.be.true;
    expect(fs.pathExistsSync.calledWith(`${path.sep}service${path.sep}s-func.js`)).to.be.true;
    expect(fs.removeSync.calledWith('/assets')).to.be.true;
    expect(fs.removeSync.calledWith(`${path.sep}service${path.sep}s-func.js`)).to.be.true;
  });
});
