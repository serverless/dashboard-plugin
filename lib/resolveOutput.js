'use strict';

const { getAccessKeyForTenant, getStateVariable } = require('@serverless/platform-sdk');

module.exports = async (outputName, { org, app, service, stage, region }) => {
  return (
    await getStateVariable({
      outputName,
      accessKey: await getAccessKeyForTenant(org),
      tenant: org,
      app,
      service,
      stage,
      region,
    })
  ).value;
};
