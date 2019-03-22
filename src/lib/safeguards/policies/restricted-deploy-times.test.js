import restrictedDeployTimesPolicy from './restricted-deploy-times'

describe('restrictedDeployTimesPolicy', () => {
  const dateDotNow = Date.now
  let policy

  beforeEach(() => {
    policy = { approve: jest.fn(), fail: jest.fn() }
  })

  afterEach(() => {
    Date.now = dateDotNow
  })

  it('allow deployment if no restrictions', () => {
    restrictedDeployTimesPolicy(policy, {})
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('allow blocks deployment on Friday when Friday is blocked', () => {
    Date.now = jest.fn().mockReturnValue(new Date('2019-03-08T01:00:00').getTime())
    restrictedDeployTimesPolicy(
      policy,
      {},
      { time: '2019-03-01', interval: 'P1W', duration: 'P1D' }
    )
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toBeCalledWith('Deploying on 2019-03-08 is not allowed')
  })

  it('allow deployment on Monday when Friday is blocked', () => {
    Date.now = jest.fn().mockReturnValue(new Date('2019-03-04T01:00:00').getTime())
    restrictedDeployTimesPolicy(
      policy,
      {},
      { time: '2019-03-01', interval: 'P1W', duration: 'P1D' }
    )
    expect(policy.approve).toHaveBeenCalledTimes(1)
    expect(policy.fail).toHaveBeenCalledTimes(0)
  })

  it('blocks deployment on Rosh Hashanah when it is blocked', () => {
    Date.now = jest.fn().mockReturnValue(new Date('2019-10-01T07:00:00').getTime())
    restrictedDeployTimesPolicy(policy, {}, { time: '2019-09-29T19:00:00', duration: 'P2D2H' })
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toBeCalledWith('Deploying on 2019-10-01 is not allowed')
  })

  it('blocks deployment on Christmas when it is blocked', () => {
    Date.now = jest.fn().mockReturnValue(new Date('2019-12-25T01:00:00').getTime())
    restrictedDeployTimesPolicy(
      policy,
      {},
      { time: '2019-12-25', duration: 'P1D', interval: 'P1Y' }
    )
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toBeCalledWith('Deploying on 2019-12-25 is not allowed')
  })

  it('blocks deployment on next Christmas when it is blocked', () => {
    Date.now = jest.fn().mockReturnValue(new Date('2020-12-25T01:00:00').getTime())
    restrictedDeployTimesPolicy(
      policy,
      {},
      { time: '2019-12-25', duration: 'P1D', interval: 'P1Y' }
    )
    expect(policy.approve).toHaveBeenCalledTimes(0)
    expect(policy.fail).toBeCalledWith('Deploying on 2020-12-25 is not allowed')
  })
})
