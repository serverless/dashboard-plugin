'use strict';

const path = require('path');
const fs = require('fs-extra');

const fileExists = async (filename) => {
  try {
    const stat = await fs.lstat(filename);
    return stat.isFile();
  } catch (error) {
    return false;
  }
};

module.exports = async function getServerlessFilePath(filename, servicePath) {
  if (filename) {
    const filePath = path.join(servicePath, filename);
    const customExists = await fileExists(filePath);
    if (!customExists) {
      throw new Error('Could not find serverless service definition file.');
    }
    return filePath;
  }

  const ymlFilePath = path.join(servicePath, 'serverless.yml');
  const yamlFilePath = path.join(servicePath, 'serverless.yaml');
  const jsonFilePath = path.join(servicePath, 'serverless.json');
  const jsFilePath = path.join(servicePath, 'serverless.js');
  const tsFilePath = path.join(servicePath, 'serverless.ts');

  const [json, yml, yaml, js, ts] = await Promise.all([
    fileExists(jsonFilePath),
    fileExists(ymlFilePath),
    fileExists(yamlFilePath),
    fileExists(jsFilePath),
    fileExists(tsFilePath),
  ]);
  if (yml) {
    return ymlFilePath;
  } else if (yaml) {
    return yamlFilePath;
  } else if (json) {
    return jsonFilePath;
  } else if (js) {
    return jsFilePath;
  } else if (ts) {
    return tsFilePath;
  }
  throw new Error('Could not find any serverless service definition file.');
};
