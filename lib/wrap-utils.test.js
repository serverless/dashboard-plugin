'use strict';

const { expect } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const os = require('os');

describe('wrap - wrap-utils', () => {
  let fs;
  let wrapUtils;

  before(() => {
    fs = {
      writeFileSync: sinon.spy(),
      pathExistsSync: sinon.stub().returns(true),
      removeSync: () => {},
      ensureDirSync: () => {},
      copySync: () => {},
      readFile: sinon.stub().resolves('zipcontents'),
      readFileSync: sinon.stub().returns('{"type": "module"}'),
      existsSync: sinon.stub().returns(true),
    };

    wrapUtils = proxyquire('./wrap-utils', {
      'fs-extra': fs,
      '@noCallThru': true,
    });
  });

  afterEach(() => sinon.resetHistory());

  it('evaluates package.json type when determining to not wrap service', () => {
    const ctx = {
      sls: {
        config: {
          servicePath: '/tmp/fake',
        },
        service: {},
      },
    };

    const result = wrapUtils.shouldWrap(ctx);

    expect(result).to.be.false;
    expect(fs.existsSync.calledWith('/tmp/fake/package.json')).to.be.true;
    expect(fs.readFileSync.calledWith('/tmp/fake/package.json')).to.be.true;
  });

  it('evaluates custom.enterprise.disableWrapping when determining to not wrap service', () => {
    const ctx = {
      sls: {
        config: {
          servicePath: '/tmp/fake',
        },
        service: {
          custom: {
            enterprise: {
              disableWrapping: true,
            },
          },
        },
      },
    };

    const result = wrapUtils.shouldWrap(ctx);

    expect(result).to.be.false;
    expect(fs.existsSync.notCalled).to.be.true;
    expect(fs.readFileSync.notCalled).to.be.true;
  });

  it('evaluates package.json type when determining to wrap service', () => {
    const ctx = {
      sls: {
        config: {
          servicePath: '/tmp/fake',
        },
        service: {},
      },
    };

    fs.readFileSync = sinon.stub().returns('{}');

    const result = wrapUtils.shouldWrap(ctx);

    expect(result).to.be.true;
    expect(fs.existsSync.calledWith('/tmp/fake/package.json')).to.be.true;
    expect(fs.readFileSync.calledWith('/tmp/fake/package.json')).to.be.true;
  });

  it('evaluates custom.enterprise.disableWrapping when determining to wrap service', () => {
    const ctx = {
      sls: {
        config: {
          servicePath: '/tmp/fake',
        },
        service: {
          custom: {
            enterprise: {
              disableWrapping: false,
            },
          },
        },
      },
    };

    fs.readFileSync = sinon.stub().returns('{}');

    const result = wrapUtils.shouldWrap(ctx);

    expect(result).to.be.true;
    expect(fs.existsSync.calledWith('/tmp/fake/package.json')).to.be.true;
    expect(fs.readFileSync.calledWith('/tmp/fake/package.json')).to.be.true;
  });

  it('should wrap functions when runtime is python', () => {
    const ctx = {
      sls: {
        config: {
          servicePath: '/tmp/fake',
        },
        service: {
          provider: {
            runtime: 'python3.10',
          },
        },
      },
    };

    const result = wrapUtils.shouldWrapFunction(ctx, {});
    expect(result).to.be.true;
    expect(fs.existsSync.notCalled).to.be.true;
    expect(fs.readFileSync.notCalled).to.be.true;
  });

  it('should wrap functions when runtime is node and is a .js file', () => {
    const ctx = {
      sls: {
        config: {
          servicePath: '/tmp/fake',
        },
        service: {
          provider: {
            runtime: 'nodejs16.x',
          },
        },
      },
    };

    const functionConfig = {
      handler: 'src/index.handler',
    };

    fs.existsSync = sinon.stub().returns(true);

    const result = wrapUtils.shouldWrapFunction(ctx, functionConfig);
    expect(result).to.be.true;
    if (os.platform() === 'win32') {
      expect(fs.existsSync.calledWith('\\tmp\\fake\\src\\index.js')).to.be.true;
    } else {
      expect(fs.existsSync.calledWith('/tmp/fake/src/index.js')).to.be.true;
    }
    expect(fs.readFileSync.notCalled).to.be.true;
  });

  it('should not wrap functions when runtime is node and is a .mjs file', () => {
    const ctx = {
      sls: {
        config: {
          servicePath: '/tmp/fake',
        },
        service: {
          provider: {
            runtime: 'nodejs16.x',
          },
        },
      },
    };

    const functionConfig = {
      handler: 'src/index.handler',
    };

    fs.existsSync = sinon.stub().onFirstCall().returns(false).onSecondCall().returns(true);

    const result = wrapUtils.shouldWrapFunction(ctx, functionConfig);
    expect(result).to.be.false;
    if (os.platform() === 'win32') {
      expect(fs.existsSync.calledWith('\\tmp\\fake\\src\\index.js')).to.be.true;
      expect(fs.existsSync.calledWith('\\tmp\\fake\\src\\index.mjs')).to.be.true;
    } else {
      expect(fs.existsSync.calledWith('/tmp/fake/src/index.js')).to.be.true;
      expect(fs.existsSync.calledWith('/tmp/fake/src/index.mjs')).to.be.true;
    }
    expect(fs.readFileSync.notCalled).to.be.true;
  });

  it('should not wrap functions when a runtime is not supported', () => {
    const ctx = {
      sls: {
        config: {
          servicePath: '/tmp/fake',
        },
        service: {
          provider: {
            runtime: 'unsupported16.x',
          },
        },
      },
    };

    const functionConfig = {
      handler: 'src/index.handler',
    };

    fs.existsSync = sinon.stub().onFirstCall().returns(false).onSecondCall().returns(true);

    const result = wrapUtils.shouldWrapFunction(ctx, functionConfig);
    expect(result).to.be.false;
    expect(fs.existsSync.notCalled).to.be.true;
    expect(fs.existsSync.notCalled).to.be.true;
    expect(fs.readFileSync.notCalled).to.be.true;
  });
});
