const BbPromise = require('bluebird');
const fetch = require('node-fetch');
const { getUser, getPlatformHostname } = require('./utils')

module.exports = (ctx) => {
    const user = getUser()
    if (!user) {
      ctx.serverless.cli.log('User not logged in to Platform. Skipping fetch credentials.')
    }
    const body = JSON.stringify({
      stageName: ctx.provider.getStage(),
      command: ctx.sls.processedInput.commands[0],
      app: ctx.sls.service.app,
      service: ctx.sls.service.getServiceName()
    })

    platformHostname = getPlatformHostname()

    return fetch(`${platformHostname}/tenants/${ctx.sls.service.tenant}/credentials/keys`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `bearer ${user.idToken}`
      }
    })
    .then(checkStatus)
    .then(res => res.json())
    .then(json => {
      process.env.AWS_ACCESS_KEY_ID = json.accessKeyId;
      process.env.AWS_SECRET_ACCESS_KEY = json.secretAccessKey;
      process.env.AWS_SESSION_TOKEN = json.sessionToken;
      ctx.sls.cli.log('Cloud credentials set from Serverless Platform.')
      return BbPromise.resolve();
    })
    .catch(err => {
      ctx.sls.cli.log('Could not retrieve credentials from Serverless Platform.')
    })

  }

function checkStatus(res) {
  if (res.ok) { // res.status >= 200 && res.status < 300
    return res;
  } else {
    throw new Error(res)
  }
}