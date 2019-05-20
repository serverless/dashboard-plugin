import eventType from './s3'

const event = {
  Records: [
    {
      eventVersion: '2.0',
      eventSource: 'aws:s3',
      awsRegion: 'us-east-1',
      eventTime: '1970-01-01T00:00:00.000Z',
      eventName: 'event-type',
      userIdentity: {
        principalId: 'Amazon-customer-ID-of-the-user-who-caused-the-event'
      },
      requestParameters: {
        sourceIPAddress: 'ip-address-where-request-came-from'
      },
      responseElements: {
        'x-amz-request-id': 'Amazon S3 generated request ID',
        'x-amz-id-2': 'Amazon S3 host that processed the request'
      },
      s3: {
        s3SchemaVersion: '1.0',
        configurationId: 'ID found in the bucket notification configuration',
        bucket: {
          name: 'bucket-name',
          ownerIdentity: {
            principalId: 'Amazon-customer-ID-of-the-bucket-owner'
          },
          arn: 'bucket-ARN'
        },
        object: {
          key: 'object-key',
          size: 10,
          eTag: 'object eTag',
          versionId: 'object version if bucket is versioning-enabled, otherwise null',
          sequencer:
            'a string representation of a hexadecimal value used to determine event sequence, only used with PUTs and DELETEs'
        }
      }
    }
  ]
}

describe('s3', () => {
  it('identifies s3', () => {
    expect(eventType(event)).toEqual('s3')
  })

  it('does not identify an empty object', () => {
    expect(eventType({})).toEqual(false)
  })
})
