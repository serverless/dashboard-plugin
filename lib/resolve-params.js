'use strict';

const _ = require('lodash');
const memoizee = require('memoizee');
const resolveAuthMode = require('@serverless/utils/auth/resolve-mode');
const apiRequest = require('@serverless/utils/api-request');
const { serviceSlug, instanceSlug } = require('./utils');
const { getPlatformClientWithAccessKey } = require('./client-utils');
const isAuthenticated = require('./is-authenticated');

const mapDashboardParamType = (paramType) => {
  // "paramType" may not be guaranteed for old deprecated params stored on deployment profile
  if (!paramType) return 'dashboardService';

  switch (paramType) {
    case 'services':
      return 'dashboardService';
    case 'instances':
      return 'dashboardServiceStage';
    default:
      throw new Error(`Unexpected param type ${paramType}`);
  }
};

const resolveDashboardParams = memoizee(
  async (data) => {
    const dashboardParams = new Map();
    if (!data || !data.isDashboard) return dashboardParams;
    const { org, app, service, stage, region } = data;
    const sdk = await getPlatformClientWithAccessKey(org);

    const { orgUid } = await sdk.getOrgByName(org);
    const parametersResponse = await sdk.getParamsByOrgServiceInstance(
      orgUid,
      serviceSlug({ app, service }),
      instanceSlug({ app, service, stage, region })
    );

    if (parametersResponse.result && parametersResponse.result.length) {
      for (const { paramName, paramValue, paramType } of parametersResponse.result) {
        dashboardParams.set(paramName, {
          value: paramValue,
          type: mapDashboardParamType(paramType),
        });
      }
    }

    return dashboardParams;
  },
  {
    promise: true,
    normalizer: ([data]) => {
      if (data == null) return null;
      const { isDashboard, org, app, service, stage, region } = data;
      return JSON.stringify({ isDashboard, org, app, service, stage, region });
    },
  }
);

const resolveConsoleParamType = (paramPath) => {
  switch (paramPath.split('/').length) {
    case 3:
      return 'consoleServiceStage';
    case 1:
      return 'consoleService';
    default:
      return null;
  }
};
const resolveConsoleParams = memoizee(
  async (data) => {
    const consoleParams = new Map();
    if (!data || !data.isConsole) return consoleParams;
    const { consoleOrg, service, stage, region } = data;
    const orgId = (await apiRequest(`/api/identity/orgs/name/${consoleOrg}`)).orgId;
    for (const paramData of (
      await apiRequest(`/api/secrets/${orgId}/secrets/resolve`, {
        method: 'POST',
        body: [{ path: `${service}/${stage}/${region}` }],
      })
    ).secrets) {
      if (!paramData.parameter) continue;
      const paramType = resolveConsoleParamType(paramData.path);
      if (!paramType) continue;

      consoleParams.set(paramData.name, {
        value: paramData.parameter.value,
        type: paramType,
      });
    }

    return consoleParams;
  },
  {
    promise: true,
    normalizer: ([data]) => {
      if (data == null) return null;
      const { isConsole, consoleOrg, service, stage, region } = data;
      return JSON.stringify({ isConsole, consoleOrg, service, stage, region });
    },
  }
);

const resolveInput = async function (context) {
  const {
    provider,
    sls: {
      service: { app, org },
      processedInput: { options: cliOptions },
      configurationInput,
    },
  } = context;

  const service = context.sls.service.service || cliOptions.service;
  if (!service) return null;
  const console = _.get(configurationInput, 'console');
  const stage = cliOptions.stage || provider.getStage();
  const region = cliOptions.region || provider.getRegion();
  const isDashboard = org && app && isAuthenticated();
  const consoleOrg = (console && console.org) || org;
  const isConsole = consoleOrg && (await resolveAuthMode());
  return {
    service,
    stage,
    region,
    isDashboard,
    org: isDashboard ? org : null,
    app: isDashboard ? app : null,
    isConsole,
    consoleOrg: isConsole ? consoleOrg : null,
  };
};

module.exports = memoizee(async (context) => {
  const stage = context.provider.getStage();
  const configParams = new Map(
    Object.entries(_.get(context.sls.configurationInput, 'params') || {})
  );

  const resultParams = Object.create(null);

  if (context.sls.processedInput.options.param) {
    const regex = /(?<key>[^=]+)=(?<value>.+)/;
    for (const item of context.sls.processedInput.options.param) {
      const res = item.match(regex);
      if (!res) {
        throw new context.sls.classes.Error(
          `Encountered invalid "--param" CLI option value: "${item}". Supported format: "--param='<key>=<val>'"`,
          'INVALID_CLI_PARAM_FORMAT'
        );
      }
      resultParams[res.groups.key] = { value: res.groups.value.trimEnd(), type: 'cli' };
    }
  }

  for (const [name, value] of Object.entries(configParams.get(stage) || {})) {
    if (value == null) continue;
    if (resultParams[name] != null) continue;
    resultParams[name] = { value, type: 'configServiceStage' };
  }
  const input = await resolveInput(context);

  const consoleParams = await resolveConsoleParams(input);
  for (const [name, meta] of consoleParams) {
    if (meta.type !== 'consoleServiceStage') continue;
    if (resultParams[name] != null) resultParams[name].isOverriden = true;
    else resultParams[name] = meta;
  }

  const dashboardParams = await resolveDashboardParams(input);
  for (const [name, meta] of dashboardParams) {
    if (meta.type !== 'dashboardServiceStage') continue;
    if (resultParams[name] != null) resultParams[name].isOverriden = true;
    else resultParams[name] = meta;
  }

  for (const [name, value] of new Map(Object.entries(configParams.get('default') || {}))) {
    if (value == null) continue;
    if (resultParams[name] != null) continue;
    resultParams[name] = { value, type: 'configService' };
  }

  for (const [name, meta] of consoleParams) {
    if (meta.type !== 'consoleService') continue;
    if (resultParams[name] != null) resultParams[name].isOverriden = true;
    else resultParams[name] = meta;
  }

  for (const [name, meta] of dashboardParams) {
    if (meta.type !== 'dashboardService') continue;
    if (resultParams[name] != null) resultParams[name].isOverriden = true;
    else resultParams[name] = meta;
  }
  return resultParams;
});
