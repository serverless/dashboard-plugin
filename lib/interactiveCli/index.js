'use strict';

const register = require('./register');

module.exports = serverless => {
  if (!serverless.interactiveCli) return null;
  return {
    'after:interactiveCli:setupAws': async () => {
      if (register.check(serverless)) await register.run(serverless);
    },
  };
};
