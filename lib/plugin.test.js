'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');
const chalk = require('chalk');

const getCredentials = sinon.spy();
const logsCollection = sinon.spy();
const wrap = sinon.spy();
const wrapClean = sinon.spy();
const runPolicies = sinon.spy();
const removeDestination = sinon.spy();
const saveDeployment = sinon.spy();
const createAndSetDeploymentUid = sinon.spy();
const generate = sinon.spy();
const configureDeployProfile = sinon.spy();
const injectLogsIamRole = sinon.spy();
const setApiGatewayAccessLogFormat = sinon.spy();

const ServerlessEnterprisePlugin = proxyquire('./plugin', {
  './credentials': getCredentials,
  './logsCollection': logsCollection,
  './wrap': wrap,
  './wrapClean': wrapClean,
  './safeguards': runPolicies,
  './removeDestination': removeDestination,
  './deployment': { saveDeployment, createAndSetDeploymentUid },
  './generateEvent': { eventDict: {}, generate },
  './deployProfile': { configureDeployProfile },
  './injectLogsIamRole': injectLogsIamRole,
  './setApiGatewayAccessLogFormat': setApiGatewayAccessLogFormat,
  '@serverless/platform-sdk': {
    configureFetchDefaults: () => {},
    getLoggedInUser: () => ({
      accessKeys: {
        tenant: '12345',
      },
      idToken: 'ID',
    }),
    getAccessKeyForTenant: () => '123456',
    archiveService: async () => {},
    getMetadata: async () => 'token',
  },
  './dashboard': proxyquire('./dashboard', {
    '@serverless/platform-sdk': {
      urls: { frontendUrl: 'https://dashboard/' },
    },
  }),
  './appUids': () => ({ appUid: '000000000000000000', tenantUid: '000000000000000000' }),
});

const _ = require('lodash');

// REMOVING GETPROVIDREMOCK() AND LOGMOCK() AND USING THESLS INSTANCE BELOW

// Mock Serverless Instance
const sls = {
  getProvider: sinon.stub().returns({
    getStage: () => 'stage',
    getRegion: () => 'region',
  }),
  service: {
    service: 'service',
    app: 'app',
    tenant: 'tenant',
    provider: { variableSyntax: '\\${([ ~:a-zA-Z0-9._@\'",\\-\\/\\(\\)*]+?)}' },
  },
  cli: {
    log: sinon.spy(),
  },
  processedInput: {
    commands: [],
    options: {
      type: 'sqs',
    },
  },
};

describe('plugin', () => {
  before(() => {
    sinon.stub(console, 'log');
  });
  // eslint-disable-next-line no-console
  after(() => console.log.restore());

  it('constructs and sets hooks', () => {
    const instance = new ServerlessEnterprisePlugin(sls);
    expect(new Set(Object.keys(instance.hooks))).to.deep.equal(
      new Set([
        'before:package:createDeploymentArtifacts',
        'after:package:createDeploymentArtifacts',
        'before:deploy:function:packageFunction',
        'after:deploy:function:packageFunction',
        'before:invoke:local:invoke',
        'before:aws:package:finalize:saveServiceState',
        'before:deploy:deploy',
        'before:aws:deploy:deploy:createStack',
        'after:aws:deploy:finalize:cleanup',
        'after:deploy:finalize',
        'after:deploy:deploy',
        'before:info:info',
        'after:info:info',
        'before:logs:logs',
        'before:metrics:metrics',
        'before:remove:remove',
        'after:remove:remove',
        'after:invoke:local:invoke',
        'before:offline:start:init',
        'before:step-functions-offline:start',
        'login:login',
        'logout:logout',
        'generate-event:generate-event',
        'test:test',
        'dashboard:dashboard',
      ])
    );
    expect(new Set(Object.keys(instance.variableResolvers))).to.deep.equal(
      new Set(['secrets', 'state'])
    );
    expect(sls.getProvider.calledWith('aws')).to.be.true;
    expect(sls.cli.log.callCount).to.equal(0);
  });

  it('construct requires tenant', () => {
    const slsClone = _.cloneDeep(sls);
    delete slsClone.service.tenant;
    new ServerlessEnterprisePlugin(slsClone); // eslint-disable-line no-new
    expect(slsClone.getProvider.calledWith('aws')).to.be.true;
    expect(sls.cli.log.callCount).to.equal(0);
  });

  it('construct disallows variable use', () => {
    const slsClone = _.cloneDeep(sls);
    slsClone.service.tenant = '${self:custom.foobar}';
    expect(() => new ServerlessEnterprisePlugin(slsClone)).to.throw(
      '"app" and "org" in your serverless config can not use the variable system'
    );
    expect(sls.cli.log.callCount).to.equal(0);
  });

  it('routes before:package:createDeploymentArtifacts hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls);
    await instance.route('before:package:createDeploymentArtifacts')();
    expect(wrap.calledWith(instance)).to.be.true;
    expect(injectLogsIamRole.calledWith(instance)).to.be.true;
    expect(setApiGatewayAccessLogFormat.calledWith(instance)).to.be.true;
    expect(createAndSetDeploymentUid.calledWith(instance)).to.be.true;
  });

  it('routes after:package:createDeploymentArtifacts hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls);
    await instance.route('after:package:createDeploymentArtifacts')();
    expect(wrapClean.calledWith(instance)).to.be.true;
  });

  it('routes before:invoke:local:invoke hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls);
    await instance.route('before:invoke:local:invoke')();
    expect(wrap.calledWith(instance)).to.be.true;
  });

  it('routes after:invoke:local:invoke hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls);
    await instance.route('after:invoke:local:invoke')();
    expect(wrapClean.calledWith(instance)).to.be.true;
  });

  it('routes before:info:info hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls);
    await instance.route('before:info:info')();
    expect(getCredentials.calledWith(instance)).to.be.true;
  });

  it('routes before:logs:logs hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls);
    await instance.route('before:logs:logs')();
    expect(getCredentials.calledWith(instance)).to.be.true;
  });

  it('routes before:metrics:metrics hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls);
    await instance.route('before:metrics:metrics')();
    expect(getCredentials.calledWith(instance)).to.be.true;
  });

  it('routes before:remove:remove hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls);
    await instance.route('before:remove:remove')();
    expect(getCredentials.calledWith(instance)).to.be.true;
  });

  it('routes after:aws:deploy:finalize:cleanup hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls);
    await instance.route('after:aws:deploy:finalize:cleanup')();
    expect(saveDeployment.calledWith(instance)).to.be.true;
  });

  it('routes after:remove:remove hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls);
    await instance.route('after:remove:remove')();
    expect(removeDestination.calledWith(instance)).to.be.true;
    expect(saveDeployment.calledWith(instance, true)).to.be.true;
  });

  it('routes before:aws:package:finalize:saveServiceState', async () => {
    const instance = new ServerlessEnterprisePlugin(sls);
    await instance.route('before:aws:package:finalize:saveServiceState')();
    expect(getCredentials.calledWith(instance)).to.be.true;
    expect(logsCollection.calledWith(instance)).to.be.true;
  });

  it('routes before:deploy:deploy', async () => {
    const instance = new ServerlessEnterprisePlugin(sls);
    await instance.route('before:deploy:deploy')();
    expect(runPolicies.calledWith(instance)).to.be.true;
  });

  it('routes generate-event:generate-event hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls);
    await instance.route('generate-event:generate-event')();
    expect(generate.calledWith(instance)).to.be.true;
  });

  it('routes asyncInit to deploy profile config', async () => {
    const instance = new ServerlessEnterprisePlugin(sls);
    await instance.asyncInit();
    expect(configureDeployProfile.calledWith(instance)).to.be.true;
  });

  it('routes after:info:info hook correctly', async () => {
    const instance = new ServerlessEnterprisePlugin(sls);
    await instance.route('after:info:info')();
    expect(
      // eslint-disable-next-line no-console
      console.log.args[0][0]
    ).to.equal(
      chalk.yellow(
        'Run "serverless dashboard" to open the dashboard or visit https://dashboard/tenants/tenant/applications/app/services/service/stage/stage/region/region'
      )
    );
  });

  it('sets app & org from CLI flags', async () => {
    sls.processedInput.options.app = 'app2';
    sls.processedInput.options.org = 'org2';
    const instance = new ServerlessEnterprisePlugin(sls);
    expect(instance.sls.service.app).to.equal('app2');
    expect(instance.sls.service.org).to.equal('org2');
    expect(instance.sls.service.tenant).to.equal('org2');
  });
});
