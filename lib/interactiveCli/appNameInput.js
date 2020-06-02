'use strict';
const isValidAppName = RegExp.prototype.test.bind(/^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/);

const appNameInput = async (inquirer, appNames) =>
  (
    await inquirer.prompt({
      message: 'What do you want to name this application?',
      type: 'input',
      name: 'newAppName',
      validate: (input) => {
        input = input.trim();
        if (!isValidAppName(input)) {
          return (
            'App name is not valid.\n' +
            '   - It should only contain lowercase alphanumeric and hyphens.\n' +
            '   - It should start and end with an alphanumeric character.\n' +
            "   - Shouldn't exceed 128 characters"
          );
        }
        if (appNames.includes(input)) return 'App of this name already exists';
        return true;
      },
    })
  ).newAppName.trim();

module.exports = {
  isValidAppName,
  appNameInput,
};
