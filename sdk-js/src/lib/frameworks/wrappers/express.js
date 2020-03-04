'use strict';

const requireHook = require('require-in-the-middle');

module.exports.init = (sdk, config) => {
  requireHook(['express'], express => {
    try {
      const Route = express.Route;
      const defaultImplementation = Route.prototype.dispatch;
      Route.prototype.dispatch = function handle(req, res, next) {
        try {
          sdk._setEndpoint(req.route ? req.route.path : req.path);
        } catch (err) {
          if (config && config.debug === true) {
            console.debug('error setting endpoint with express route', err);
          }
        } finally {
          defaultImplementation.call(this, req, res, next);
        }
      };
    } catch (err) {
      if (config && config.debug === true) {
        console.debug('error setting up express hook', err);
      }
    }
    return express;
  });
};
