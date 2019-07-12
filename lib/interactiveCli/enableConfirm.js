'use strict';

const { memoize } = require('lodash');

module.exports = memoize(async inquirer => {
  process.stdout.write(
    'You can monitor, troubleshoot, and test your new service with a free Serverless account.\n\n'
  );
  return inquirer
    .prompt({
      message: 'Would you like to enable this?',
      type: 'confirm',
      name: 'isConfirmed',
    })
    .then(({ isConfirmed }) => {
      if (!isConfirmed) {
        process.stdout.write(
          'You can run the “serverless” command again if you change your mind later.\n'
        );
      }
      process.stdout.write('\n');
      return isConfirmed;
    });
});
