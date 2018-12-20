const path = require('path')
const os = require('os')
const fs = require('fs')

const serverlessrcPath = path.join(os.homedir(), '.serverlessrc')

function upperFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function pickResourceType(template, resourcesType) {
  const resources = []
  for (const key in template.Resources) {
    const resource = template.Resources[key]
    if (resource.Type === resourcesType) {
      resources.push({
        key,
        resource
      })
    }
  }
  return resources
}

function getPlatformHostname() {
  const platformStage = process.env.SERVERLESS_PLATFORM_STAGE || 'prod'
  if (platformStage !== 'prod') {
    return 'https://a0xpn0swpd.execute-api.us-east-1.amazonaws.com/dev/'
  }
  return 'https://jnvhp1any0.execute-api.us-east-1.amazonaws.com/prod/'
}

function hasConfigFile() {
  return fs.existsSync(serverlessrcPath)
}

function getConfig() {
  if (hasConfigFile()) {
    return JSON.parse(fs.readFileSync(serverlessrcPath))
  }
}

function getUser() {
  const config = getConfig()
  const currentId = config.userId
  let user = null
  if (config && config.users && config.users[currentId] && config.users[currentId].dashboard) {
    user = config.users[currentId].dashboard
  }
  if (!user || !user.username || !user.idToken) {
    // user logged out
    return null
  }
  return { idToken: user.idToken, username: user.username }
}

module.exports = {
  upperFirst,
  pickResourceType,
  getPlatformHostname,
  getUser
}
