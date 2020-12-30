'use strict';

const { expect } = require('chai');
const createAndSetDeploymentUid = require('./createAndSetUid');

describe('createAndSetDeploymentUid', () => {
  it('generates a random id and sets it on the contxt', () => {
    const ctx = { sls: { service: { org: 'org' } } };
    createAndSetDeploymentUid(ctx);
    expect(ctx.deploymentUid).to.match(
      /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{11}/
    );
  });
});
