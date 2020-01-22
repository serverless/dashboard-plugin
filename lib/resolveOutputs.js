'use strict';

const { getAccessKeyForTenant, getService } = require('@serverless/platform-sdk');

module.exports = async ({ org, app, service, stage, region }) => {
  const serviceData = await getService({
    accessKey: await getAccessKeyForTenant(org),
    tenant: org,
    app,
    service,
  });

  const stageData = serviceData.stagesAndRegions[stage];
  if (!stageData) return {};
  const regionData = stageData[region];
  if (!regionData) return {};
  return regionData.outputs;
};
