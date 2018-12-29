const fetch = require('node-fetch');

// TODO: Fill in once deployed.
const hostname = ''

const getDestination = async (ctx) => {

    const { Account } = await ctx.provider.request('STS', 'getCallerIdentity', {})
    const body = JSON.stringify({
      tenantName: ctx.sls.service.tenant,
      appName: ctx.sls.service.app,
      serviceName: ctx.sls.service.getServiceName(),
      stageName: ctx.provider.getStage(),
      regionName: ctx.provider.getRegion(),
      accountId: Account
    })

    return fetch(`${hostname}/destinations/create`, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': "application/json"
      }
    })
    .then(checkStatus)
    .then(res => res.json())
    .catch(err => {
      ctx.sls.cli.log('Could not get CloudWatch Logs Destination from Serverless Platform.')
    })

  }

const removeDestination = async (ctx) => {

    const body = JSON.stringify({
      tenantName: ctx.sls.service.tenant,
      appName: ctx.sls.service.app,
      serviceName: ctx.sls.service.getServiceName(),
      stageName: ctx.provider.getStage(),
      regionName: ctx.provider.getRegion(),
    })

    return fetch(`${hostname}/destinations/delete`, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': "application/json"
      }
    })
    .then(checkStatus)
    .then(res => res.json())
    .catch(err => {
      // We don't care much that we couldn't delete the destination.
      return 
    })

  }

function checkStatus(res) {
  if (res.ok) { // res.status >= 200 && res.status < 300
    return res;
  } else {
    throw new Error(res)
  }
}

module.exports = {
  getDestination,
  removeDestination
}
