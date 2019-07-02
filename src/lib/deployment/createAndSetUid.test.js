import createAndSetDeploymentUid from './createAndSetUid'

describe('createAndSetDeploymentUid', () => {
  it('generates a random id and sets it on the contxt', () => {
    const ctx = { sls: { service: { tenant: 'tenant' } } }
    createAndSetDeploymentUid(ctx)
    expect(ctx.deploymentUid).toMatch(
      /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{11}/
    )
  })
})
