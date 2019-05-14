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
  })

  it('calls sdk login and logs success', async () => {
    const log = jest.fn()
    const ctx = { sls: { service: { tenant: 'tenant' }, cli: { log } } }
    await login(ctx)
    expect(sdk.login).toBeCalledWith('tenant')
    expect(log).toBeCalledWith(
      'You sucessfully logged in to Serverless Enterprise.',
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
