'use strict';

const requireHook = require('require-in-the-middle');

module.exports.init = (sdk, config) => {
  requireHook(['express'], express => {
    // patch request route dispatch
    try {
      const Route = express.Route;
      const defaultImplementation = Route.prototype.dispatch;
      Route.prototype.dispatch = function handle(req, res, next) {
        try {
          // eslint-disable-next-line no-underscore-dangle
          sdk._setEndpoint(req.route ? req.route.path : req.path, req.method, null, {
            mechanism: 'express-middleware',
          });
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
        console.debug('error setting up express route dispatch hook', err);
      }
    }

    // set up response code proxy
    return function() {
      const app = express();
      try {
        const statusHandler = {
          set: function(obj, property, value) {
            try {
              if (property === 'statusCode') {
                sdk._setEndpoint(null, null, value, { mechanism: 'express-middleware' });
              }
            } catch (err) {
              if (config && config.debug === true) {
                console.debug('error setting express status code', err);
              }
            } finally {
              obj[property] = value;
              return true;
            }
          },
        };
        app.response = new Proxy(app.response, statusHandler);
      } catch (err) {
        if (config && config.debug === true) {
          console.debug('error setting up express response status code proxy', err);
        }
      }
      return app;
    };
  });
};
