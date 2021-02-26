'use strict';

const { expect } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const getMetadataStub = sinon.stub().resolves({ awsAccountId: '111111' });

const platformClientStub = {
  ServerlessSDK: class ServerlessSDK {
    constructor() {
      this.metadata = {
        get: getMetadataStub,
      };
    }
  },
};

const injectLogsIamRole = proxyquire('./injectLogsIamRole', {
  '@serverless/platform-client': platformClientStub,
});

describe('injectLogsIamRole', () => {
  beforeEach(() => {
    getMetadataStub.resetHistory();
  });

  it('adds IAM role for all the log groups created', async () => {
    const compiledCloudFormationTemplate = {
      Resources: {
        Foo: { Type: 'AWS::Logs::LogGroup' },
        Bar: { Type: 'AWS::Logs::LogGroup' },
      },
      Outputs: {},
    };
    const ctx = {
      sls: {
        service: {
          org: 'org',
          orgUid: 'UID',
          provider: { compiledCloudFormationTemplate },
        },
      },
    };
    await injectLogsIamRole(ctx);
    expect(compiledCloudFormationTemplate).to.deep.equal({
      Resources: {
        Foo: { Type: 'AWS::Logs::LogGroup' },
        Bar: { Type: 'AWS::Logs::LogGroup' },
        EnterpriseLogAccessIamRole: {
          Type: 'AWS::IAM::Role',
          Properties: {
            AssumeRolePolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: {
                    AWS: 'arn:aws:iam::111111:root',
                  },
                  Action: 'sts:AssumeRole',
                  Condition: {
                    StringEquals: {
                      'sts:ExternalId': 'ServerlessEnterprise-UID',
                    },
                  },
                },
              ],
            },
            Policies: [
              {
                PolicyName: 'LogFilterAccess',
                PolicyDocument: {
                  Version: '2012-10-17',
                  Statement: [
                    {
                      Effect: 'Allow',
                      Action: ['logs:FilterLogEvents'],
                      Resource: [
                        {
                          'Fn::GetAtt': ['Foo', 'Arn'],
                        },
                        {
                          'Fn::GetAtt': ['Bar', 'Arn'],
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        },
      },
      Outputs: {
        EnterpriseLogAccessIamRole: {
          Value: {
            'Fn::GetAtt': ['EnterpriseLogAccessIamRole', 'Arn'],
          },
        },
      },
    });
    expect(getMetadataStub.calledOnce).to.be.true;
  });

  it('adds does not add role if user specified their own', async () => {
    const compiledCloudFormationTemplate = {
      Resources: {
        Foo: { Type: 'AWS::Logs::LogGroup' },
        Bar: { Type: 'AWS::Logs::LogGroup' },
      },
      Outputs: {},
    };
    const ctx = {
      sls: {
        service: {
          org: 'org',
          orgUid: 'UID',
          provider: { compiledCloudFormationTemplate },
          custom: { enterprise: { logAccessIamRole: 'ARN' } },
        },
      },
    };
    await injectLogsIamRole(ctx);
    expect(compiledCloudFormationTemplate).to.deep.equal({
      Resources: {
        Foo: { Type: 'AWS::Logs::LogGroup' },
        Bar: { Type: 'AWS::Logs::LogGroup' },
      },
      Outputs: {},
    });
    expect(getMetadataStub.called).to.be.false;
  });

  it('does not add IAM role when no log groups', async () => {
    const compiledCloudFormationTemplate = {
      Resources: {},
      Outputs: {},
    };
    const ctx = {
      sls: {
        service: {
          org: 'org',
          orgUid: 'UID',
          provider: { compiledCloudFormationTemplate },
        },
      },
    };
    await injectLogsIamRole(ctx);
    expect(compiledCloudFormationTemplate).to.deep.equal({
      Resources: {},
      Outputs: {},
    });
  });
});
