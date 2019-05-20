import eventType from './cloudFront'

const event = {
  Records: [
    {
      cf: {
        config: {
          distributionId: 'EDFDVBD6EXAMPLE'
        },
        request: {
          clientIp: '2001:0db8:85a3:0:0:8a2e:0370:7334',
          method: 'GET',
          uri: '/picture.jpg',
          headers: {
            host: [
              {
                key: 'Host',
                value: 'd111111abcdef8.cloudfront.net'
              }
            ],
            'user-agent': [
              {
                key: 'User-Agent',
                value: 'curl/7.51.0'
              }
            ]
          }
        }
      }
    }
  ]
}

describe('cloudFront', () => {
  it('identifies cloudFront', () => {
    expect(eventType(event)).toEqual('cloudFront')
  })

  it('does not identify an empty object', () => {
    expect(eventType({})).toEqual(false)
  })
})
