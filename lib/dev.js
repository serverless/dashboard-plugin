'use strict';

const path = require('path');
const chokidar = require('chokidar');
const { execSync, exec } = require('child_process');
const dependencyTree = require('dependency-tree');
const { ServerlessSDK } = require('@serverless/platform-client');
const { getAccessKeyForTenant } = require('@serverless/platform-sdk');

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
          service: sls.service,
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
  });

  await sdk.publishSync({ event: 'studio.connect' });

  const cleanup = async () => {
    await sdk.publishSync({ event: 'studio.disconnect' });
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

  /**
   * Mapping of (function name) <String> -> <Boolean>
   * to determine if a function is already deploying
   */
  const isFunctionDeploying = {};
  let watchedFilenameToFunctionNameMapping = {};

  /**
   * Capture ctrl+c and remove the stage that we setup
   */
  process.on('SIGINT', cleanup);
  process.on('uncaughtException', cleanup);

  sls.cli.log(`Deploying to stage "${deployToStage}". This may take a few minutes...`);

  execSync(
    `./node_modules/serverless/bin/serverless deploy --stage=${deployToStage} --region=${deployToRegion}`,
    {
      env: {
        ...process.env,
        SLS_DEV_MODE: true,
      },
      stdio: 'inherit',
    }
  );

  const getServerlessInfo = () => {
    const watchedFilenameToFunctionName = {};
    const functionHandlers = [];

    /**
     * Issue the --info variant of this command to get a parsed JSON output
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
      await sdk.publishSync({
        event: 'studio.state',
        data: output,
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
    /**
     * TODO - can this setTimeout be removed?
     */
    setTimeout(() => {
      rewatchfiles();
    }, 2000);

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

    if (isFunctionDeploying[functionName]) {
      return;
    }

    sls.cli.log(`Function "${functionName}" changed. Redeploying...`);

    isFunctionDeploying[functionName] = true;

    /**
     * Redeploy the function
     */
    const deployCmd = exec(
      `./node_modules/serverless/bin/serverless deploy function --function ${functionName} --stage ${deployToStage}`,
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
