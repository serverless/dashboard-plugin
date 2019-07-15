'use strict';

const { generate } = require('./generateEvent');
const zlib = require('zlib');

describe('generating events', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds http events', async () => {
    const logSpy = jest.spyOn(global.console, 'log');
    const ctx = {
      sls: {
        processedInput: {
          options: {
            type: 'aws:apiGateway',
            body: '{"foo": "bar"}',
          },
        },
      },
    };
    const that = { serverless: { classes: { Error } } };
    await generate.bind(that)(ctx);
    expect(logSpy).toBeCalledWith(
      JSON.stringify({
        body: '{"foo": "bar"}',
        path: '/test/hello',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, lzma, sdch, br',
          'Accept-Language': 'en-US,en;q=0.8',
          'CloudFront-Forwarded-Proto': 'https',
          'CloudFront-Is-Desktop-Viewer': 'true',
          'CloudFront-Is-Mobile-Viewer': 'false',
          'CloudFront-Is-SmartTV-Viewer': 'false',
          'CloudFront-Is-Tablet-Viewer': 'false',
          'CloudFront-Viewer-Country': 'US',
          'Host': 'wt6mne2s9k.execute-api.us-west-2.amazonaws.com',
          'Upgrade-Insecure-Requests': '1',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.82 Safari/537.36 OPR/39.0.2256.48',
          'Via': '1.1 fb7cca60f0ecd82ce07790c9c5eef16c.cloudfront.net (CloudFront)',
          'X-Amz-Cf-Id': 'nBsWBOrSHMgnaROZJK1wGCZ9PcRcSpq_oSXZNQwQ10OTZL4cimZo3g==',
          'X-Forwarded-For': '192.168.100.1, 192.168.1.1',
          'X-Forwarded-Port': '443',
          'X-Forwarded-Proto': 'https',
        },
        pathParameters: { proxy: 'hello' },
        multiValueHeaders: {},
        isBase64Encoded: false,
        multiValueQueryStringParameters: {},
        requestContext: {
          accountId: '123456789012',
          resourceId: 'us4z18',
          stage: 'test',
          requestId: '41b45ea3-70b5-11e6-b7bd-69b5aaebc7d9',
          identity: {
            accessKey: '',
            apiKeyId: '',
            cognitoIdentityPoolId: '',
            accountId: '',
            cognitoIdentityId: '',
            caller: '',
            apiKey: '',
            sourceIp: '192.168.100.1',
            cognitoAuthenticationType: '',
            cognitoAuthenticationProvider: '',
            userArn: '',
            userAgent:
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.82 Safari/537.36 OPR/39.0.2256.48',
            user: '',
          },
          path: '',
          requestTimeEpoch: 0,
          resourcePath: '/{proxy+}',
          httpMethod: 'GET',
          apiId: 'wt6mne2s9k',
        },
        resource: '/{proxy+}',
        httpMethod: 'GET',
        queryStringParameters: { name: 'me' },
        stageVariables: { stageVarName: 'stageVarValue' },
      })
    );
  });

  it('builds SNS events', async () => {
    const logSpy = jest.spyOn(global.console, 'log');
    const ctx = {
      sls: {
        processedInput: {
          options: {
            type: 'aws:sns',
            body: '{"json_string": "with some attrs"}',
          },
        },
      },
    };
    const that = { serverless: { classes: { Error } } };
    await generate.bind(that)(ctx);
    expect(logSpy).toBeCalledWith(
      JSON.stringify({
        Records: [
          {
            EventSource: 'aws:sns',
            EventVersion: '1.0',
            EventSubscriptionArn:
              'arn:aws:sns:us-east-1:123456789:service-1474781718017-1:fdaa4474-f0ff-4777-b1c4-79b96f5a504f',
            Sns: {
              Type: 'Notification',
              MessageId: '52ed5e3d-5fgf-56bf-923d-0e5c3b503c2a',
              TopicArn: 'arn:aws:sns:us-east-1:123456789:service-1474781718017-1',
              Subject: '',
              Message: '{"json_string": "with some attrs"}',
              Timestamp: '2016-09-25T05:37:51.150Z',
              SignatureVersion: '1',
              Signature:
                'V5QL/dhow62Thr9PXYsoHA7bOsDFkLdWZVd8D6LyptA6mrq0Mvldvj/XNtai3VaPp84G3bD2nQbiuwYbYpu9u9uHZ3PFMAxIcugV0dkOGWmYgKxSjPApItIoAgZyeH0HzcXHPEUXXO5dVT987jZ4eelD4hYLqBwgulSsECO9UDCdCS0frexiBHRGoLbWpX+2Nf2AJAL+olEEAAgxfiPEJ6J1ArzfvTFZXdd4XLAbrQe+4OeYD2dw39GBzGXQZemWDKf4d52kk+SwXY1ngaR4UfExQ10lDpKyfBVkSwroaq0pzbWFaxT2xrKIr4sk2s78BsPk0NBi55xA4k1E4tr9Pg==',
              SigningCertUrl:
                'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-b95095beb82e8f6a0e6b3aafc7f4149a.pem',
              UnsubscribeUrl:
                'https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-east-1:123456789:service-1474781718017-1:fdaa4474-f0ff-4777-b1c4-79b96f5a504f',
              MessageAttributes: {},
            },
          },
        ],
      })
    );
  });

  it('builds SQS events', async () => {
    const logSpy = jest.spyOn(global.console, 'log');
    const ctx = {
      sls: {
        processedInput: {
          options: {
            type: 'aws:sqs',
            body: '{"json_string": "with some attrs"}',
          },
        },
      },
    };
    const that = { serverless: { classes: { Error } } };
    await generate.bind(that)(ctx);
    expect(logSpy).toBeCalledWith(
      JSON.stringify({
        Records: [
          {
            messageId: '059f36b4-87a3-44ab-83d2-661975830a7d',
            receiptHandle: 'AQEBwJnKyrHigUMZj6rYigCgxlaS3SLy0a...',
            body: '{"json_string": "with some attrs"}',
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1545082649183',
              SenderId: 'AIDAIENQZJOLO23YVJ4VO',
              ApproximateFirstReceiveTimestamp: '1545082649185',
            },
            messageAttributes: {},
            md5OfBody: '098f6bcd4621d373cade4e832627b4f6',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-2:123456789012:my-queue',
            awsRegion: 'us-east-2',
          },
        ],
      })
    );
  });

  it('builds DynamoDB events', async () => {
    const logSpy = jest.spyOn(global.console, 'log');
    const ctx = {
      sls: {
        processedInput: {
          options: {
            type: 'aws:dynamo',
            body:
              '{ "Keys": { "Id": { "N": "101" } }, "NewImage": { "Message": { "S": "New item!" }, "Id": { "N": "101"}',
          },
        },
      },
    };
    const that = { serverless: { classes: { Error } } };
    await generate.bind(that)(ctx);
    expect(logSpy).toBeCalledWith(
      JSON.stringify({
        Records: [
          {
            eventID: '1',
            eventVersion: '1.0',
            dynamodb:
              '{ "Keys": { "Id": { "N": "101" } }, "NewImage": { "Message": { "S": "New item!" }, "Id": { "N": "101"}',
            awsRegion: 'us-west-2',
            eventName: 'INSERT',
            eventSourceARN: 'arn:aws:dynamodb:us-east-1:123456789012:table/images',
            eventSource: 'aws:dynamodb',
          },
        ],
      })
    );
  });

  it('builds Kinesis events', async () => {
    const logSpy = jest.spyOn(global.console, 'log');
    const ctx = {
      sls: {
        processedInput: {
          options: {
            type: 'aws:kinesis',
            body: 'some string to be base64 encoded',
          },
        },
      },
    };
    const that = { serverless: { classes: { Error } } };
    await generate.bind(that)(ctx);
    expect(logSpy).toBeCalledWith(
      JSON.stringify({
        Records: [
          {
            eventSource: 'aws:kinesis',
            eventVersion: '1.0',
            eventID:
              'shardId-000000000000:49574408222142592692164662027912822768781511344925966338',
            eventName: 'aws:kinesis:record',
            invokeIdentityArn: 'arn:aws:iam::999999999999:role/lambda_kinesis',
            awsRegion: 'ap-northeast-1',
            eventSourceARN: 'arn:aws:kinesis:ap-northeast-1:999999999999:stream/test',
            kinesis: {
              kinesisSchemaVersion: '1.0',
              partitionKey: 'pk_7319',
              sequenceNumber: '49574408222142592692164662027912822768781511344925966338',
              data: 'c29tZSBzdHJpbmcgdG8gYmUgYmFzZTY0IGVuY29kZWQ=',
              approximateArrivalTimestamp: 1499672242.6,
            },
          },
        ],
      })
    );
  });

  it('builds S3 events', async () => {
    const logSpy = jest.spyOn(global.console, 'log');
    const ctx = {
      sls: {
        processedInput: {
          options: {
            type: 'aws:s3',
          },
        },
      },
    };
    const that = { serverless: { classes: { Error } } };
    await generate.bind(that)(ctx);
    expect(logSpy).toBeCalledWith(
      JSON.stringify({
        Records: [
          {
            eventVersion: '2.0',
            eventSource: 'aws:s3',
            awsRegion: 'us-east-1',
            eventTime: '2016-09-25T05:15:44.261Z',
            eventName: 'ObjectCreated:Put',
            userIdentity: { principalId: 'AWS:AROAW5CA2KAGZPAWYRL7K:cli' },
            requestParameters: { sourceIPAddress: '222.24.107.21' },
            responseElements: {
              'x-amz-request-id': '00093EEAA5C7G7F2',
              'x-amz-id-2':
                '9tTklyI/OEj4mco12PgsNksgxAV3KePn7WlNSq2rs+LXD3xFG0tlzgvtH8hClZzI963KYJgVnXw=',
            },
            s3: {
              s3SchemaVersion: '1.0',
              configurationId: '151dfa64-d57a-4383-85ac-620bce65f269',
              bucket: {
                name: 'service-1474780369352-1',
                ownerIdentity: { principalId: 'A3QLJ3P3P5QY05' },
                arn: 'arn:aws:s3:::service-1474780369352-1',
              },
              object: {
                key: 'object',
                size: 11,
                eTag: '5eb63bbbe01eetd093cb22bb8f5acdc3',
                sequencer: '0057E75D80IA35C3E0',
              },
            },
          },
        ],
      })
    );
  });

  it('builds Alexa Skill events', async () => {
    const logSpy = jest.spyOn(global.console, 'log');
    const ctx = {
      sls: {
        processedInput: {
          options: {
            type: 'aws:alexaSkill',
            body: '{"session": {"new": false} }',
          },
        },
      },
    };
    const that = { serverless: { classes: { Error } } };
    await generate.bind(that)(ctx);
    expect(logSpy).toBeCalledWith(
      JSON.stringify({
        version: '1.0',
        session: {
          new: false,
          sessionId: 'amzn1.echo-api.session.123123123',
          application: { applicationId: 'amzn1.ask.skill.123' },
          attributes: { key: 'this is an attribute' },
          user: {
            userId: 'amzn1.ask.account.abc',
            accessToken: 'Atza|AAAAAAAA...',
            permissions: { consentToken: 'ZZZZZZZ...' },
          },
        },
        context: {
          System: {
            device: { deviceId: '123456', supportedInterfaces: { AudioPlayer: {} } },
            application: { applicationId: 'amzn1.ask.skill.foobar' },
            user: {
              userId: 'amzn1.ask.account.user_name',
              accessToken: 'Atza|AAAAAAAA...',
              permissions: { consentToken: 'ZZZZZZZ...' },
            },
            apiEndpoint: 'https://api.amazonalexa.com',
            apiAccessToken: 'AxThk...',
          },
          AudioPlayer: {
            playerActivity: 'PLAYING',
            token: 'audioplayer-token',
            offsetInMilliseconds: 0,
          },
        },
        request: {
          type: 'LaunchRequest',
          requestId: '1234-5678-abcd',
          timestamp: '123123',
          locale: 'en-US',
        },
      })
    );
  });

  it('builds Alexa Smart Home events', async () => {
    const logSpy = jest.spyOn(global.console, 'log');
    const ctx = {
      sls: {
        processedInput: {
          options: {
            type: 'aws:alexaSmartHome',
            body: '{"header": {"name": "SwitchOnRequest"} }',
          },
        },
      },
    };
    const that = { serverless: { classes: { Error } } };
    await generate.bind(that)(ctx);
    expect(logSpy).toBeCalledWith(
      JSON.stringify({
        header: { payloadVersion: '1', namespace: 'Control', name: 'SwitchOnRequest' },
        payload: {
          switchControlAction: 'TURN_ON',
          appliance: {
            additionalApplianceDetails: { key2: 'value2', key1: 'value1' },
            applianceId: 'sampleId',
          },
          accessToken: 'sampleAccessToken',
        },
      })
    );
  });

  it('builds Cloud Watch Log events', async () => {
    const body = 'log data to be gzipped then base64 encoded';
    const zippedBody = await new Promise((res, rej) => {
      zlib.gzip(body, (error, result) => {
        if (error) rej(error);
        else res(result);
      });
    });
    const encodedBody = Buffer.from(zippedBody).toString('base64');

    const logSpy = jest.spyOn(global.console, 'log');
    const ctx = {
      sls: {
        processedInput: {
          options: {
            type: 'aws:cloudWatchLog',
            body,
          },
        },
      },
    };
    const that = { serverless: { classes: { Error } } };
    await generate.bind(that)(ctx);
    expect(logSpy).toBeCalledWith(
      JSON.stringify({
        awslogs: {
          data: encodedBody,
        },
      })
    );
  });

  it('builds Cloud Watch events', async () => {
    const logSpy = jest.spyOn(global.console, 'log');
    const ctx = {
      sls: {
        processedInput: {
          options: {
            type: 'aws:cloudWatch',
            body: '{"detail": { "instance-id": "some great instance", "state": "started" } }',
          },
        },
      },
    };
    const that = { serverless: { classes: { Error } } };
    await generate.bind(that)(ctx);
    expect(logSpy).toBeCalledWith(
      JSON.stringify({
        'version': '0',
        'id': '6a7e8feb-b491-4cf7-a9f1-bf3703467718',
        'detail-type': 'EC2 Instance State-change Notification',
        'source': 'aws.ec2',
        'account': '111122223333',
        'time': '2017-12-22T18:43:48Z',
        'region': 'us-west-1',
        'resources': ['arn:aws:ec2:us-west-1:123456789012:instance/ i-1234567890abcdef0'],
        'detail': {
          'instance-id': 'some great instance',
          'state': 'started',
        },
      })
    );
  });

  it('builds IoT events', async () => {
    const logSpy = jest.spyOn(global.console, 'log');
    const ctx = {
      sls: {
        processedInput: {
          options: {
            type: 'aws:iot',
            body: '{"can": "be anything"}',
          },
        },
      },
    };
    const that = { serverless: { classes: { Error } } };
    await generate.bind(that)(ctx);
    expect(logSpy).toBeCalledWith(
      JSON.stringify({
        can: 'be anything',
      })
    );
  });

  it('builds Cognito User Pool events', async () => {
    const logSpy = jest.spyOn(global.console, 'log');
    const ctx = {
      sls: {
        processedInput: {
          options: {
            type: 'aws:cognitoUserPool',
            body:
              '{"userName": "Aaron Stuyvenberg", "request": {"userAttributes": {"foo": "bar"}}}',
          },
        },
      },
    };
    const that = { serverless: { classes: { Error } } };
    await generate.bind(that)(ctx);
    expect(logSpy).toBeCalledWith(
      JSON.stringify({
        version: 2,
        triggerSource: 'string',
        region: 'us-east-1',
        userPoolId: 'abcd123',
        userName: 'Aaron Stuyvenberg',
        callerContext: {
          awsSdkVersion: '1',
          clientId: 'abc1234',
        },
        request: {
          userAttributes: {
            someAttr: 'someValue',
            foo: 'bar',
          },
        },
        response: {},
      })
    );
  });

  it('throws errors for invalid events', async () => {
    const ctx = {
      sls: {
        processedInput: {
          options: {
            type: 'none',
            body:
              '{ "Keys": { "Id": { "N": "101" } }, "NewImage": { "Message": { "S": "New item!" }, "Id": { "N": "101"}',
          },
        },
      },
    };
    const that = { serverless: { classes: { Error } } };
    await expect(generate.bind(that)(ctx)).toThrowError;
  });
});
