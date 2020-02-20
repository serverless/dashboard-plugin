'use strict';

const proxyquire = require('proxyquire');
const sinon = require('sinon');

const { LAMBDA_FILTER_PATTERN, API_GATEWAY_FILTER_PATTERN } = require('./utils');

describe('logsCollection', () => {
  let getLogDestination;
  let logsCollection;

  before(() => {
    getLogDestination = sinon.stub().resolves({ destinationArn: 'arn:logdest' });
    logsCollection = proxyquire('./logsCollection', {
      '@serverless/platform-sdk': { getLogDestination, getAccessKeyForTenant: () => 'accessKey' },
    });
  });

  it('adds log subscription filter to template', async () => {
    const log = sinon.spy();
    const request = async () => ({ Account: 'ACCOUNT_ID' });
    const getStage = sinon.stub().returns('dev');
    const getRegion = sinon.stub().returns('us-east-1');
    const getServiceName = sinon.stub().returns('serviceName');
    const ctx = {
      sls: {
        cli: { log },
        service: {
          org: 'org',
          app: 'app',
          appUid: 'app123',
          orgUid: 'org123',
          custom: { enterprise: { collectLambdaLogs: true } },
          getServiceName,
          provider: {
            compiledCloudFormationTemplate: {
              Resources: {
                lambdaLogs: {
                  Type: 'AWS::Logs::LogGroup',
                  Properties: {
                    LogGroupName: '/aws/lambda/service-name-dev-func',
                  },
                },
                apiGatewayLogs: {
                  Type: 'AWS::Logs::LogGroup',
                  Properties: {
                    LogGroupName: '/aws/api-gateway/service-name-dev',
                  },
                },
              },
            },
          },
        },
      },
      provider: {
        request,
        getStage,
        getRegion,
      },
    };
    const that = { serverless: { classes: { Error } } };
    await logsCollection.bind(that)(ctx);
    expect(log.callCount).to.equal(0);
    expect(getServiceName.callCount).to.equal(1);
    expect(getStage.callCount).to.equal(1);
    expect(getRegion.callCount).to.equal(1);
    expect(getLogDestination.args[0][0]).to.deep.equal({
      accessKey: 'accessKey',
      appUid: 'app123',
      tenantUid: 'org123',
      stageName: 'dev',
      serviceName: 'serviceName',
      regionName: 'us-east-1',
      accountId: 'ACCOUNT_ID',
    });
    expect(ctx.sls.service.provider.compiledCloudFormationTemplate).to.deep.equal({
      Resources: {
        lambdaLogs: {
          Type: 'AWS::Logs::LogGroup',
          Properties: {
            LogGroupName: '/aws/lambda/service-name-dev-func',
          },
        },
        apiGatewayLogs: {
          Type: 'AWS::Logs::LogGroup',
          Properties: {
            LogGroupName: '/aws/api-gateway/service-name-dev',
          },
        },
        CloudWatchLogsSubscriptionFilterLambdaLogs: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:logdest',

            FilterPattern: LAMBDA_FILTER_PATTERN,
            LogGroupName: {
              Ref: 'lambdaLogs',
            },
          },
        },
        CloudWatchLogsSubscriptionFilterApiGatewayLogs: {
          Type: 'AWS::Logs::SubscriptionFilter',
          Properties: {
            DestinationArn: 'arn:logdest',
            FilterPattern: API_GATEWAY_FILTER_PATTERN,
            LogGroupName: {
              Ref: 'apiGatewayLogs',
            },
          },
        },
      },
    });
  });

  it('handles invalid logGroup definition', async () => {
    const log = sinon.spy();
    const request = async () => ({ Account: 'ACCOUNT_ID' });
    const getStage = sinon.stub().returns('dev');
    const getRegion = sinon.stub().returns('us-east-1');
    const getServiceName = sinon.stub().returns('serviceName');
    const ctx = {
      sls: {
        cli: { log },
        service: {
          org: 'org',
          app: 'app',
          appUid: 'app123',
          orgUid: 'org123',
          custom: { enterprise: { collectLambdaLogs: true } },
          getServiceName,
          provider: {
            compiledCloudFormationTemplate: {
              Resources: {
                lambdaLogs: {
                  Type: 'AWS::Logs::LogGroup',
                  Properties: {
                    LogGroupName: '/aws/lambda/service-name-dev-func',
                  },
                },
                apiGatewayLogs: {
                  Type: 'AWS::Logs::LogGroup',
                  Properties: {
                    LogGroupName: null,
                  },
                },
              },
            },
          },
        },
      },
      provider: {
        request,
        getStage,
        getRegion,
      },
    };
    const that = { serverless: { classes: { Error } } };
    try {
      await logsCollection.call(that, ctx);
      throw new Error('Unexpected');
    } catch (error) {
      expect(error.message.startsWith('Unable to resolve ')).to.be.true;
    }
  });
});
