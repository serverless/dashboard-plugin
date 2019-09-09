'use strict';

const logsCollection = require('./logsCollection');
const { LAMBDA_FILTER_PATTERN, API_GATEWAY_FILTER_PATTERN } = require('./utils');
const { getLogDestination } = require('@serverless/platform-sdk');

jest.mock('@serverless/platform-sdk', () => ({
  getLogDestination: jest.fn().mockReturnValue(Promise.resolve({ destinationArn: 'arn:logdest' })),
  getAccessKeyForTenant: jest.fn().mockReturnValue(Promise.resolve('accessKey')),
}));

afterAll(() => jest.restoreAllMocks());

describe('logsCollection', () => {
  it('adds log subscription filter to template', async () => {
    const log = jest.fn();
    const request = jest.fn().mockReturnValue(Promise.resolve({ Account: 'ACCOUNT_ID' }));
    const getStage = jest.fn().mockReturnValue('dev');
    const getRegion = jest.fn().mockReturnValue('us-east-1');
    const getServiceName = jest.fn().mockReturnValue('serviceName');
    const ctx = {
      sls: {
        cli: { log },
        service: {
          tenant: 'tenant',
          app: 'app',
          appUid: 'app123',
          tenantUid: 'tenant123',
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
    expect(log).toHaveBeenCalledTimes(0);
    expect(getServiceName).toHaveBeenCalledTimes(1);
    expect(getStage).toHaveBeenCalledTimes(1);
    expect(getRegion).toHaveBeenCalledTimes(1);
    expect(getLogDestination).toBeCalledWith({
      accessKey: 'accessKey',
      appUid: 'app123',
      tenantUid: 'tenant123',
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
});
