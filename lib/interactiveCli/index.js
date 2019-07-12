'use strict';

const register = require('./register');
const setApp = require('./set-app');

module.exports = serverless => {
  if (!serverless.interactiveCli) return null;
  return {
    'after:interactiveCli:setupAws': async () => {
      const registerCheck = await register.check(serverless);
      if (registerCheck) await register.run(serverless, registerCheck);
      const setAppCheck = await setApp.check(serverless);
      if (setAppCheck) await setApp.run(serverless, setAppCheck);
    },
  };
};
