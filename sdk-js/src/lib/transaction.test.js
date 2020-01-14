'use strict';

const { expect } = require('chai');
const Transaction = require('./transaction');

describe('Transaction', () => {
  it('counts invocations & tracks cold starts', () => {
    const firstTransaction = new Transaction({
      orgId: 'orgId',
      applicationName: 'applicationName',
      appUid: 'appUid',
      orgUid: 'orgUid',
      serviceName: 'serviceName',
      stageName: 'stageName',
      computeType: 'computeType',
    });
    expect(firstTransaction.$.schema.compute.isColdStart).to.equal(true);
    expect(firstTransaction.$.schema.compute.instanceInvocationCount).to.equal(1);
    const secondTransaction = new Transaction({
      orgId: 'orgId',
      applicationName: 'applicationName',
      appUid: 'appUid',
      orgUid: 'orgUid',
      serviceName: 'serviceName',
      stageName: 'stageName',
      computeType: 'computeType',
    });
    expect(secondTransaction.$.schema.compute.isColdStart).to.equal(false);
    expect(secondTransaction.$.schema.compute.instanceInvocationCount).to.equal(2);
  });
});
