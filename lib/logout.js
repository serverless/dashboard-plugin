'use strict';

const accountUtils = require('@serverless/utils/account');
const configUtils = require('@serverless/utils/config');
const { legacy } = require('@serverless/utils/log');
const log = require('./log');

module.exports = async function () {
  const user = configUtils.getLoggedInUser();

  if (!user) {
    legacy.log('You are already logged out');
    log.notice.skip('You are already logged out');
    return;
  }

  accountUtils.logout();
  legacy.log('You successfully logged out of Serverless.');
  log.notice.success('You are now logged out of the Serverless Dashboard');
};
