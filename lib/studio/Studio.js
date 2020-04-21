'use strict';

class Studio {
  constructor({ sdk, sls, serverlessExec }) {
    this.sdk = sdk;
    this.serverlessExec = serverlessExec;
    this.sls = sls;
    this.appState = {
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
  }

  async refreshAppState() {
    const { output } = await this.serverlessExec.info();
    this.updateAppState(output);
  }

  updateAppState(updates = {}) {
    this.appState = {
      ...this.appState,
      ...updates,
    };
  }

  async publishAppState(overrides = {}) {
    await this.sdk.publishSync({
      event: 'studio.state',
      data: {
        ...this.appState,
        ...overrides,
      },
    });
  }

  async connect() {
    await this.sdk.connect({
      orgName: this.sls.service.org,
      onEvent: async ({ event, data }) => {
        const { clientType } = data;

        if (event === 'studio.connect') {
          /**
           * If a web client connects to the socket, then send the appState. Also issue
           * another 'studio.connect' to communicate the the CLI is in watch mode. This
           * will handle a case where the web client refreshes.
           */
          if (clientType === 'web') {
            this.updateAppState({ isWebConnected: true });
            await this.sdk.publishSync({ event: 'studio.connect', data: { clientType: 'cli' } });
            await this.refreshAppState();
            await this.publishAppState();
          }

          if (clientType === 'cli') {
            this.updateAppState({ isCliConnected: true });
          }
        }
      },
    });
    this.sls.cli.log('Connected to the Serverless Platform');
  }

  async deploy({ isRedeploying, functionName } = {}) {
    if (this.appState.isDeploying) {
      return;
    }

    if (!functionName) {
      this.sls.cli.log(
        `${isRedeploying ? 'Re-deploying' : 'Deploying'} to stage "${
          this.serverlessExec.deployToStage
        }". This may take a few minutes...`
      );
    }

    this.updateAppState({ isDeploying: true });
    await this.publishAppState();

    await this.serverlessExec.deploy(functionName);
    this.updateAppState({ isDeploying: false });

    this.sls.cli.log(`Successfully deployed stage "${this.serverlessExec.deployToStage}"`);

    await this.refreshAppState();
    await this.publishAppState();
  }
}

module.exports = Studio;
