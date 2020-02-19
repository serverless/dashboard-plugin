'use strict';

const path = require('path');
const chokidar = require('chokidar');
const { execSync, exec } = require('child_process');
// const readline = require('readline');
const dependencyTree = require('dependency-tree');
const Pusher = require('pusher');

module.exports = async function(ctx) {
  const { sls } = ctx;

  /**
   * Stage used for development. By default, pick a generated stage,
   * unless specified by the user.
   */
  let deployToStage = `${process.env.USER || 'dev'}-${Math.floor(Math.random() * 100000)}`;
  let deployToRegion = 'us-east-1';

  if (sls && sls.processedInput && sls.processedInput.options) {
    const { stage, region, info } = sls.processedInput.options;

    if (stage) {
      deployToStage = stage;
    }

    if (region) {
      deployToRegion = region;
    }

    /**
     * Informational flag, used by parent watch process
     */

    if (info) {
      /**
       * Communicate relevant configuration settings to the parent to:
       *
       *  - General app/org information
       *  - Send new infra/functions to websocket
       *  - Detect new functions to watch
       */
      process.stdout.write(
        JSON.stringify({
          meta: {
            app: sls.service.app,
            org: sls.service.org,
            region: deployToRegion,
            stage: deployToStage,
          },
          functions: sls.service.functions,
          resources: sls.service.resources,
        })
      );

      process.exit(0);
    }
  }

  /**
   * Establish a websocket connection to send metadata
   */
  const pusher = new Pusher({
    appId: '950175',
    key: '5e81e76f73bf0c18f888',
    secret: '2f8c88071c62b1775d1d',
    cluster: 'mt1',
    useTLS: true,
  });

  /**
   * Connect
   */
  await new Promise((resolve, reject) => {
    pusher.trigger(
      'channel-sls-dev',
      'connection',
      {
        online: true,
      },

      err => {
        if (err) {
          return reject(err);
        }

        resolve();
      }
    );
  });

  const cleanup = async () => {
    process.stdout.write('\n');
    sls.cli.log(`Cleaning up stage "${deployToStage}"...`);

    await new Promise((resolve, reject) => {
      pusher.trigger(
        'channel-sls-dev',
        'connection',
        {
          online: false,
        },

        err => {
          if (err) {
            return reject(err);
          }

          resolve();
        }
      );
    });

    /**
     * Tear down the stage
     */
    execSync(`serverless remove --stage=${deployToStage} --region=${deployToRegion}`, {
      stdio: 'inherit',
    });

    process.exit(0);
  };

  /**
   * Mapping of <String> -> <Boolean>
   * to determine if a function is already deploying
   */
  const isFunctionDeploying = {};
  let watchedFilenameToFunctionNameMapping = {};

  /**
   * Capture ctrl+c and remove the stage that we setup
   */
  process.on('SIGINT', cleanup);
  process.on('uncaughtException', cleanup);

  /**
   * Setup the stage. This might take awhile.
   */
  sls.cli.log(`Deploying to stage "${deployToStage}". This may take a few minutes...`);

  /**
   * Hacky approach to parse out API gateways from deploy output
   *
   * endpoints:
   *   GET - https://lv0xn55f8g.execute-api.us-east-1.amazonaws.com/test/convert
   *
   */
  // const rl = readline.createInterface({
  //   output: process.stdout,
  //   terminal: false,
  // });

  // rl.on('line', line => {
  //   const supportedMethods = ['GET'];

  //   const parts = line.trim().split(' - ');

  //   if (!parts || parts.length !== 2) {
  //     return;
  //   }

  //   const [foundMethod, foundEndpoint] = parts;

  //   if (supportedMethods.includes(foundMethod)) {
  //     console.log('found endpoint', foundMethod, foundEndpoint);
  //   }
  // });

  execSync(
    `./node_modules/serverless/bin/serverless deploy --stage=${deployToStage} --region=${deployToRegion}`,
    {
      stdio: 'inherit',
      encoding: 'utf-8',
    }
  );

  const getServerlessInfo = () => {
    const watchedFilenameToFunctionName = {};
    const functionHandlers = [];

    /**
     * Issue --info variant of this command to get a parsed JSON output
     * of the serverless.yml to determine what to watch and re-watch
     *
     * TODO - change this to globally installed serverless bin
     */
    const buffer = execSync(
      `./node_modules/serverless/bin/serverless dev --stage=${deployToStage} --info`
    );

    const output = JSON.parse(buffer.toString());
    const functions = output.functions;

    /**
     * Use the handler path to reconstruct the path to the entry module
     */
    Object.keys(functions).forEach(functionName => {
      const { dir, name } = path.parse(functions[functionName].handler);
      const handlerEntry = `${path.join(dir, name)}.js`;

      /**
       * Determine modules required by the entry point of the handler
       */
      const list = dependencyTree.toList({
        filename: handlerEntry,
        directory: process.cwd(),
      });

      /**
       * For convenience, map all watched modules to a function name
       */
      list.forEach(watchedFilename => {
        watchedFilenameToFunctionName[watchedFilename] = functionName;
      });

      functionHandlers.push(...list);
    });

    return {
      watchedFilenameToFunctionName,
      functionHandlers,
      output,
    };
  };

  const rewatchfiles = async () => {
    try {
      /**
       * Compute new watch files. Only rewatch new files if parsing the serverless.yml file is successfull.
       */
      const { watchedFilenameToFunctionName, functionHandlers, output } = getServerlessInfo();

      /**
       * Communicate application state to socket
       */
      await new Promise((resolve, reject) => {
        pusher.trigger(
          'channel-sls-dev',
          'app-state',
          {
            data: output,
          },

          err => {
            if (err) {
              return reject(err);
            }

            resolve();
          }
        );
      });

      watchedFilenameToFunctionNameMapping = watchedFilenameToFunctionName;

      /**
       * Remove all paths
       */
      watcher.unwatch(functionHandlers);

      /**
       * Rewatch new files
       */
      watcher.add(functionHandlers);
    } catch (e) {
      // Do nothing
    }
  };

  /**
   * Create a new watcher
   */
  const watcher = chokidar.watch('serverless.yml');

  watcher.on('ready', async () => {
    setTimeout(() => {
      rewatchfiles();
    }, 1500);

    sls.cli.log('Watching for changes...');
  });

  /**
   * Watch for file changes
   */
  watcher.on('change', async filepath => {
    const functionName = watchedFilenameToFunctionNameMapping[filepath];

    if (filepath.endsWith('serverless.yml')) {
      sls.cli.log('serverless.yml changed');
      rewatchfiles();
      return;
    }

    if (!functionName) {
      return;
    }

    sls.cli.log(`Function "${functionName}" changed. Redeploying...`);

    /**
     * Function already deploying, bail out.
     */
    if (isFunctionDeploying[functionName]) {
      return;
    }

    isFunctionDeploying[functionName] = true;

    /**
     * Redeploy the function
     */
    const deployCmd = exec(
      `./node_modules/serverless/bin/serverless deploy function --function ${functionName} --stage ${deployToStage}`,
      {
        /**
         * Pass along env variables
         */
        env: process.env,
        stdio: 'inherit',
      }
    );

    deployCmd.on('close', err => {
      isFunctionDeploying[functionName] = false;

      if (err) {
        sls.cli.log(`💥  "${functionName}" failed to deploy`);
        return;
      }

      sls.cli.log(`🚀  Deployed "${functionName}"`);
    });

    deployCmd.on('error', () => {
      sls.cli.log(`💥  "${functionName}" failed to deploy`);
    });
  });
};
