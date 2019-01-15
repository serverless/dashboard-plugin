import { readdir, readFile } from 'fs-extra'
import yml from 'yamljs'
import path from 'path'
import { fromPairs, cloneDeep, omit } from 'lodash'

const shieldEmoji = '\uD83D\uDEE1\uFE0F '

class PolicyFailureError extends Error {}

export const loadPolicy = (policiesPath, policyName) => {
  try {
    // NOTE: not using path.join because it strips off the leading ./
    return require(`.${path.sep}policies${path.sep}${policyName}`)
  } catch (e) {
    return require(path.join(policiesPath, policyName))
  }
}

async function runPolicies(ctx) {
  const basePath = ctx.sls.config.servicePath

  if (!ctx.sls.service.custom || !ctx.sls.service.custom.safeguards) {
    return
  }

  let config = ctx.sls.service.custom.safeguards

  if (config === true) {
    config = {
      policies: ['require-dlq', 'no-secret-env-vars', 'no-wild-iam-role-statements']
    }
  }

  if (!(config.policies instanceof Array)) {
    throw new Error(
      'Safeguards requires a list of policies under property "custom.safeguards.policies".'
    )
  }

  ctx.sls.cli.log(
    `(${shieldEmoji}Safeguards) Loading ${config.policies.length} polic${
      config.policies.length > 1 ? 'ies' : 'y'
    }.`,
    'Serverless Enterprise'
  )
  const location = config.location || '.'
  const policiesPath = path.relative(__dirname, path.resolve(basePath, location))

  const policies = config.policies.map((policy) => {
    if (policy instanceof Object) {
      const policyObjKeys = Object.keys(policy)
      if (policyObjKeys.length !== 1) {
        throw new Error(
          'Safeguards requires that each item in the policies list be either a string indicating a policy name, or else an object with a single key specifying the policy name with the policy options. One or more items were objects containing multiple keys. Correct these entries and try again.'
        )
      }
      const policyName = policyObjKeys[0]
      const policyOptions = policy[policyName] || {}
      return {
        name: policyName,
        function: loadPolicy(policiesPath, policyName),
        options: policyOptions
      }
    }
    return {
      name: policy,
      function: loadPolicy(policiesPath, policy),
      options: {}
    }
  })

  const service = {
    compiled: {},
    declaration: cloneDeep(omit(ctx.sls.service, ['serverless'])),
    provider: ctx.provider
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
            `Failed to parse file ${filename} in the artifacts directory.`,
            'Serverless Enterprise'
          )
          throw error
        }
      })
  )
  service.compiled = fromPairs(jsonYamlArtifacts)

  const runningPolicies = policies.map(async (policy) => {
    ctx.sls.cli.log(
      `(${shieldEmoji}Safeguards) Running policy "${policy.name}"...`,
      'Serverless Enterprise'
    )

    const result = {
      name: policy.name,
      approved: false,
      warned: false
    }
    const approve = () => {
      result.approved = true
    }
    const warn = (message) => {
      ctx.sls.cli.log(
        `(${shieldEmoji}Safeguards) \u26A0\uFE0F Policy "${
          policy.name
        }" issued a warning \u2014 ${message}`,
        'Serverless Enterprise'
      )
      result.warned = true
    }
    const policyHandle = {
      approve,
      warn,
      Failure: PolicyFailureError
    }

    try {
      await policy.function(policyHandle, service, policy.options)
      if (result.approved) {
        return result
      }
      result.error = new Error(
        `(${shieldEmoji}Safeguards) \u2049\uFE0F Policy "${
          policy.name
        }" finished running, but did not explicitly approve the deployment. This is likely a problem in the policy itself. If this problem persists, contact the policy author.`
      )
      ctx.sls.cli.log(result.error.message, 'Serverless Enterprise')
      return result
    } catch (error) {
      if (error instanceof PolicyFailureError) {
        result.failed = true
        result.error = error
        ctx.sls.cli.log(
          `(${shieldEmoji}Safeguards) \u274C Policy "${
            policy.name
          }" prevented the deployment \u2014 ${error.message}`,
          'Serverless Enterprise'
        )
        return result
      }
      ctx.sls.cli.log(
        `(${shieldEmoji}Safeguards) \u2049\uFE0F There was a problem while processing a configured policy: "${
          policy.name
        }".  If this problem persists, contact the policy author.`,
        'Serverless Enterprise'
      )
      throw error
    }
  })

  const results = await Promise.all(runningPolicies)
  const markedPolicies = results.filter((res) => !res.approved || res.warned)
  if (markedPolicies.length === 0) {
    ctx.sls.cli.log(
      `(${shieldEmoji}Safeguards) \uD83D\uDD12 All policies satisfied.`,
      'Serverless Enterprise'
    )
    return
  }

  const summary =
    `(${shieldEmoji}Safeguards) ${
      markedPolicies.length
    } policies reported irregular conditions. For details, see the logs above.\n      ` +
    markedPolicies
      .map((res) => {
        if (res.failed) {
          return `\u274C ${res.name}: Requirements not satisfied. Deployment halted.`
        }

        if (res.approved && res.warned) {
          return `\u26A0\uFE0F ${res.name}: Warned of a non-critical condition.`
        }

        return `\u2049\uFE0F ${res.name}: Finished inconclusively. Deployment halted.`
      })
      .join('\n      ')

  if (markedPolicies.every((res) => res.approved)) {
    ctx.sls.cli.log(summary, 'Serverless Enterprise')
    return
  }
  throw new Error(summary)
}

export default runPolicies
