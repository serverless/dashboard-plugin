'use strict';

const Transaction = require('./transaction');

describe('Transaction', () => {
  it('counts invocations & tracks cold starts', () => {
    const firstTransaction = new Transaction({
      tenantId: 'tenantId',
      applicationName: 'applicationName',
      appUid: 'appUid',
      tenantUid: 'tenantUid',
      serviceName: 'serviceName',
      stageName: 'stageName',
      computeType: 'computeType',
    });
    expect(firstTransaction.$.schema.compute.isColdStart).toEqual(true);
    expect(firstTransaction.$.schema.compute.instanceInvocationCount).toEqual(1);
    const secondTransaction = new Transaction({
      tenantId: 'tenantId',
      applicationName: 'applicationName',
      appUid: 'appUid',
      tenantUid: 'tenantUid',
      serviceName: 'serviceName',
      stageName: 'stageName',
      computeType: 'computeType',
    });
    expect(secondTransaction.$.schema.compute.isColdStart).toEqual(false);
    expect(secondTransaction.$.schema.compute.instanceInvocationCount).toEqual(2);
  });
});
