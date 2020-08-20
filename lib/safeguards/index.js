'use strict';

const { readdir, readFile } = require('fs-extra');
const yml = require('yamljs');
const path = require('path');
const { get, fromPairs, cloneDeep, omit } = require('lodash');
const chalk = require('chalk');

// NOTE: not using path.join because it strips off the leading
const loadPolicy = (policyPath, safeguardName) =>
  require(`${policyPath || './policies'}/${safeguardName}`);

async function runPolicies(ctx) {
  const basePath = ctx.sls.config.servicePath;

  if (get(ctx.sls.service, 'custom.safeguards.isDisabled')) return;
  if (
    Array.isArray(ctx.sls.service.plugins) &&
    ctx.sls.service.plugins.includes('@serverless/safeguards-plugin')
  ) {
    return;
  }
  if (ctx.sls.logDeprecation) {
    ctx.sls.logDeprecation(
      'DASHBOARD_SAFEGUARDS',
      [
        'Safeguards support has been moved to the @serverless/safeguards-plugin external plugin and will be removed from the core with next major release.',
        '',
        'Please visit https://github.com/serverless/safeguards-plugin/ to migrate your safeguards to the new plugin.',
        'You may also disable safeguards by setting "custom.enterprise.safeguards.isDisabled: true" in service config',
        '',
      ].join(`\n${' '.repeat('Serverless: '.length)}`)
    );
  }

  const location = get(ctx.sls.service, 'custom.safeguards.location', '.');
  let localPoliciesPath = path.relative(__dirname, path.resolve(basePath, location));
  if (!localPoliciesPath.startsWith('.')) {
    localPoliciesPath = `.${path.sep}${localPoliciesPath}`;
  }
  // using || [] instead of _.get's default bc if it's falsey we want it to be []
  const localPolicies = get(ctx.sls.service, 'custom.safeguards.policies', []).map((policy) => {
    let safeguardName = policy;
    let safeguardConfig = {};
    if (policy instanceof Object) {
      const policyObjKeys = Object.keys(policy);
      if (policyObjKeys.length !== 1) {
        throw new Error(
          'Safeguards requires that each item in the policies list be either a string indicating a policy name, or else an object with a single key specifying the policy name with the policy options. One or more items were objects containing multiple keys. Correct these entries and try again.'
        );
      }
      safeguardName = policyObjKeys[0];
      safeguardConfig = policy[safeguardName] || {};
    }
    return {
      safeguardName,
      safeguardConfig,
      policyPath: localPoliciesPath,
      enforcementLevel: 'error',
      title: `Local policy: ${safeguardName}`,
    };
  });

  const policyConfigs = [
    ...localPolicies,
    ...ctx.safeguards, // fetched during initialize lifeCycle hook in deployment profile
  ];

  if (policyConfigs.length === 0) {
    return;
  }

  ctx.sls.cli.log('Safeguards Processing...');

  const policies = policyConfigs.map((policy) => ({
    ...policy,
    function: loadPolicy(policy.policyPath, policy.safeguardName),
  }));

  const service = {
    compiled: {},
    declaration: cloneDeep(omit(ctx.sls.service, ['serverless'])),
    provider: ctx.provider,
    frameworkVersion: ctx.sls.version,
  };

  const artifactsPath = path.join(basePath, '.serverless');
  const artifacts = await readdir(artifactsPath);
  const jsonYamlArtifacts = await Promise.all(
    artifacts
      .filter((filename) => filename.match(/\.(json|yml|yaml)$/i))
      .map(async (filename) => {
        const content = await readFile(path.join(artifactsPath, filename));
        try {
          if (filename.match(/\.json$/i)) {
            return [filename, JSON.parse(content)];
          }
          return [filename, yml.parse(content)];
        } catch (error) {
          ctx.sls.cli.log(
            `(Safeguards) Failed to parse file ${filename} in the artifacts directory.`
          );
          throw error;
        }
      })
  );

  ctx.sls.cli.log(
    `Safeguards Results:

   Summary --------------------------------------------------
`
  );

  service.compiled = fromPairs(jsonYamlArtifacts);
  const runningPolicies = policies.map(async (policy) => {
    process.stdout.write(`  running - ${policy.title}`);

    const result = {
      approved: false,
      failed: false,
      policy,
    };
    const approve = () => {
      result.approved = true;
      process.stdout.write(`\r   ${chalk.green('passed')} - ${policy.title}\n`);
    };
    const fail = (message) => {
      if (result.failed) {
        result.message += ` ${message}`;
      } else {
        const errorWord = policy.enforcementLevel === 'error' ? 'failed' : 'warned';
        const color = policy.enforcementLevel === 'error' ? chalk.red : chalk.keyword('orange');
        process.stdout.write(`\r   ${color(errorWord)} - ${policy.title}\n`);
        result.failed = true;
        result.message = message;
      }
    };
    const policyHandle = { approve, fail };

    await policy.function(policyHandle, service, policy.safeguardConfig);
    if (!result.approved && !result.failed) {
      ctx.sls.cli.log(
        `Safeguard Policy "${policy.title}" finished running, but did not explicitly approve the deployment. This is likely a problem in the policy itself. If this problem persists, contact the policy author.`
      );
    }
    return result;
  });

  ctx.state.safeguardsResults = await Promise.all(runningPolicies);
  const markedPolicies = ctx.state.safeguardsResults.filter((res) => !res.approved && res.failed);

  const failed = markedPolicies.filter((res) => res.policy.enforcementLevel === 'error').length;
  const warned = markedPolicies.filter((res) => res.policy.enforcementLevel !== 'error').length;
  const passed = ctx.state.safeguardsResults.filter((res) => res.approved && !res.failed).length;
  const summary = `Safeguards Summary: ${chalk.green(`${passed} passed`)}, ${chalk.keyword(
    'orange'
  )(`${warned} warnings`)}, ${chalk.red(`${failed} errors`)}`;

  if (markedPolicies.length !== 0) {
    const resolveMessage = (res) => {
      if (!res.failed) return 'Finished inconclusively. Deployment halted.';
      if (res.policy.enforcementLevel === 'error') return chalk.red(`Failed - ${res.message}`);
      return chalk.keyword('orange')(`Warned - ${res.message}`);
    };
    const details = `\n   ${chalk.yellow(
      'Details --------------------------------------------------'
    )}\n\n${markedPolicies
      .map(
        (res, i) =>
          `   ${i + 1}) ${resolveMessage(res)}
      ${chalk.grey(`details: ${res.policy.function.docs}`)}
      ${res.policy.description}`
      )
      .join('\n\n\n')}`;

    process.stdout.write(`${details}\n\n`);
    if (!markedPolicies.every((res) => res.approved || res.policy.enforcementLevel === 'warning')) {
      ctx.sls.cli.log(summary, '\nServerless');
      throw new Error('Deployment blocked by Serverless Safeguards');
    }
  }
  ctx.sls.cli.log(summary, '\nServerless');
}

module.exports = runPolicies;
module.exports.loadPolicy = loadPolicy;
