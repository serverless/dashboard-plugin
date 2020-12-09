'use strict';

const { expect } = require('chai');
const detectEventType = require('./');

const alexaSkill = {
  session: {
    new: true,
    sessionId: 'amzn1.echo-api.session.[unique-value-here]',
    attributes: {
      key: 'string value',
      correctAnswerText: 'Donner',
      speechOutput:
        "Question 1. What was Rudolph's father's name? 1. Blixen. 2. Comet. 3. Donner. 4. Dasher. ",
      repromptText:
        "Question 1. What was Rudolph's father's name? 1. Blixen. 2. Comet. 3. Donner. 4. Dasher. ",
      correctAnswerIndex: 3,
      STATE: '_TRIVIAMODE',
      score: 0,
      questions: [16, 20, 29, 2, 19],
      currentQuestionIndex: 0,
    },
    user: {
      userId: 'amzn1.ask.account.[unique-value-here]',
    },
    application: {
      applicationId: 'amzn1.ask.skill.[unique-value-here]',
    },
  },
  version: '1.0',
  request: {
    locale: 'en-US',
    timestamp: '2016-10-27T18:21:44Z',
    type: 'LaunchRequest',
    requestId: 'amzn1.echo-api.request.[unique-value-here]',
    intent: {
      slots: {
        Item: {
          name: 'Item',
          value: 'snowball',
        },
      },
      name: 'AnswerIntent',
    },
  },
  context: {
    AudioPlayer: {
      playerActivity: 'IDLE',
      token: 'audioplayer-token',
      offsetInMilliseconds: 0,
    },
    System: {
      device: {
        supportedInterfaces: {
          AudioPlayer: {},
        },
      },
      application: {
        applicationId: 'amzn1.ask.skill.[unique-value-here]',
      },
      user: {
        userId: 'amzn1.ask.account.[unique-value-here]',
        accessToken: 'Atza|AAAAAAAA',
        permissions: {
          consentToken: 'ZZZZZZZ',
        },
      },
      apiEndpoint: 'https://api.amazonalexa.com',
      apiAccessToken: 'AxThk',
    },
  },
};

const apiGateway = {
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
  pathParameters: {
    proxy: 'hello',
  },
  requestContext: {
    accountId: '123456789012',
    resourceId: 'us4z18',
    stage: 'test',
    requestId: '41b45ea3-70b5-11e6-b7bd-69b5aaebc7d9',
    identity: {
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
    resourcePath: '/{proxy+}',
    httpMethod: 'GET',
    apiId: 'wt6mne2s9k',
  },
  resource: '/{proxy+}',
  httpMethod: 'GET',
  queryStringParameters: {
    name: 'me',
  },
  stageVariables: {
    stageVarName: 'stageVarValue',
  },
};

const apiGatewayV2 = {
  version: '2.0',
  routeKey: 'ANY /nodejs-apig-function-1G3XMPLZXVXYI',
  rawPath: '/default/nodejs-apig-function-1G3XMPLZXVXYI',
  rawQueryString: '',
  cookies: ['s_fid=7AABXMPL1AFD9BBF-0643XMPL09956DE2', 'regStatus=pre-register'],
  headers: {
    'accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'en-US,en;q=0.9',
    'content-length': '0',
    'host': 'r3pmxmplak.execute-api.us-east-2.amazonaws.com',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'cross-site',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36',
    'x-amzn-trace-id': 'Root=1-5e6722a7-cc56xmpl46db7ae02d4da47e',
    'x-forwarded-for': '205.255.255.176',
    'x-forwarded-port': '443',
    'x-forwarded-proto': 'https',
  },
  requestContext: {
    accountId: '123456789012',
    apiId: 'r3pmxmplak',
    domainName: 'r3pmxmplak.execute-api.us-east-2.amazonaws.com',
    domainPrefix: 'r3pmxmplak',
    http: {
      method: 'GET',
      path: '/default/nodejs-apig-function-1G3XMPLZXVXYI',
      protocol: 'HTTP/1.1',
      sourceIp: '205.255.255.176',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36',
    },
    requestId: 'JKJaXmPLvHcESHA=',
    routeKey: 'ANY /nodejs-apig-function-1G3XMPLZXVXYI',
    stage: 'default',
    time: '10/Mar/2020:05:16:23 +0000',
    timeEpoch: 1583817383220,
  },
  isBase64Encoded: true,
};

const cloudFront = {
  Records: [
    {
      cf: {
        config: {
          distributionId: 'EDFDVBD6EXAMPLE',
        },
        request: {
          clientIp: '2001:0db8:85a3:0:0:8a2e:0370:7334',
          method: 'GET',
          uri: '/picture.jpg',
          headers: {
            'host': [
              {
                key: 'Host',
                value: 'd111111abcdef8.cloudfront.net',
              },
            ],
            'user-agent': [
              {
                key: 'User-Agent',
                value: 'curl/7.51.0',
              },
            ],
          },
        },
      },
    },
  ],
};

const customAuthorizerToken = {
  type: 'TOKEN',
  authorizationToken: 'allow',
  methodArn: 'arn:aws:execute-api:us-west-2:123456789012:ymy8tbxw7b/*/GET/',
};

const customAuthorizerRequest = {
  type: 'REQUEST',
  methodArn: 'arn:aws:execute-api:us-east-1:123456789012:s4x3opwd6i/test/GET/request',
  resource: '/request',
  path: '/request',
  httpMethod: 'GET',
  headers: {
    'X-AMZ-Date': '20170718T062915Z',
    'Accept': '*/*',
    'HeaderAuth1': 'headerValue1',
    'CloudFront-Viewer-Country': 'US',
    'CloudFront-Forwarded-Proto': 'https',
    'CloudFront-Is-Tablet-Viewer': 'false',
    'CloudFront-Is-Mobile-Viewer': 'false',
    'User-Agent': '...',
    'X-Forwarded-Proto': 'https',
    'CloudFront-Is-SmartTV-Viewer': 'false',
    'Host': '....execute-api.us-east-1.amazonaws.com',
    'Accept-Encoding': 'gzip, deflate',
    'X-Forwarded-Port': '443',
    'X-Amzn-Trace-Id': '...',
    'Via': '...cloudfront.net (CloudFront)',
    'X-Amz-Cf-Id': '...',
    'X-Forwarded-For': '..., ...',
    'Postman-Token': '...',
    'cache-control': 'no-cache',
    'CloudFront-Is-Desktop-Viewer': 'true',
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  queryStringParameters: {
    QueryString1: 'queryValue1',
  },
  pathParameters: {},
  stageVariables: {
    StageVar1: 'stageValue1',
  },
  requestContext: {
    path: '/request',
    accountId: '123456789012',
    resourceId: '05c7jb',
    stage: 'test',
    requestId: '...',
    identity: {
      apiKey: '...',
      sourceIp: '...',
    },
    resourcePath: '/request',
    httpMethod: 'GET',
    apiId: 's4x3opwd6i',
  },
};

const firehose = {
  invocationId: 'invoked123',
  deliveryStreamArn: 'aws:lambda:events',
  region: 'us-west-2',
  records: [
    {
      data: 'SGVsbG8gV29ybGQ=',
      recordId: 'record1',
      approximateArrivalTimestamp: 1510772160000,
      kinesisRecordMetadata: {
        shardId: 'shardId-000000000000',
        partitionKey: '4d1ad2b9-24f8-4b9d-a088-76e9947c317a',
        approximateArrivalTimestamp: '2012-04-23T18:25:43.511Z',
        sequenceNumber: '49546986683135544286507457936321625675700192471156785154',
        subsequenceNumber: '',
      },
    },
    {
      data: 'SGVsbG8gV29ybGQ=',
      recordId: 'record2',
      approximateArrivalTimestamp: 151077216000,
      kinesisRecordMetadata: {
        shardId: 'shardId-000000000001',
        partitionKey: '4d1ad2b9-24f8-4b9d-a088-76e9947c318a',
        approximateArrivalTimestamp: '2012-04-23T19:25:43.511Z',
        sequenceNumber: '49546986683135544286507457936321625675700192471156785155',
        subsequenceNumber: '',
      },
    },
  ],
};

const kinesis = {
  Records: [
    {
      eventID: 'shardId-000000000000:49545115243490985018280067714973144582180062593244200961',
      eventVersion: '1.0',
      kinesis: {
        partitionKey: 'partitionKey-3',
        data: 'SGVsbG8sIHRoaXMgaXMgYSB0ZXN0IDEyMy4=',
        kinesisSchemaVersion: '1.0',
        sequenceNumber: '49545115243490985018280067714973144582180062593244200961',
      },
      invokeIdentityArn: 'invoked-by-arn',
      eventName: 'aws:kinesis:record',
      eventSourceARN: 'event-source-arn',
      eventSource: 'aws:kinesis',
      awsRegion: 'us-east-1',
    },
  ],
};

const s3 = {
  Records: [
    {
      eventVersion: '2.0',
      eventSource: 'aws:s3',
      awsRegion: 'us-east-1',
      eventTime: '1970-01-01T00:00:00.000Z',
      eventName: 'event-type',
      userIdentity: {
        principalId: 'Amazon-customer-ID-of-the-user-who-caused-the-event',
      },
      requestParameters: {
        sourceIPAddress: 'ip-address-where-request-came-from',
      },
      responseElements: {
        'x-amz-request-id': 'Amazon S3 generated request ID',
        'x-amz-id-2': 'Amazon S3 host that processed the request',
      },
      s3: {
        s3SchemaVersion: '1.0',
        configurationId: 'ID found in the bucket notification configuration',
        bucket: {
          name: 'bucket-name',
          ownerIdentity: {
            principalId: 'Amazon-customer-ID-of-the-bucket-owner',
          },
          arn: 'bucket-ARN',
        },
        object: {
          key: 'object-key',
          size: 10,
          eTag: 'object eTag',
          versionId: 'object version if bucket is versioning-enabled, otherwise null',
          sequencer:
            'a string representation of a hexadecimal value used to determine event sequence, only used with PUTs and DELETEs',
        },
      },
    },
  ],
};

const scheduled = {
  'account': '123456789012',
  'region': 'us-east-1',
  'detail': {},
  'detail-type': 'Scheduled Event',
  'source': 'aws.events',
  'time': '1970-01-01T00:00:00Z',
  'id': 'cdc73f9d-aea9-11e3-9d5a-835b769c0d9c',
  'resources': ['arn:aws:events:us-east-1:123456789012:rule/my-schedule'],
};

const slsIntegrationLambda = {
  body: {},
  method: 'GET',
  principalId: '1234',
  stage: 'dev',
  cognitoPoolClaims: {
    sub: '',
  },
  enhancedAuthContext: {},
  headers: {
    'Accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-GB,en-US;q=0.8,en;q=0.6,zh-CN;q=0.4',
    'CloudFront-Forwarded-Proto': 'https',
    'CloudFront-Is-Desktop-Viewer': 'true',
    'CloudFront-Is-Mobile-Viewer': 'false',
    'CloudFront-Is-SmartTV-Viewer': 'false',
    'CloudFront-Is-Tablet-Viewer': 'false',
    'CloudFront-Viewer-Country': 'GB',
    'Host': 'ec5ycylws8.execute-api.us-east-1.amazonaws.com',
    'upgrade-insecure-requests': '1',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36',
    'Via': '2.0 f165ce34daf8c0da182681179e863c24.cloudfront.net (CloudFront)',
    'X-Amz-Cf-Id': 'l06CAg2QsrALeQcLAUSxGXbm8lgMoMIhR2AjKa4AiKuaVnnGsOFy5g==',
    'X-Amzn-Trace-Id': 'Root=1-5970ef3e249c0321b2eef14aa513ae',
    'X-Forwarded-For': '94.117.120.169, 116.132.62.73',
    'X-Forwarded-Port': '443',
    'X-Forwarded-Proto': 'https',
  },
  query: {},
  path: {},
  identity: {
    cognitoIdentityPoolId: '',
    accountId: '1234',
    cognitoIdentityId: '',
    caller: '',
    apiKey: '',
    sourceIp: '94.197.120.169',
    accessKey: '',
    cognitoAuthenticationType: '',
    cognitoAuthenticationProvider: '',
    userArn: '',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36',
    user: '',
  },
  stageVariables: {},
};

const sns = {
  Records: [
    {
      EventVersion: '1.0',
      EventSource: 'aws:sns',
      EventSubscriptionArn:
        'arn:aws:sns:us-west-2:123456789000:ses_messages:26a58451-3392-4ab6-a829-d65c2968421a',
      Sns: {
        MessageId: '483eae4c-4fb0-57e5-a5f9-ff9b08612bef',
        Signature:
          'Uy3tn/qAQg/sXARGk2DRddd31ZtyDE+B1IzRla/KA75BaerApJqN+H59q69z8H+pRx0AyUwOD1K0huBYdDRbAMVOUsMgZgdcNjj0gSfFg8uZvTuKaqTaWj4E0hmzoemHENWeuswuq3l6xoPcAJ9fHd2yFhX+792AV++i/8P4EKv/9I4j8Ejs3OxMRN49gkWefKbv4/avyHOdSaFTnXV0rGLmPb103dtjeY4K05PTKvUlPerN+MdRTvHrjApvqDvP0NEVyYBU4zFZQ6GnFcFnHtTk44c3NH/dVi6Gf9VrX8V1id5VSZICYiIG1iaUZ0b676IhRh8znzjMDWaczOBwkA==',
        Type: 'Notification',
        TopicArn: 'arn:aws:sns:us-west-2:123456789000:ses_messages',
        SignatureVersion: '1',
        Timestamp: '2017-07-05T20:01:21.366Z',
        SigningCertUrl:
          'https://sns.us-west-2.amazonaws.com/SimpleNotificationService-b95095beb82e8f6a046b3aafc7f4149a.pem',
        UnsubscribeUrl:
          'https://sns.us-west-2.amazonaws.com/?Action=Unsubscribe&eifjccgihujihfhrchunfnglreichbrcljrnlvtbeked',
        Subject: 'This is a test subject',
      },
    },
  ],
};

const sqs = {
  Records: [
    {
      body: 'Hello from SQS!',
      receiptHandle: 'MessageReceiptHandle',
      md5OfBody: '7b270e59b47ff90a553787216d55d91d',
      eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:MyQueue',
      eventSource: 'aws:sqs',
      awsRegion: 'us-east-1',
      messageId: '19dd0b57-b21e-4ac1-bd88-01bbb068cb78',
      attributes: {
        ApproximateFirstReceiveTimestamp: '1523232000001',
        SenderId: '123456789012',
        ApproximateReceiveCount: '1',
        SentTimestamp: '1523232000000',
      },
      messageAttributes: {},
    },
  ],
};

const hurricanComerceHttp = {
  body: {},
  method: 'GET',
  principalId: 'cd1c462d-682f-4fac-a555-55abe039f00f',
  stage: 'dev2',
  cognitoPoolClaims: { sub: '' },
  enhancedAuthContext: {
    role: 'role-0001',
    organisation: 'b24e02b2-00c0-4527-a773-cfa6683e2445',
    principalId: 'cd1c462d-682f-4fac-a555-55abe039f00f',
    integrationLatency: '38',
    expiry: '2019-09-05T12:45:14.182Z',
    email: 'tom.lee@hurricanecommerce.com',
  },
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9,nl;q=0.8',
    'Authorization':
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRvbS5sZWVAaHVycmljYW5lY29tbWVyY2UuY29tIiwiZmlyc3RuYW1lIjoiVG9tIiwic3VybmFtZSI6IkxlZSIsInJvbGUiOiJyb2xlLTAwMDEiLCJleHBpcnkiOiIyMDE5LTA5LTA1VDEyOjQ1OjE0LjE4MloiLCJvcmdhbmlzYXRpb24iOnsiaWQiOiJiMjRlMDJiMi0wMGMwLTQ1MjctYTc3My1jZmE2NjgzZTI0NDUiLCJuYW1lIjoiSHVycmljYW5lIE1vZHVsYXIgQ29tbWVyY2UifSwiaWF0IjoxNTY3NjAxMTE0LCJhdWQiOiJwbGF5Z3JvdW5kcy5ocnJjbi5pbyIsImlzcyI6ImFwaS5ocnJjbi5pbyIsInN1YiI6ImNkMWM0NjJkLTY4MmYtNGZhYy1hNTU1LTU1YWJlMDM5ZjAwZiJ9.jvBblzv9NnHTcjC_Qk82s8N-BO6UL9p_WAYRJ_MPfKE',
    'CloudFront-Forwarded-Proto': 'https',
    'CloudFront-Is-Desktop-Viewer': 'true',
    'CloudFront-Is-Mobile-Viewer': 'false',
    'CloudFront-Is-SmartTV-Viewer': 'false',
    'CloudFront-Is-Tablet-Viewer': 'false',
    'CloudFront-Viewer-Country': 'JE',
    'content-type': 'application/x-www-form-urlencoded',
    'Host': 'dev-api.hrrcn.io',
    'origin': 'https://admin.hrrcn.dev',
    'Referer': 'https://admin.hrrcn.dev/organisations',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
    'Via': '2.0 8566cb770d0695bb6bffb61a26f5b400.cloudfront.net (CloudFront)',
    'X-Amz-Cf-Id': 'llYYqlg3pcfyCQ3n6KtCJaJD3E2DrRuMDCx49G2IIxnsL6n9FxO8MQ==',
    'X-Amzn-Trace-Id': 'Root=1-5d70fa86-45be9b33522cea17783901b4',
    'X-Forwarded-For': '62.68.188.190, 70.132.20.72',
    'X-Forwarded-Port': '443',
    'X-Forwarded-Proto': 'https',
  },
  query: { activeOnly: 'true', parentOnly: 'true' },
  path: {},
  identity: {
    cognitoIdentityPoolId: '',
    accountId: '',
    cognitoIdentityId: '',
    caller: '',
    sourceIp: '62.68.188.190',
    principalOrgId: '',
    accessKey: '',
    cognitoAuthenticationType: '',
    cognitoAuthenticationProvider: '',
    userArn: '',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
    user: '',
  },
  stageVariables: {},
  requestPath: '/admin/organisations',
};

describe('eventDetection', () => {
  it('identifies alexaSkill', () => {
    expect(detectEventType(alexaSkill)).to.equal('aws.alexaskill');
  });

  it('identifies apiGateway', () => {
    expect(detectEventType(apiGateway)).to.equal('aws.apigateway.http');
  });

  it('identifies api gateway v2', () => {
    expect(detectEventType(apiGatewayV2)).to.equal('aws.apigatewayv2.http');
  });

  it('identifies cloudFront', () => {
    expect(detectEventType(cloudFront)).to.equal('aws.cloudfront');
  });

  it('identifies token custom authorizers', () => {
    expect(detectEventType(customAuthorizerToken)).to.equal('aws.apigateway.authorizer');
  });

  it('identifies request custom authorizers', () => {
    expect(detectEventType(customAuthorizerRequest)).to.equal('aws.apigateway.authorizer');
  });

  it('identifies firehose', () => {
    expect(detectEventType(firehose)).to.equal('aws.firehose');
  });

  it('identifies kinesis', () => {
    expect(detectEventType(kinesis)).to.equal('aws.kinesis');
  });

  it('identifies s3', () => {
    expect(detectEventType(s3)).to.equal('aws.s3');
  });

  it('identifies scheduled', () => {
    expect(detectEventType(scheduled)).to.equal('aws.scheduled');
  });

  xit('identifies slsIntegrationLambda', () => {
    expect(detectEventType(slsIntegrationLambda)).to.equal('aws.apigateway.http');
  });

  it('identifies sns', () => {
    expect(detectEventType(sns)).to.equal('aws.sns');
  });

  it('identifies sqs', () => {
    expect(detectEventType(sqs)).to.equal('aws.sqs');
  });

  it('does not identify an empty object', () => {
    expect(detectEventType({})).to.equal(null);
  });

  it('does not the hurricanComerceHttp payload', () => {
    expect(detectEventType(hurricanComerceHttp)).to.equal(null);
  });
});
