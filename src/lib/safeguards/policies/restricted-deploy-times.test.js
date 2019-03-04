import restrictedDeployTimesPolicy from './restricted-deploy-times'

describe('restrictedDeployTimesPolicy', () => {
  const RealDate = Date
  let policy

  function mockDate(isoDate) {
    global.Date = class extends RealDate {
      constructor() {
        return new RealDate(isoDate)
      }
    }
  }

  beforeEach(() => {
    policy = { approve: jest.fn(), fail: jest.fn() }
  })

  afterEach(() => {
    global.Date = RealDate
  })

  it('allow deployment if no restrictions', () => {
    restrictedDeployTimesPolicy(policy, {})
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('allow blocks deployment on Friday when Friday is blocked', () => {
    mockDate('2019-03-01T01:00:00')
    restrictedDeployTimesPolicy(policy, {}, { blockedWeekdays: ['Friday'] })
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toBeCalledWith('Deploying on fr is not allowed')
  })

  it('allow deployment on Monday when Friday is blocked', () => {
    mockDate('2019-03-04T01:00:00')
    restrictedDeployTimesPolicy(policy, {}, { blockedWeekdays: ['Friday'] })
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('blocks deployment on xmas when it is blocked', () => {
    mockDate('2019-12-25T01:00:00')
    restrictedDeployTimesPolicy(policy, {}, { blockedDates: ['12/25/2019'] })
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toBeCalledWith('Deploying on 12/25/2019 is not allowed')
  })
})
