'use strict';

const { expect } = require('chai');
const log = require('./log');

describe('lib/log.test.js', () => {
  it('should expose log methods', async () => {
    expect(typeof log.info).to.equal('function');
    expect(typeof log.debug).to.equal('function');
    expect(typeof log).to.equal('function');
  });
});
