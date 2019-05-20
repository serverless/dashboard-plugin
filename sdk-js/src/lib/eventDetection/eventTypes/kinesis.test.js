const eventType = require('./kinesis')

const event = {
  Records: [
    {
      eventID: 'shardId-000000000000:49545115243490985018280067714973144582180062593244200961',
      eventVersion: '1.0',
      kinesis: {
        partitionKey: 'partitionKey-3',
        data: 'SGVsbG8sIHRoaXMgaXMgYSB0ZXN0IDEyMy4=',
        kinesisSchemaVersion: '1.0',
        sequenceNumber: '49545115243490985018280067714973144582180062593244200961'
      },
      invokeIdentityArn: 'invoked-by-arn',
      eventName: 'aws:kinesis:record',
      eventSourceARN: 'event-source-arn',
      eventSource: 'aws:kinesis',
      awsRegion: 'us-east-1'
    }
  ]
}

describe('kinesis', () => {
  it('identifies kinesis', () => {
    expect(eventType(event)).toEqual('kinesis')
  })

  it('does not identify an empty object', () => {
    expect(eventType({})).toEqual(false)
  })
})
