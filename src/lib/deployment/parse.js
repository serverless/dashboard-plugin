'use strict';

/*
 * Save Deployment
 * - This uses the new deployment data model.
 */

const fs = require('fs-extra');
const _ = require('lodash');
const SDK = require('@serverless/platform-sdk');
const getServerlessFilePath = require('./getServerlessFilePath');
const { version: packageJsonVersion } = require('../../../package.json');

/*
 * Parse Deployment Data
 * - Takes data from the Framework and formats it into our data model
 */

const parseDeploymentData = async (ctx, status = 'success', error = null, archived = false) => {
  const { service } = ctx.sls;
  const deployment = new SDK.Deployment();

  const accountId = await ctx.provider.getAccountId();
  const serverlessFileName = await getServerlessFilePath(
    ctx.sls.processedInput.options.config,
    ctx.sls.config.servicePath
  );
  const serverlessFile = (await fs.readFile(serverlessFileName)).toString();
  /*
   * Add deployment data...
   */

  if (!archived) {
    const cfnStack = await ctx.provider.request('CloudFormation', 'describeStacks', {
      StackName: ctx.provider.naming.getStackName(),
    });

    // get log access role info
    const logsRole = _.find(
      cfnStack.Stacks[0].Outputs,
      ({ OutputKey }) => OutputKey === 'EnterpriseLogAccessIamRole'
    );
    const logsRoleArn = logsRole && logsRole.OutputValue;

    deployment.set({
      serverlessFile,
      serverlessFileName,
      versionFramework: ctx.sls.version,
      versionEnterprisePlugin: packageJsonVersion,
      tenantUid: service.tenantUid,
      appUid: service.appUid,
      tenantName: service.tenant,
      appName: service.app,
      serviceName: service.service,
      stageName: ctx.provider.getStage(),
      regionName: ctx.provider.getRegion(),
      deploymentUid: ctx.deploymentUid,
      logsRoleArn,
      archived,
      status,
      provider: {
        type: 'aws',
        aws: { accountId },
        // environment: Object.keys(service.provider.environment || {})
      },
      layers: service.layers || {},
      plugins: service.plugins ? service.plugins.modules || service.plugins : [],
      custom: service.custom || {},
      safeguards: ctx.state.safeguardsResults,
      secrets: Array.from(ctx.state.secretsUsed),
      outputs: service.outputs,
      error,
    });

    /*
     * Add this deployment's functions...
     */

    for (const fnName of Object.keys(service.functions)) {
      const fn = service.functions[fnName];
      const deployedFunctionName =
        fn.name || `${service.service}-${ctx.provider.getStage()}-${fnName}`;
      fn.events = fn.events || [];

      // Function
      deployment.setFunction({
        name: deployedFunctionName,
        description: fn.description || null,
        timeout: fn.timeout,
        type: 'awsLambda',
        arn: `arn:aws:lambda:${ctx.provider.getRegion()}:${accountId}:function:${deployedFunctionName}`,
        custom: {
          handler: fn.handler,
          memorySize: fn.memory,
          runtime: fn.runtime,
          environment: Object.keys(fn.environment || {}),
          role: fn.role,
          onError: fn.onError,
          awsKmsKeyArn: fn.awsKmsKeyArn,
          tags: fn.tags || {},
          vpc: fn.vpc || {},
          layers: fn.layers || [],
          name: fn.name || fnName,
        },
      });

      /*
       * Add this functions's subscriptions...
       */

      for (const sub of fn.events) {
        let subDetails = {};
        let type;
        if (typeof sub === 'string') {
          type = sub;
        } else {
          type = Object.keys(sub)[0];
          if (type === 'http') {
            const apigResource = _.find(
              cfnStack.Stacks[0].Outputs,
              ({ OutputKey }) =>
                !OutputKey.endsWith('Websocket') &&
                OutputKey.match(ctx.provider.naming.getServiceEndpointRegex())
            );
            const apiId =
              apigResource && apigResource.OutputValue.split('https://')[1].split('.')[0];
            subDetails = {
              path: sub.http.path,
              method: sub.http.method,
              cors: sub.http.cors,
              integration: sub.http.integration,
              restApiId: apiId,
            };
          } else if (sub[type] instanceof Object) {
            Object.assign(subDetails, sub[type]);
          } else {
            Object.assign(subDetails, { [type]: sub[type] });
          }
          if (type === 'websocket') {
            const apigResource = _.find(
              cfnStack.Stacks[0].Outputs,
              ({ OutputKey }) =>
                OutputKey.endsWith('Websocket') &&
                OutputKey.match(ctx.provider.naming.getServiceEndpointRegex())
            );
            const apiId = apigResource && apigResource.OutputValue.split('wss://')[1].split('.')[0];
            subDetails.websocketApiId = apiId;
          }
        }

        deployment.setSubscription({ type, function: deployedFunctionName, ...subDetails });
      }
    }
  } else {
    deployment.set({
      versionFramework: ctx.sls.version,
      versionEnterprisePlugin: packageJsonVersion,
      tenantUid: service.tenantUid,
      appUid: service.appUid,
      tenantName: service.tenant,
      appName: service.app,
      serviceName: service.service,
      stageName: ctx.provider.getStage(),
      regionName: ctx.provider.getRegion(),
      archived,
      status,
      secrets: Array.from(ctx.state.secretsUsed),
      error,
    });
  }

  return deployment;
};

module.exports = parseDeploymentData;
