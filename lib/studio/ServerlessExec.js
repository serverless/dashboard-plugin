'use strict';
const path = require('path');
const fs = require('fs');

const slsCommand = 'serverless';

const spawn = require('child-process-ext/spawn');

const dependencyTree = require('dependency-tree');

const execOptions = {
  env: {
    ...process.env,
    SLS_DEV_MODE: true,
  },
  cwd: process.cwd(),
  stdio: 'inherit',
};

class ServerlessExec {
  constructor(stage, region) {
    this.deployToStage = stage;
    this.deployToRegion = region;
    this.functionToFilenames = {};
  }

  async info() {
    const filenameToFunctions = {};
    const trackedFiles = [];

    /**
     * Issue the --info variant of this command to get a parsed JSON output
     * of the serverless.yml to determine HTTP endpoints
     */
    const { stdoutBuffer } = await spawn(slsCommand, [
      'studio',
      '--info',
      `--stage=${this.deployToStage}`,
      `--region=${this.deployToRegion}`,
    ]);

    let output = {};

    try {
      output = JSON.parse(stdoutBuffer.toString());
    } catch (e) {
      /**
       * If you ctrl+c during "serverless dev --info" to extract parsed
       * yml information and HTTP endpoints, this will blow up. For now,
       * just return some empty state objects so we can exit cleanly
       * without an error.
       */
      return {
        filenameToFunctions,
        trackedFiles,
        output,
        functions: [],
      };
    }

    const { functions } = output;

    /**
     * Use the handler path to reconstruct the path to the entry module
     */
    Object.keys(functions).forEach(functionName => {
      const { dir, name } = path.parse(functions[functionName].handler);

      let extension = '.js';
      let typescriptEnabled = false;

      /**
       * Assume Typescript if there's a tsconfig.json file
       */
      if (fs.existsSync('tsconfig.json')) {
        extension = '.ts';
        typescriptEnabled = true;
      }

      /**
       * Remember, the serverless.yml handler does not include an extension,
       * so we need to add it here.
       */
      const handlerEntry = `${path.join(dir, name)}${extension}`;

      /**
       * Determine modules required by the entry point of the handler
       */
      const list = dependencyTree.toList({
        filename: handlerEntry,
        directory: process.cwd(),
        tsConfig: typescriptEnabled ? './tsconfig.json' : undefined,

        /**
         * Don't try to watch files in node_modules
         */
        filter: filename => filename.indexOf('node_modules') === -1,
      });

      /**
       * Store all files that make up this function
       */
      this.functionToFilenames[functionName] = list;

      /**
       * For convenience, map all watched modules to function(s)
       */
      list.forEach(watchedFilename => {
        /**
         * Functions already mapped to this file
         */
        const funcs = filenameToFunctions[watchedFilename] || [];

        filenameToFunctions[watchedFilename] = new Set([...funcs, functionName]);
      });

      trackedFiles.push(...list);
    });

    return {
      filenameToFunctions,
      trackedFiles,
      output,
      functions,
    };
  }

  async fetchEndpoints() {
    let endpoints = [];

    /**
     * Close your eyes.
     *
     * Call 'serverless info' here to get the endpoints and pull them out of the output, if there are any.
     */
    let stdoutBuffer;
    try {
      ({ stdoutBuffer } = await spawn(slsCommand, [
        'info',
        `--stage=${this.deployToStage}`,
        `--region=${this.deployToRegion}`,
      ]));
    } catch (error) {
      /**
       * If we fail, it's probably because this this stage is not
       * yet deployed.
       */
      return endpoints;
    }
    try {
      endpoints = stdoutBuffer
        .toString()
        .match(/(ANY|GET|POST|PUT|PATCH|HEAD|OPTIONS|DELETE) - (.*)/g)
        .map(stringEndpoint => {
          const [method, endpoint] = stringEndpoint.split(' - ');

          return {
            method,
            endpoint,
          };
        });
    } catch (e) {
      console.error('ERROR parsing "serverless info"'); // eslint-disable-line no-console
    }
    return endpoints;
  }

  async deploy(functionName) {
    const deployArgs = [
      'deploy',
      `--stage=${this.deployToStage}`,
      `--region=${this.deployToRegion}`,
    ];
    if (functionName) {
      deployArgs.splice(1, 0, 'function', `--function=${functionName}`);
    }
    await spawn(slsCommand, deployArgs, execOptions);
  }

  async remove() {
    await spawn(
      slsCommand,
      ['remove', `--stage=${this.deployToStage}`, `--region=${this.deployToRegion}`],
      execOptions
    );
  }

  async invoke(invokeStudioEvent) {
    const { functionName, payload } = invokeStudioEvent;

    await spawn(
      slsCommand,
      [
        'invoke',
        `--stage=${this.deployToStage}`,
        `--region=${this.deployToRegion}`,
        `--function=${functionName}`,
        `--data=${payload.body}`,
      ],
      execOptions
    );
  }
}

module.exports = ServerlessExec;
