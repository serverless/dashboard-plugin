import eventType from './scheduled'

const event = {
  account: '123456789012',
  region: 'us-east-1',
  detail: {},
  'detail-type': 'Scheduled Event',
  source: 'aws.events',
  time: '1970-01-01T00:00:00Z',
  id: 'cdc73f9d-aea9-11e3-9d5a-835b769c0d9c',
  resources: ['arn:aws:events:us-east-1:123456789012:rule/my-schedule']
}

describe('scheduled', () => {
  it('identifies scheduled', () => {
    expect(eventType(event)).toEqual('scheduled')
  })

  it('does not identify an empty object', () => {
    expect(eventType({})).toEqual(false)
  })
})
