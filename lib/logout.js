'use strict';

const accountUtils = require('@serverless/utils/account');
const configUtils = require('@serverless/utils/config');
const log = require('./log');

module.exports = async function ({ isConsole } = {}) {
  const user = configUtils.getLoggedInUser();

  if (!user) {
    log.notice.skip('You are already logged out');
    return;
  }

  accountUtils.logout();
  log.notice.success(
    `You are now logged out of the Serverless ${isConsole ? 'Console' : 'Dashboard'}`
  );
};
