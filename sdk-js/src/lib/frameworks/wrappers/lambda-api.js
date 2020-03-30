'use strict';

const requireHook = require('require-in-the-middle');

module.exports.init = (sdk, config) => {
  requireHook(['lambda-api'], lambdaApi => {
    return function(args) {
      const api = lambdaApi(args);
      try {
        const strip = path =>
          api._base
            ? path.slice(api._base.length + 1 /* leading '/' */) // eslint-disable-line no-underscore-dangle
            : path;

        api.finally((req, res) => {
          try {
            // eslint-disable-next-line no-underscore-dangle
            sdk._setEndpoint(req.route || strip(req.path), req.method, res._statusCode, {
              mechanism: 'lambda-api-middleware',
            });
          } catch (err) {
            if (config && config.debug) {
              console.debug('error setting endpoint with lambda-api route', err);
            }
          }
        });
      } catch (err) {
        if (config && config.debug) {
          console.debug('error instrumenting lambda-api middleware', err);
        }
      }
      return api;
    };
  });
};
