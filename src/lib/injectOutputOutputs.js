'use strict';

const { entries, values } = require('lodash');

module.exports = async function(ctx) {
  for (const [outputKey, outputValue] of entries(ctx.sls.service.outputs || {})) {
    if (typeof outputValue === 'object') {
      const outputValueKeys = Object.keys(outputValue);
      if (outputValueKeys.includes('Ref') || outputValueKeys.includes('Fn::GetAtt')) {
        ctx.sls.service.provider.compiledCloudFormationTemplate.Outputs[`SFEOutput${outputKey}`] = {
          Description: `SFE output "${outputKey}"`,
          Value: outputValue,
        };
        ctx.sls.service.outputs[outputKey] = `CFN!?SFEOutput${outputKey}`;
      }
    }
  }
};
