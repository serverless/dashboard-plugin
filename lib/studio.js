'use strict';

const path = require('path');
const chokidar = require('chokidar');
const { isEqual } = require('lodash');
const { getPlatformClientWithAccessKey } = require('./clientUtils');

const isAuthenticated = require('./isAuthenticated');
const throwAuthError = require('./throwAuthError');

// Studio components
const Studio = require('./studio/Studio');
const ServerlessExec = require('./studio/ServerlessExec');

/**
 * All serverless configuration file variants will be watched. Note that the absolute
 * path for this files is computed, since that is how chokidar is configured to watch
 * these files.
 */
const possibleServerlessConfigFileVariants = [
  'serverless.yml',
  'serverless.yaml',
  'serverless.json',
  'serverless.js',
].map((configFile) => path.resolve(configFile));

// TODO: Remove 'studio' command with next major
module.exports = async function (ctx) {
  const {
    sls: {
      service: { app, org },
      classes: { Error: ServerlessError },
    },
  } = ctx;
  const { sls } = ctx;

  if (!isAuthenticated()) {
    throwAuthError(sls);
  }

  if (!org) throw new ServerlessError('Missing `org` setting', 'DASHBOARD_MISSING_ORG');
  if (!app) throw new ServerlessError('Missing `app` setting', 'DASHBOARD_MISSING_APP');

  let deployToStage = ctx.provider.getStage();
  const deployToRegion = ctx.provider.getRegion();

  const { info, autoStage } = sls.processedInput.options;

  /**
   * If specified, automatically pick a random stage, and remove it on exit
   */
  if (autoStage) {
    deployToStage = `${process.env.USER || 'studio'}-${Math.floor(Math.random() * 100000)}`;
  }

  const serverlessExec = new ServerlessExec(deployToStage, deployToRegion);

  /**
   * Informational flag, used by parent watch process
   */
  if (info) {
    const endpoints = await serverlessExec.fetchEndpoints();

    /**
     * Communicate relevant configuration settings to the parent process (sls studio):
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
          service: sls.service.service,
          region: deployToRegion,
          stage: deployToStage,
        },
        functions: sls.service.functions,
        resources: sls.service.resources,
        endpoints,
      })
    );

    return;
  }

  sls.cli.log('Starting Serverless Studio...');
  sls.logDeprecation('STUDIO_COMMAND', '"studio" command will be removed with next major release');

  /**
   * As a pseudo-failsafe, don't support the prod stage to limit WebSocket traffic
   */
  if (deployToStage === 'prod') {
    sls.cli.log("Stage 'prod' cannot be used with 'serverless studio'");
    return;
  }

  const sdk = await getPlatformClientWithAccessKey(sls.service.org);
  sdk.config({ platformStage: process.env.SERVERLESS_PLATFORM_STAGE || 'prod' });

  const studio = new Studio({ sdk, sls, serverlessExec });

  /**
   * Connect to the WebSocket
   */
  await studio.connect();

  await sdk.events.publish({ event: 'studio.connect', data: { clientType: 'cli' } });

  if (autoStage) {
    sls.cli.log(`Auto stage generation enabled. Will deploy to stage: "${deployToStage}"...`);
    sls.cli.log(`Note: exiting Studio will remove stage "${deployToStage}"...`);
  }

  const disconnect = async () => {
    if (sdk.isConnected()) {
      await sdk.events.publish({ event: 'studio.disconnect', data: { clientType: 'cli' } });
      await sdk.disconnect();

      process.stdout.write('\n');
      sls.cli.log('Disconnected from the Serverless Platform');
    }
  };

  const cleanup = async () => {
    await disconnect();

    /**
     * Tear down the stage if in "auto-stage" mode
     */
    if (autoStage) {
      process.stdout.write('\n');
      sls.cli.log(`Cleaning up stage "${deployToStage}"...`);
      await serverlessExec.remove();
    }
  };

  let filenameToFunctionsMapping = {};

  /**
   * Capture ctrl+c and remove the stage that we setup
   */
  process.on('SIGINT', async () => {
    await cleanup();
    process.exit();
  });
  process.on('uncaughtException', disconnect);
  process.on('exit', cleanup);

  /**
   * Communicate initial state of the serverless.yml
   */
  sls.cli.log('Sending initial app state...');

  await studio.refreshAppState();
  await studio.publishAppState({
    isDeploying: true,
  });

  /**
   * Deploy the serverless.yml file
   */
  await studio.deploy();

  /**
   * Compute new watch files. Only rewatch new files if parsing the serverless.yml file is successfull.
   */
  const rewatchFiles = async () => {
    /**
     * Compute new watch files. Only rewatch new files if parsing the serverless.yml file is successfull.
     */
    const { filenameToFunctions, trackedFiles } = await serverlessExec.info();

    filenameToFunctionsMapping = filenameToFunctions;

    /**
     * Remove all paths
     */
    await watcher.unwatch('*');

    /**
     * Re-watch new files
     */
    watcher.add([...possibleServerlessConfigFileVariants, ...trackedFiles]);
  };

  /**
   * Create a new watcher. By default don't watch anything. The serverless.yml file
   * will be parsed for function handlers. Those handlers will have their dependency
   * trees mapped, and those files will be added dynamically by `rewatchFiles()`
   */
  const watcher = chokidar.watch([], {
    /**
     * Tracked files are absolute, and explicit. By default cwd is the currently working directory,
     * which means the mapping between function and files will be wrong.
     */
    cwd: '/',
  });

  sls.cli.log('Building function dependency watch list...');

  await rewatchFiles();

  sls.cli.log(
    `Tracking ${
      Object.keys(serverlessExec.functionToFilenames).length
    } function handler(s), and their dependencies...`
  );

  watcher.on('ready', () => {
    sls.cli.log('Watching for changes...');
  });

  /**
   * Watch for file changes
   */
  watcher.on('change', async (filepath) => {
    const { isFunctionDeploying } = studio.appState;

    /**
     * Force resolved file path to be absolute.
     */
    const resolvedFilepath = path.normalize(`${path.sep}${filepath}`);

    /**
     * A serverless.ya(m)l file has changed
     */
    if (
      possibleServerlessConfigFileVariants.includes(resolvedFilepath) &&
      !studio.appState.isDeploying
    ) {
      sls.cli.log('serverless configuration changed. Checking for function changes...');

      /**
       * Compare the function (names) in the serverless.yml file
       * with what's already in the app state. We need to redeploy
       * the stack if:
       *
       *  1. A new function has ben added
       *  2. A function has been renamed
       *  3. If you change settings of a function
       */
      const { functions } = await serverlessExec.info();

      if (!isEqual(functions, studio.appState.functions)) {
        sls.cli.log('Detected function configuration changes...');
        sls.cli.log(`Stage "${deployToStage}" will be redeployed to reflect these changes...`);
        await studio.deploy({ isRedeploying: true });
        rewatchFiles();
      } else {
        sls.cli.log('No function changes detected. Continuing...');
      }

      return;
    }

    const functionNames = filenameToFunctionsMapping[resolvedFilepath];

    if (!functionNames) {
      return;
    }

    /**
     * Only deploy a function that is not already deploying
     */
    const functionsNeedingDeploy = [...functionNames].filter(
      (functionName) => !isFunctionDeploying[functionName]
    );

    /**
     * Mark all functions as deploying, and communicate that state
     */
    functionsNeedingDeploy.forEach((functionName) => {
      sls.cli.log(`${functionName}: changed. Redeploying...`);
      isFunctionDeploying[functionName] = true;
    });

    if (functionsNeedingDeploy.length > 0) {
      await studio.publishAppState();
    }

    /**
     * Redeploy all changed functions
     */
    await Promise.all(
      functionsNeedingDeploy.map(async (functionName) => {
        /**
         * Redeploy the function
         */
        try {
          await studio.deploy({ isRedeploying: true, functionName });
        } catch (e) {
          /**
           * This ocassionally fails, although I haven't yet been able
           * to track down why.
           */
        } finally {
          isFunctionDeploying[functionName] = false;
        }
      })
    );

    if (functionsNeedingDeploy.length > 0) {
      await studio.publishAppState();
      sls.cli.log('Watching for changes...');
    }
  });
};
