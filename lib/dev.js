'use strict';

const path = require('path');
const chokidar = require('chokidar');
const { execSync, exec } = require('child_process');
const dependencyTree = require('dependency-tree');
const { ServerlessSDK } = require('@serverless/platform-client');
const { getAccessKeyForTenant } = require('@serverless/platform-sdk');
const { isEqual } = require('lodash');

module.exports = async function(ctx) {
  const { sls } = ctx;

  /**
   * Stage used for development. By default, pick a generated stage,
   * unless specified by the user.
   */
  let deployToStage = `${process.env.USER || 'dev'}-${Math.floor(Math.random() * 100000)}`;
  let deployToRegion = 'us-east-1';

  /**
   * If specified, do not remove the stage on exit
   */
  let persistStage = false;

  if (sls && sls.processedInput && sls.processedInput.options) {
    const { stage, region, info, persist } = sls.processedInput.options;

    if (stage) {
      deployToStage = stage;
    }

    if (region) {
      deployToRegion = region;
    }

    if (persist) {
      persistStage = true;
    }

    /**
     * Informational flag, used by parent watch process
     */

    if (info) {
      /**
       * Communicate relevant configuration settings to the parent process (sls dev):
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

  const accessKey = await getAccessKeyForTenant(sls.service.org);

  const sdk = new ServerlessSDK({
    platformStage: process.env.SERVERLESS_PLATFORM_STAGE || 'prod',
    accessKey,
  });

  /**
   * Connect to the websocket
   */
  await sdk.connect({
    orgName: sls.service.org,
    onEvent: async ({ event, data }) => {
      const { clientType } = data;
      /**
       * If a web client connects to the socket, then send the appState. Also issue
       * another 'studio.connect' to communicate the the CLI is in watch mode. This
       * will handle a case where the web client refreshes.
       */
      if (event === 'studio.connect' && clientType === 'web') {
        await sdk.publishSync({ event: 'studio.connect', data: { clientType: 'cli' } });
        updateAppState();
        await publishAppState();
      }
    },
  });

  await sdk.publishSync({ event: 'studio.connect', data: { clientType: 'cli' } });

  const cleanup = async () => {
    await sdk.publishSync({ event: 'studio.disconnect', data: { clientType: 'cli' } });
    await sdk.disconnect();

    /**
     * Tear down the stage, unless specified otherwise
     */
    if (!persistStage) {
      process.stdout.write('\n');
      sls.cli.log(`Cleaning up stage "${deployToStage}"...`);

      execSync(`serverless remove --stage=${deployToStage} --region=${deployToRegion}`, {
        env: {
          ...process.env,
          SLS_DEV_MODE: true,
        },
        stdio: 'inherit',
      });
    }

    process.exit(0);
  };

  let appState = {
    /**
     * This is a 'sls deploy' (not a function deploy). It's required
     * for the initial build, and also any changes to the the serverless.yml
     * file
     */
    isDeploying: true,

    /**
     * Mapping of (function name) <String> -> <Boolean>
     * to determine if a function is already deploying
     */
    isFunctionDeploying: {},

    /**
     * These are populated from the 'sls dev --info' output, which
     * are ultimately from a parsed serverless.yml
     */
    functions: {},
    resources: {},
  };

  let filenameToFunctionsMapping = {};
  const functionToFilenames = {};

  /**
   * Capture ctrl+c and remove the stage that we setup
   */
  process.on('SIGINT', cleanup);
  process.on('uncaughtException', cleanup);

  const getServerlessInfo = () => {
    const filenameToFunctions = {};
    const trackedFiles = [];

    /**
     * Issue the --info variant of this command to get a parsed JSON output
     * of the serverless.yml to determine what to watch and re-watch
     */
    const buffer = execSync(`serverless dev --stage=${deployToStage} --info`, {
      env: process.env,
    });

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
       * Store all files that make up this function
       */
      functionToFilenames[functionName] = list;

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
  };

  const updateAppState = () => {
    const { output } = getServerlessInfo();

    appState = {
      ...appState,
      ...output,
    };
  };

  /**
   * Communicate application state to socket
   */
  const publishAppState = async () => {
    await sdk.publishSync({
      event: 'studio.state',
      data: appState,
    });
  };

  /**
   * Deploy the stack
   */
  const deploy = async isRedeploying => {
    if (appState.isDeploying) {
      return;
    }

    sls.cli.log(
      `${
        isRedeploying ? 'Redeploying' : 'Deploying'
      } to stage "${deployToStage}". This may take a few minutes...`
    );

    appState.isDeploying = true;
    await publishAppState();

    execSync(`serverless deploy --stage=${deployToStage} --region=${deployToRegion}`, {
      env: {
        ...process.env,
        SLS_DEV_MODE: true,
      },
      stdio: 'inherit',
    });

    appState.isDeploying = false;
    await publishAppState();
  };

  /**
   * Communicate initial state of the serverless.yml
   */
  updateAppState();
  await publishAppState();

  /**
   * Deploy the serverless.yml file
   */
  deploy();

  /**
   * Compute new watch files. Only rewatch new files if parsing the serverless.yml file is successfull.
   */
  const rewatchFiles = async () => {
    try {
      /**
       * Compute new watch files. Only rewatch new files if parsing the serverless.yml file is successfull.
       */
      const { filenameToFunctions, trackedFiles } = getServerlessInfo();

      filenameToFunctionsMapping = filenameToFunctions;

      /**
       * Remove all paths
       */
      watcher.unwatch('*');

      /**
       * Re-watch new files
       */
      watcher.add(['serverless.yml', ...trackedFiles]);
    } catch (e) {
      // Do nothing
    }
  };

  /**
   * Create a new watcher
   */
  const watcher = chokidar.watch();

  rewatchFiles();

  sls.cli.log('Watching for changes...');

  /**
   * Watch for file changes
   */
  watcher.on('change', async filepath => {
    const { isFunctionDeploying } = appState;

    if (filepath.endsWith('serverless.yml')) {
      /**
       * Compare the function (names) in the serverless.yml file
       * with what's already in the app state. We need to redeploy
       * the stack if:
       *
       *  1. A new function has ben added
       *  2. A function has been renamed
       *  3. If you change settings of a function
       */
      const { functions } = getServerlessInfo();

      if (!isEqual(functions, appState.functions)) {
        sls.cli.log('serverless.yml changed');
        deploy(true);

        updateAppState();
        await publishAppState();

        rewatchFiles();
      }

      return;
    }

    const functionNames = filenameToFunctionsMapping[filepath];

    if (!functionNames) {
      return;
    }

    /**
     * Redeploy all functions
     */
    functionNames.forEach(functionName => {
      if (isFunctionDeploying[functionName]) {
        return;
      }

      sls.cli.log(`${functionName}: Function changed. Redeploying...`);

      isFunctionDeploying[functionName] = true;

      /**
       * Redeploy the function
       */
      const deployCmd = exec(
        `serverless deploy function --function ${functionName} --stage ${deployToStage}`,
        {
          /**
           * Pass along env variables, and also SLS_DEV_MODE which will capture logs for Serverless Studio
           */
          env: {
            ...process.env,
            SLS_DEV_MODE: true,
          },
          stdio: 'inherit',
        }
      );

      deployCmd.on('close', () => {
        isFunctionDeploying[functionName] = false;
        sls.cli.log(`🚀  ${functionName}: Deployed `);
      });

      deployCmd.on('error', () => {
        sls.cli.log(`💥  ${functionName}: Failed to deploy`);
      });
    });
  });
};
