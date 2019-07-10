'use strict';

module.exports = {
  parseDeploymentData: require('./parse'),
  saveDeployment: require('./save'),
  getServerlessFilePath: require('./getServerlessFilePath'),
  createAndSetDeploymentUid: require('./createAndSetUid'),
};
