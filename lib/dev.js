'use strict';

const path = require('path');
const chokidar = require('chokidar');
const spawn = require('child-process-ext/spawn');
const dependencyTree = require('dependency-tree');
const { ServerlessSDK } = require('@serverless/platform-client');
const { getAccessKeyForTenant } = require('@serverless/platform-sdk');
const { isEqual } = require('lodash');
const findProcess = require('find-process');

/**
 * Pass along env variables, and also SLS_DEV_MODE which will capture logs for Serverless Studio
 */
const execOptions = {
  env: {
    ...process.env,
    SLS_DEV_MODE: true,
  },
  stdio: 'inherit',
};

const slsCommand = 'serverless';

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
    let endpoints = [];

    /**
     * Close your eyes.
     *
     * Call 'serverless info' here to get the endpoints and pull them out of the output, if there are any.
     */
    try {
      const { stdoutBuffer } = await spawn(slsCommand, [
        'info',
        `--stage=${deployToStage}`,
        `--region=${deployToRegion}`,
      ]);

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
      /**
       * If we fail, it's probably because this this stage is not
       * yet deployed.
       */
    }

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

  sls.cli.log('Starting Serverless dev mode...');

  /**
   * As a pseudo-failsafe, don't support the prod stage to limit WebSocket traffic
   */
  if (deployToStage === 'prod') {
    sls.cli.log("Stage 'prod' cannot be used with 'serverless dev'");
    return;
  }

  /**
   * Check to see if 'serverless dev' is already running
   */
  const processes = await findProcess('name', /(serverless|sls) dev/g);

  if (processes.length === 0) {
    sls.cli.log('Failed to detect running serverless process. Exiting.');
    return;
  }

  /**
   * Only one process can be running
   */
  if (processes.length > 1) {
    sls.cli.log("Only one instance of 'serverless dev' can be running");
    return;
  }

  const accessKey = await getAccessKeyForTenant(sls.service.org);

  const sdk = new ServerlessSDK({
    platformStage: process.env.SERVERLESS_PLATFORM_STAGE || 'prod',
    accessKey,
  });

  /**
   * Primary app state. This is communicated back-and-forth over the socket with the web
   * client.
   */
  let appState = {
    /**
     * This is a 'sls deploy' (not a function deploy). It's required
     * for the initial build, and also any changes to the the serverless.yml
     * file
     */
    isDeploying: false,

    /**
     * Mapping of (function name) <String> -> <Boolean>
     * to determine if a function is already deploying
     */
    isFunctionDeploying: {},

    /**
     * These are populated from the 'sls dev --info' output, which
     * is a combination of a parsed serverless.yml, and outputs
     * from 'serverless info' (namely the endpoints)
     */
    functions: {},
    resources: {},
    endpoints: [],
  };

  /**
   * Connect to the WebSocket
   */
  await sdk.connect({
    orgName: sls.service.org,
    onEvent: async ({ event, data }) => {
      const { clientType } = data;

      if (event === 'studio.connect') {
        /**
         * If a web client connects to the socket, then send the appState. Also issue
         * another 'studio.connect' to communicate the the CLI is in watch mode. This
         * will handle a case where the web client refreshes.
         */
        if (clientType === 'web') {
          appState.isWebConnected = true;
          await sdk.publishSync({ event: 'studio.connect', data: { clientType: 'cli' } });
          await updateAppState();
          await publishAppState();
        }

        if (clientType === 'cli') {
          appState.isCliConnected = true;
        }
      }
    },
  });

  sls.cli.log('Connected to the Serverless Platform');

  await sdk.publishSync({ event: 'studio.connect', data: { clientType: 'cli' } });

  const disconnect = async () => {
    if (sdk.isConnected()) {
      await sdk.publishSync({ event: 'studio.disconnect', data: { clientType: 'cli' } });
      await sdk.disconnect();

      process.stdout.write('\n');
      sls.cli.log('Disconnected from the Serverless Platform');
    }
  };

  const cleanup = async () => {
    await disconnect();

    /**
     * Tear down the stage, unless specified otherwise
     */
    if (!persistStage) {
      process.stdout.write('\n');
      sls.cli.log(`Cleaning up stage "${deployToStage}"...`);

      await spawn(
        slsCommand,
        ['remove', `--stage=${deployToStage}`, `--region=${deployToRegion}`],
        execOptions
      );
    }

    process.exit(0);
  };

  let filenameToFunctionsMapping = {};
  const functionToFilenames = {};

  /**
   * Capture ctrl+c and remove the stage that we setup
   */
  process.on('SIGINT', cleanup);
  process.on('uncaughtException', disconnect);
  process.on('exit', cleanup);

  const getServerlessInfo = async () => {
    const filenameToFunctions = {};
    const trackedFiles = [];

    /**
     * Issue the --info variant of this command to get a parsed JSON output
     * of the serverless.yml to determine HTTP endpoints
     */
    const { stdoutBuffer } = await spawn(
      slsCommand,
      ['dev', '--info', `--stage=${deployToStage}`],
      {
        env: process.env,
      }
    );

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
      const handlerEntry = `${path.join(dir, name)}.js`;

      /**
       * Determine modules required by the entry point of the handler
       */
      const list = dependencyTree.toList({
        filename: handlerEntry,
        directory: process.cwd(),

        /**
         * Don't try to watch files in node_modules
         */
        filter: filename => filename.indexOf('node_modules') === -1,
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

  const updateAppState = async () => {
    const { output } = await getServerlessInfo();

    appState = {
      ...appState,
      ...output,
    };
  };

  /**
   * Communicate application state to socket
   */
  const publishAppState = async overrides => {
    await sdk.publishSync({
      event: 'studio.state',
      data: {
        ...appState,
        ...overrides,
      },
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

    await spawn(
      slsCommand,
      ['deploy', `--stage=${deployToStage}`, `--region=${deployToRegion}`],
      execOptions
    );

    appState.isDeploying = false;

    sls.cli.log(`Succesfully deployed stage "${deployToStage}"`);

    await updateAppState();
    await publishAppState();
  };

  /**
   * Communicate initial state of the serverless.yml
   */
  sls.cli.log('Sending initial app state...');

  await updateAppState();
  await publishAppState({
    isDeploying: true,
  });

  /**
   * Deploy the serverless.yml file
   */
  await deploy();

  /**
   * Compute new watch files. Only rewatch new files if parsing the serverless.yml file is successfull.
   */
  const rewatchFiles = async () => {
    /**
     * Compute new watch files. Only rewatch new files if parsing the serverless.yml file is successfull.
     */
    const { filenameToFunctions, trackedFiles } = await getServerlessInfo();

    filenameToFunctionsMapping = filenameToFunctions;

    /**
     * Remove all paths
     */
    await watcher.unwatch('*');

    /**
     * Re-watch new files
     */
    const serverlessYml = path.resolve('serverless.yml');

    watcher.add([serverlessYml, ...trackedFiles]);
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
      Object.keys(functionToFilenames).length
    } function handler(s), and their dependencies...`
  );

  watcher.on('ready', () => {
    sls.cli.log('Watching for changes...');
  });

  /**
   * Watch for file changes
   */
  watcher.on('change', async filepath => {
    const { isFunctionDeploying } = appState;

    if (filepath.endsWith('serverless.yml') && !appState.isDeploying) {
      sls.cli.log('serverless.yml changed. Checking for function changes...');

      /**
       * Compare the function (names) in the serverless.yml file
       * with what's already in the app state. We need to redeploy
       * the stack if:
       *
       *  1. A new function has ben added
       *  2. A function has been renamed
       *  3. If you change settings of a function
       */
      const { functions } = await getServerlessInfo();

      if (!isEqual(functions, appState.functions)) {
        sls.cli.log('Detected function configuration changes...');
        sls.cli.log(`Stage "${deployToStage}" will be redeployed to reflect these changes...`);
        await deploy(true);

        await updateAppState();
        await publishAppState();

        rewatchFiles();
      } else {
        sls.cli.log('No function changes detected. Continuing...');
      }

      return;
    }

    /**
     * Force resolved file path to be absolute.
     */
    const resolvedFilepath = path.normalize(`${path.sep}${filepath}`);
    const functionNames = filenameToFunctionsMapping[resolvedFilepath];

    if (!functionNames) {
      return;
    }

    /**
     * Only deploy a function that is not already deploying
     */
    const functionsNeedingDeploy = [...functionNames].filter(
      functionName => !isFunctionDeploying[functionName]
    );

    /**
     * Mark all functions as deploying, and communicate that state
     */
    functionsNeedingDeploy.forEach(functionName => {
      sls.cli.log(`${functionName}: changed. Redeploying...`);
      isFunctionDeploying[functionName] = true;
    });

    if (functionsNeedingDeploy.length > 0) {
      await publishAppState();
    }

    /**
     * Redeploy all changed functions
     */
    await Promise.all(
      functionsNeedingDeploy.map(async functionName => {
        /**
         * Redeploy the function
         */
        try {
          await spawn(
            slsCommand,
            ['deploy', 'function', `--function=${functionName}`, `--stage=${deployToStage}`],
            execOptions
          );
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
      await publishAppState();
      sls.cli.log('Watching for changes...');
    }
  });
};
