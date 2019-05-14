import sdk from '@serverless/platform-sdk'
import login from './login'

jest.mock('@serverless/platform-sdk', () => ({
  login: jest
    .fn()
    .mockImplementation((tenant) =>
      tenant === 'signup'
        ? Promise.reject('Complete sign-up before logging in.')
        : Promise.resolve()
    )
}))

describe('login', () => {
  let exit

  beforeEach(() => {
    ;({ exit } = process)
    process.exit = jest.fn()
  })

  afterEach(() => {
    process.exit = exit
    sdk.login.mockClear()
  })

  it('calls sdk login and logs success', async () => {
    const log = jest.fn()
    const ctx = { sls: { service: { tenant: 'tenant', app: 'app' }, cli: { log } } }
    await login(ctx)
    expect(sdk.login).toBeCalledWith('tenant')
    expect(log).toBeCalledWith(
      'You sucessfully logged in to Serverless Enterprise.',
      'Serverless Enterprise'
    )
    expect(process.exit).toBeCalledWith(0)
  })

  it('calls sdk login and logs success and warning if app or tenant mssing', async () => {
    const log = jest.fn()
    const ctx = { sls: { service: {}, cli: { log } } }
    await login(ctx)
    expect(sdk.login).toBeCalledWith(undefined)
    expect(log).toBeCalledWith(
      'You sucessfully logged in to Serverless Enterprise.',
      'Serverless Enterprise'
    )
    expect(log).toBeCalledWith(
      "You don't currently have an app & tenant configured in your serverless config, please add them and log in again.",
      'Serverless Enterprise'
    )
    expect(process.exit).toBeCalledWith(0)
  })

  it('calls logs a gentle error for signup "error"', async () => {
    const log = jest.fn()
    const ctx = { sls: { service: { tenant: 'signup' }, cli: { log } } }
    await login(ctx)
    expect(sdk.login).toBeCalledWith('signup')
    expect(log).toBeCalledWith('Complete sign-up before logging in.', 'Serverless Enterprise')
    expect(process.exit).toBeCalledWith(1)
  })
})
