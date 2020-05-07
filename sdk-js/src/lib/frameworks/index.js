'use strict';

const express = require('./wrappers/express');
const lambdaApi = require('./wrappers/lambda-api');

function wrap(wrapper, sdk, config) {
  try {
    wrapper.init(sdk, config);
  } catch (err) {
    if (config && config.debug === true) {
      console.debug('error initializing wrapper', err);
    }
  }
}

module.exports = (sdk, config) => {
  [express, lambdaApi].forEach((wrapper) => wrap(wrapper, sdk, config));
};
