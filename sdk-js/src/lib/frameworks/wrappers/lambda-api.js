/* eslint-disable no-underscore-dangle */
'use strict';

const requireHook = require('require-in-the-middle');

module.exports.init = (sdk, config) => {
  requireHook(['lambda-api'], (lambdaApi) => {
    return function (args) {
      const api = lambdaApi(args);
      try {
        const strip = (path) => {
          if (api._base) {
            return path.slice(api._base.length + 1 /* leading '/' */);
          }
          return path;
        };

        const wrapped = api.finally;
        api.finally = function (handler) {
          wrapped.call(this, (req, res) => {
            try {
              sdk._setEndpoint({
                endpoint: req.route || strip(req.path),
                httpMethod: req.method,
                httpStatusCode: res._statusCode,
                metadata: { mechanism: 'lambda-api-middleware' },
              });
            } catch (err) {
              if (config && config.debug) {
                console.debug('error setting endpoint with lambda-api route', err);
              }
            } finally {
              handler(req, res);
            }
          });
        };
        api.finally(() => {});
      } catch (err) {
        if (config && config.debug) {
          console.debug('error instrumenting lambda-api middleware', err);
        }
      }
      return api;
    };
  });
};
