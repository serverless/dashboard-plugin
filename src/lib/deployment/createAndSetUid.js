import uuid from 'uuid'

const createAndSetDeploymentUid = (ctx) => {
  ctx.deploymentUid = uuid.v4()
}

export default createAndSetDeploymentUid
