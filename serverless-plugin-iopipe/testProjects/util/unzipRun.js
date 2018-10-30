/*eslint-disable import/no-extraneous-dependencies*/
/*eslint-disable import/no-dynamic-require*/
import path from 'path';
import fs from 'fs-extra';
import _ from 'lodash';
import AdmZip from 'adm-zip';

function getFilePathAndContents({ dir = __dirname, file = '' }) {
  const filePath = path.join(
    dir,
    '.serverlessUnzipped',
    'iopipe_handlers',
    file
  );
  const contents = fs.readFileSync(filePath, 'utf8');
  return { path: filePath, contents };
}

function cleanup({ dir = __dirname }) {
  const unzippedFolderPath = path.join(dir, '.serverlessUnzipped');
  fs.removeSync(unzippedFolderPath);
}

function unzip({ dir = __dirname, serviceName = 'sls-test' }) {
  const zip = new AdmZip(path.join(dir, `./.serverless/${serviceName}.zip`));
  const unzippedFolderPath = path.join(dir, '.serverlessUnzipped');
  // clear out any previous unzipped dir
  cleanup({ dir });
  zip.extractAllTo(unzippedFolderPath, true);
}

function run({ dir = __dirname, file = '', method: rawMethod }) {
  const method = rawMethod || _.head(file.split('-'));
  const { path: filePath, contents } = getFilePathAndContents({ dir, file });
  expect(contents).toMatchSnapshot();

  const mod = require(filePath);
  return new Promise(succeed => {
    mod[method]({}, { succeed }, succeed);
  });
}

export { cleanup, run, unzip };
