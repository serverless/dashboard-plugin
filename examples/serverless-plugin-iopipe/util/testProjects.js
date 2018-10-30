/*eslint-disable no-console*/
/*eslint-disable no-process-exit*/
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const spawn = require('cross-spawn');
const argv = require('yargs').argv;

const testDirFiles = fs.readdirSync(path.join(__dirname, '../testProjects'));
const folders = _.chain(testDirFiles)
  .reject(s => s.match(/^\./))
  .reject(s => s === 'util')
  .filter(file => {
    const toInclude = argv.folders || argv.projects;
    if (toInclude) {
      return _.includes(toInclude, file);
    }
    return true;
  })
  .value();

const results = _.flatten(
  folders.map(folder => {
    console.log(`Running tests for ${folder}...`);
    return _.compact([
      !argv.noInstall &&
        spawn.sync('yarn', ['install', '--cwd', `testProjects/${folder}`], {
          stdio: 'inherit'
        }),

      fs.copySync(
        'dist/index.js',
        `testProjects/${folder}/.serverless_plugins/serverless-plugin-iopipe/index.js`
      ),

      !argv.noBuild &&
        spawn.sync('yarn', ['--cwd', `testProjects/${folder}`, 'build'], {
          stdio: 'inherit'
        }),

      spawn.sync(
        'yarn',
        _.compact([
          '--cwd',
          `testProjects/${folder}`,
          'test',
          (argv.u || argv.updateSnapshot) && '--updateSnapshot'
        ]),
        {
          stdio: 'inherit'
        }
      ),
      console.log(`Finished tests for ${folder}.`)
    ]);
  })
);

process.exit(_.max(_.map(results, 'status')) || 0);
