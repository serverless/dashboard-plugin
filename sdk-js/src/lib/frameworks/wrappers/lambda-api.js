const requireHook = require('require-in-the-middle');

module.exports.init = (sdk, config) => {
  requireHook(['lambda-api'], lambdaApi => {
    return function(args) {
      const api = lambdaApi(args);
      try {
        api.use((req, res, next) => {
          try {
            sdk._setEndpoint(req.route);
          } catch (err) {
            if (config && config.debug) {
              console.debug('error setting endpoint with lambda-api route', err);
            }
          } finally {
            next();
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
