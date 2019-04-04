import generateEvent from './generateEvent'

describe('generating events', () => {
  it('builds http events', async () => {
    const logSpy = jest.spyOn(global.console, 'log')
    const ctx = {
      sls: {
        processedInput: {
          options: {
            type: 'http',
            body: '{"foo": "bar"}'
          }
        }
      }
    }
    const that = { serverless: { classes: { Error } } }
    await generateEvent.bind(that)(ctx)
    expect(logSpy).toBeCalledWith(
      JSON.stringify({
        body: { foo: 'bar' },
        method: 'GET',
        principalId: '',
        stage: 'dev',
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
          'Accept-Language': 'en-us',
          'CloudFront-Forwarded-Proto': 'https',
          'CloudFront-Is-Desktop-Viewer': 'true',
          'CloudFront-Is-Mobile-Viewer': 'false',
          'CloudFront-Is-SmartTV-Viewer': 'false',
          'CloudFront-Is-Tablet-Viewer': 'false',
          'CloudFront-Viewer-Country': 'US',
          Cookie:
            '__gads=ID=d51d609e5753330d:T=1443694116:S=ALNI_MbjWKzLwdEpWZ5wR5WXRI2dtjIpHw; __qca=P0-179798513-1443694132017; _ga=GA1.2.344061584.1441769647',
          Host: 'xxx.execute-api.us-east-1.amazonaws.com',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/601.6.17 (KHTML, like Gecko) Version/9.1.1 Safari/601.6.17',
          Via: '1.1 c8a5bb0e20655459eaam174e5c41443b.cloudfront.net (CloudFront)',
          'X-Amz-Cf-Id': 'z7Ds7oXaY8hgUn7lcedZjoIoxyvnzF6ycVzBdQmhn3QnOPEjJz4BrQ==',
          'X-Forwarded-For': '221.24.103.21, 54.242.148.216',
          'X-Forwarded-Port': '443',
          'X-Forwarded-Proto': 'https'
        },
        query: {},
        path: {},
        identity: {
          cognitoIdentityPoolId: '',
          accountId: '',
          cognitoIdentityId: '',
          caller: '',
          apiKey: '',
          sourceIp: '221.24.103.21',
          cognitoAuthenticationType: '',
          cognitoAuthenticationProvider: '',
          userArn: '',
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/601.6.17 (KHTML, like Gecko) Version/9.1.1 Safari/601.6.17',
          user: ''
        },
        stageVariables: {}
      })
    )
  })

  it('builds SNS events', async () => {
    const logSpy = jest.spyOn(global.console, 'log')
    const ctx = {
      sls: {
        processedInput: {
          options: {
            type: 'sns',
            message: '{"json_string": "with some attrs"}'
          }
        }
      }
    }
    const that = { serverless: { classes: { Error } } }
    await generateEvent.bind(that)(ctx)
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
              Subject: null,
              Message: '{"json_string": "with some attrs"}',
              Timestamp: '2016-09-25T05:37:51.150Z',
              SignatureVersion: '1',
              Signature:
                'V5QL/dhow62Thr9PXYsoHA7bOsDFkLdWZVd8D6LyptA6mrq0Mvldvj/XNtai3VaPp84G3bD2nQbiuwYbYpu9u9uHZ3PFMAxIcugV0dkOGWmYgKxSjPApItIoAgZyeH0HzcXHPEUXXO5dVT987jZ4eelD4hYLqBwgulSsECO9UDCdCS0frexiBHRGoLbWpX+2Nf2AJAL+olEEAAgxfiPEJ6J1ArzfvTFZXdd4XLAbrQe+4OeYD2dw39GBzGXQZemWDKf4d52kk+SwXY1ngaR4UfExQ10lDpKyfBVkSwroaq0pzbWFaxT2xrKIr4sk2s78BsPk0NBi55xA4k1E4tr9Pg==',
              SigningCertUrl:
                'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-b95095beb82e8f6a0e6b3aafc7f4149a.pem',
              UnsubscribeUrl:
                'https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-east-1:123456789:service-1474781718017-1:fdaa4474-f0ff-4777-b1c4-79b96f5a504f',
              MessageAttributes: {}
            }
          }
        ]
      })
    )
  })

  it('builds SQS events', async () => {
    const logSpy = jest.spyOn(global.console, 'log')
    const ctx = {
      sls: {
        processedInput: {
          options: {
            type: 'sqs',
            body: '{"json_string": "with some attrs"}'
          }
        }
      }
    }
    const that = { serverless: { classes: { Error } } }
    await generateEvent.bind(that)(ctx)
    expect(logSpy).toBeCalledWith(
      JSON.stringify({
        Records: [
          {
            messageId: '059f36b4-87a3-44ab-83d2-661975830a7d',
            receiptHandle: 'AQEBwJnKyrHigUMZj6rYigCgxlaS3SLy0a...',
            body: {
              json_string: 'with some attrs'
            },
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1545082649183',
              SenderId: 'AIDAIENQZJOLO23YVJ4VO',
              ApproximateFirstReceiveTimestamp: '1545082649185'
            },
            messageAttributes: {},
            md5OfBody: '098f6bcd4621d373cade4e832627b4f6',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-2:123456789012:my-queue',
            awsRegion: 'us-east-2'
          }
        ]
      })
    )
  })
  it('throws errors for invalid events', async () => {
    const ctx = {
      sls: {
        processedInput: {
          options: {
            type: 'none',
            body: '{"json_string": "with some attrs"}'
          }
        }
      }
    }
    const that = { serverless: { classes: { Error } } }
    await expect(generateEvent.bind(that)(ctx)).toThrowError
  })
})
