import { readdir, readFile } from 'fs-extra'
import yml from 'yamljs'
import path from 'path'
import { get, fromPairs, cloneDeep, omit } from 'lodash'
import { getAccessKeyForTenant, getSafeguards, urls } from '@serverless/platform-sdk'

const shieldEmoji = '\uD83D\uDEE1\uFE0F '
const lockEmoji = '\uD83D\uDD12'
const warningEmoji = '\u26A0\uFE0F'
const xEmoji = '\u274C'
const emDash = '\u2014'

// NOTE: not using path.join because it strips off the leading
export const loadPolicy = (policyPath, safeguardName) =>
  require(`${policyPath || `.${path.sep}policies`}${path.sep}${safeguardName}`)

async function runPolicies(ctx) {
  const basePath = ctx.sls.config.servicePath

  const location = get(ctx.sls.service, 'custom.safeguards.location', '.')
  const localPoliciesPath = path.relative(__dirname, path.resolve(basePath, location))
  // using || [] instead of _.get's default bc if it's falsey we want it to be []
  const localPolicies = get(ctx.sls.service, 'custom.safeguards.policies', []).map((policy) => {
    let safeguardName = policy
    let safeguardConfig = {}
    if (policy instanceof Object) {
      const policyObjKeys = Object.keys(policy)
      if (policyObjKeys.length !== 1) {
        throw new Error(
          'Safeguards requires that each item in the policies list be either a string indicating a policy name, or else an object with a single key specifying the policy name with the policy options. One or more items were objects containing multiple keys. Correct these entries and try again.'
        )
      }
      safeguardName = policyObjKeys[0]
      safeguardConfig = policy[safeguardName] || {}
    }
    return {
      safeguardName,
      safeguardConfig,
      policyPath: localPoliciesPath,
      enforcementLevel: 'error',
      title: `Local policy: ${safeguardName}`
    }
  })

  const accessKey = await getAccessKeyForTenant(ctx.sls.service.tenant)
  // const builtinPoliciesPath = `.${path.sep}policies`
  const remotePolicies = await getSafeguards({
    app: ctx.sls.service.app,
    tenant: ctx.sls.service.tenant,
    accessKey
  })
  const policyConfigs = [...localPolicies, ...remotePolicies]

  if (policyConfigs.length === 0) {
    return
  }

  ctx.sls.cli.log(
    `(${shieldEmoji}Safeguards) Loading ${policyConfigs.length} polic${
      policyConfigs.length > 1 ? 'ies' : 'y'
    }...`,
    `Serverless Enterprise`
  )

  const policies = policyConfigs.map((policy) => ({
    ...policy,
    function: loadPolicy(policy.policyPath, policy.safeguardName)
  }))

  const service = {
    compiled: {},
    declaration: cloneDeep(omit(ctx.sls.service, ['serverless'])),
    provider: ctx.provider,
    frameworkVersion: ctx.sls.version
  }

  const artifactsPath = path.join(basePath, '.serverless')
  const artifacts = await readdir(artifactsPath)
  const jsonYamlArtifacts = await Promise.all(
    artifacts
      .filter((filename) => filename.match(/\.(json|yml|yaml)$/i))
      .map(async (filename) => {
        const content = await readFile(path.join(artifactsPath, filename))
        try {
          if (filename.match(/\.json$/i)) {
            return [filename, JSON.parse(content)]
          }
          return [filename, yml.parse(content)]
        } catch (error) {
          ctx.sls.cli.log(
            `(${shieldEmoji}Safeguards) Failed to parse file ${filename} in the artifacts directory.`,
            `Serverless Enterprise`
          )
          throw error
        }
      })
  )
  service.compiled = fromPairs(jsonYamlArtifacts)

  const runningPolicies = policies.map(async (policy) => {
    ctx.sls.cli.log(
      `(${shieldEmoji}Safeguards) Running policy "${policy.title}"...`,
      `Serverless Enterprise`
    )

    const result = {
      approved: false,
      failed: false,
      policy
    }
    const approve = () => {
      result.approved = true
    }
    const fail = (message) => {
      ctx.sls.cli.log(
        `(${shieldEmoji}Safeguards) ${
          policy.enforcementLevel === 'error' ? xEmoji : warningEmoji
        } Policy "${policy.title}" ${
          policy.enforcementLevel === 'error' ? 'raised an error' : 'issued a warning'
        } ${emDash} ${message}
For info on how to resolve this, see: ${policy.function.docs}
Or view this policy on the Serverless Dashboard: ${urls.frontendUrl}safeguards/${policy.policyUid}`,
        `Serverless Enterprise`
      )
      result.failed = true
    }
    const policyHandle = { approve, fail }

    await policy.function(policyHandle, service, policy.safeguardConfig)
    if (!result.approved && !result.failed) {
      ctx.sls.cli.log(
        `(${shieldEmoji}Safeguards) ${warningEmoji} Policy "${
          policy.title
        }" finished running, but did not explicitly approve the deployment. This is likely a problem in the policy itself. If this problem persists, contact the policy author.`,
        `Serverless Enterprise`
      )
    }
    return result
  })

  ctx.state.safeguardsResults = await Promise.all(runningPolicies)
  const markedPolicies = ctx.state.safeguardsResults.filter((res) => !res.approved && res.failed)
  if (markedPolicies.length === 0) {
    ctx.sls.cli.log(
      `(${shieldEmoji}Safeguards) ${lockEmoji} All policies satisfied.`,
      `Serverless Enterprise`
    )
    return
  }

  const summary =
    `(${shieldEmoji}Safeguards) ${markedPolicies.length} polic${
      markedPolicies.length > 1 ? 'ies' : 'y'
    } reported irregular conditions. For details, see the logs above.\n      ` +
    markedPolicies
      .map((res) => {
        if (res.failed) {
          if (res.policy.enforcementLevel == 'error') {
            return `${xEmoji} ${
              res.policy.safeguardName
            }: Requirements not satisfied. Deployment halted.`
          }
          return `${warningEmoji} ${res.policy.safeguardName}: Warned of a non-critical condition.`
        }

        return `\u2049\uFE0F ${
          res.policy.safeguardName
        }: Finished inconclusively. Deployment halted.`
      })
      .join('\n      ')

  if (markedPolicies.every((res) => res.approved || res.policy.enforcementLevel === 'warning')) {
    ctx.sls.cli.log(summary, `Serverless Enterprise`)
    return
  }
  throw new Error(summary)
}

export default runPolicies
