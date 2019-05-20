import eventType from './sns'

const event = {
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
        Subject: 'This is a test subject'
      }
    }
  ]
}

describe('sns', () => {
  it('identifies sns', () => {
    expect(eventType(event)).toEqual('sns')
  })

  it('does not identify an empty object', () => {
    expect(eventType({})).toEqual(false)
  })
})
