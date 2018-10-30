/*eslint-disable max-lines*/
/*eslint-disable quotes*/
import path from 'path';

export default {
  providers: {
    aws: {
      naming: {
        provider: '~providers~aws'
      },
      options: {
        noDeploy: true,
        stage: 'prod',
        region: 'us-west-2',
        token: 'SAMPLE_TOKEN_FOO',
        quote: 'double',
        exclude: ['excluded', 'foo'],
        placeholder: false
      },
      provider: '~providers~aws',
      serverless: '~',
      sdk: {
        util: {
          base64: {},
          buffer: {},
          string: {},
          ini: {},
          fn: {},
          date: {},
          crypto: {
            crc32Table: [0],
            lib: {
              DEFAULT_ENCODING: 'buffer',
              constants: {}
            }
          },
          abort: {},
          uuid: {},
          domain: {
            _stack: [],
            active: null
          },
          url: {},
          querystring: {}
        },
        VERSION: '2.40.0',
        Signers: {},
        Protocol: {
          Json: {},
          Query: {},
          Rest: {},
          RestJson: {},
          RestXml: {}
        },
        XML: {},
        JSON: {},
        Model: {},
        config: {
          credentials: {
            expired: false,
            expireTime: null,
            accessKeyId: '',
            filename: '',
            profile: 'default',
            disableAssumeRole: true
          },
          credentialProvider: {
            providers: [null, null, null, null]
          },
          logger: null,
          apiVersions: {},
          apiVersion: null,
          httpOptions: {
            timeout: 120000
          },
          maxRedirects: 10,
          paramValidation: true,
          sslEnabled: true,
          s3ForcePathStyle: false,
          s3BucketEndpoint: false,
          s3DisableBodySigning: true,
          computeChecksums: true,
          convertResponseTypes: true,
          correctClockSkew: false,
          customUserAgent: null,
          dynamoDbCrc32: true,
          systemClockOffset: 0,
          signatureVersion: null,
          signatureCache: true,
          retryDelayOptions: {},
          useAccelerateEndpoint: false
        },
        EventListeners: {
          Core: {
            _events: {
              validate: [null, null, null, null],
              afterBuild: [null, null, null],
              restart: [null],
              sign: [null],
              validateResponse: [null],
              send: [null],
              httpHeaders: [null],
              httpData: [null],
              httpDone: [null],
              retry: [null, null, null, null, null, null],
              afterRetry: [null]
            }
          },
          CorePost: {
            _events: {
              extractData: [null],
              extractError: [null],
              httpError: [null]
            }
          },
          Logger: {
            _events: {
              complete: [null]
            }
          },
          Json: {
            _events: {
              build: [null],
              extractData: [null],
              extractError: [null]
            }
          },
          Rest: {
            _events: {
              build: [null],
              extractData: [null],
              extractError: [null]
            }
          },
          RestJson: {
            _events: {
              build: [null],
              extractData: [null],
              extractError: [null]
            }
          },
          RestXml: {
            _events: {
              build: [null],
              extractData: [null],
              extractError: [null]
            }
          },
          Query: {
            _events: {
              build: [null],
              extractData: [null],
              extractError: [null]
            }
          }
        },
        events: {
          _events: {}
        }
      }
    }
  },
  version: '1.10.2',
  yamlParser: {
    serverless: '~'
  },
  utils: {
    serverless: '~'
  },
  service: {
    serverless: '~',
    service: 'sls-iopipe',
    provider: {
      stage: 'prod',
      region: 'us-west-2',
      /*eslint-disable no-template-curly-in-string*/
      variableSyntax: '\\${([ :a-zA-Z0-9._,\\-\\/\\(\\)]+?)}',
      name: 'aws',
      runtime: 'nodejs6.10',
      versionFunctions: true,
      compiledCloudFormationTemplate: {}
    },
    custom: {
      iopipeToken: 'SAMPLE_TOKEN_FOO',
      iopipeQuote: 'double',
      iopipeExclude: 'excluded,foo',
      iopipePlaceholder: false
    },
    plugins: ['serverless-plugin-iopipe/index.js'],
    functions: {
      simple: {
        handler: 'handlers/simple.handler',
        events: [],
        name: 'sls-iopipe-prod-simple'
      },
      multiple: {
        handler: 'handlers/multiple.handler',
        events: [],
        name: 'sls-iopipe-prod-multiple'
      },
      multipleDifferentHandler: {
        handler: 'handlers/multiple.differentNameHandler',
        events: [],
        name: 'sls-iopipe-prod-multiple-different-handler'
      },
      es5: {
        handler: 'handlers/es5.handler',
        events: [],
        name: 'sls-iopipe-prod-es5'
      },
      'multiple-dots-in-name': {
        handler: 'handlers/multiple.dots.in.name.handler',
        events: [],
        name: 'sls-iopipe-prod-multiple-dots-in-name'
      },
      noModule: {
        handler: 'handlers/noModule.handler',
        events: [],
        name: 'sls-iopipe-prod-noModule'
      },
      syntaxError: {
        handler: 'handlers/syntaxError.handler',
        events: [],
        name: 'sls-iopipe-prod-syntaxError'
      },
      excluded: {
        handler: 'handlers/excluded.handler',
        events: [],
        name: 'sls-iopipe-prod-excluded'
      },
      python: {
        handler: 'python/main.longRunning',
        runtime: 'python2.7'
      }
    },
    package: {
      artifact: 'testProject/.iopipe/.serverless/sls-iopoipe.zip'
    }
  },
  variables: {
    serverless: '~',
    service: '~service',
    overwriteSyntax: {},
    fileRefSyntax: {},
    envRefSyntax: {},
    optRefSyntax: {},
    selfRefSyntax: {},
    options: '~providers~aws~options',
    variableSyntax: {}
  },
  pluginManager: {
    serverless: '~',
    cliOptions: '~providers~aws~options',
    cliCommands: ['deploy'],
    plugins: [
      {
        serverless: '~',
        options: '~providers~aws~options',
        commands: {
          config: {
            usage: 'Configure Serverless',
            commands: {
              credentials: {
                usage:
                  'Configures a new provider profile for the Serverless Framework',
                lifecycleEvents: ['config'],
                options: {
                  provider: {
                    usage: 'Name of the provider. Supported providers: "aws"',
                    required: true,
                    shortcut: 'p'
                  }
                }
              }
            }
          }
        },
        hooks: {}
      },
      {
        serverless: '~',
        options: '~providers~aws~options',
        commands: {
          create: {
            usage: 'Create new Serverless service',
            lifecycleEvents: ['create'],
            options: {
              template: {
                usage:
                  'Template for the service. Available templates: "aws-nodejs", "aws-python", "aws-groovy-gradle", "aws-java-maven", "aws-java-gradle", "aws-scala-sbt", "aws-csharp", "azure-nodejs", "openwhisk-nodejs" and "plugin"',
                required: true,
                shortcut: 't'
              },
              path: {
                usage:
                  'The path where the service should be created (e.g. --path my-service)',
                shortcut: 'p'
              },
              name: {
                usage:
                  'Name for the service. Overwrites the default name of the created service.',
                shortcut: 'n'
              }
            }
          }
        },
        hooks: {}
      },
      {
        serverless: '~',
        options: '~providers~aws~options',
        commands: {
          install: {
            usage: 'Install a Serverless service from GitHub',
            lifecycleEvents: ['install'],
            options: {
              url: {
                usage: 'URL of the Serverless service on GitHub',
                required: true,
                shortcut: 'u'
              },
              name: {
                usage: 'Name for the service',
                shortcut: 'n'
              }
            }
          }
        },
        hooks: {}
      },
      {
        serverless: '~',
        options: '~providers~aws~options',
        defaultExcludes: [
          '.git/**',
          '.gitignore',
          '.DS_Store',
          'npm-debug.log',
          'serverless.yaml',
          'serverless.yml',
          '.serverless/**'
        ],
        hooks: {}
      },
      {
        serverless: '~',
        commands: {
          deploy: {
            usage: 'Deploy a Serverless service',
            lifecycleEvents: [
              'cleanup',
              'initialize',
              'setupProviderConfiguration',
              'createDeploymentArtifacts',
              'compileFunctions',
              'compileEvents',
              'deploy'
            ],
            options: {
              stage: {
                usage: 'Stage of the service',
                shortcut: 's'
              },
              region: {
                usage: 'Region of the service',
                shortcut: 'r'
              },
              noDeploy: {
                usage: 'Build artifacts without deploying',
                shortcut: 'n'
              },
              verbose: {
                usage: 'Show all stack events during deployment',
                shortcut: 'v'
              }
            },
            commands: {
              function: {
                usage: 'Deploy a single function from the service',
                lifecycleEvents: ['initialize', 'packageFunction', 'deploy'],
                options: {
                  function: {
                    usage: 'Name of the function',
                    shortcut: 'f',
                    required: true
                  },
                  stage: {
                    usage: 'Stage of the function',
                    shortcut: 's'
                  },
                  region: {
                    usage: 'Region of the function',
                    shortcut: 'r'
                  }
                }
              },
              list: {
                usage: 'List deployed version of your Serverless Service',
                lifecycleEvents: ['log']
              }
            }
          }
        }
      },
      {
        serverless: '~',
        commands: {
          invoke: {
            usage: 'Invoke a deployed function',
            lifecycleEvents: ['invoke'],
            options: {
              function: {
                usage: 'The function name',
                required: true,
                shortcut: 'f'
              },
              stage: {
                usage: 'Stage of the service',
                shortcut: 's'
              },
              region: {
                usage: 'Region of the service',
                shortcut: 'r'
              },
              path: {
                usage: 'Path to JSON or YAML file holding input data',
                shortcut: 'p'
              },
              type: {
                usage: 'Type of invocation',
                shortcut: 't'
              },
              log: {
                usage: 'Trigger logging data output',
                shortcut: 'l'
              },
              data: {
                usage: 'input data',
                shortcut: 'd'
              }
            },
            commands: {
              local: {
                usage: 'Invoke function locally',
                lifecycleEvents: ['invoke'],
                options: {
                  function: {
                    usage: 'Name of the function',
                    shortcut: 'f',
                    required: true
                  },
                  path: {
                    usage: 'Path to JSON or YAML file holding input data',
                    shortcut: 'p'
                  },
                  data: {
                    usage: 'input data',
                    shortcut: 'd'
                  }
                }
              }
            }
          }
        }
      },
      {
        serverless: '~',
        commands: {
          info: {
            usage: 'Display information about the service',
            lifecycleEvents: ['info'],
            options: {
              stage: {
                usage: 'Stage of the service',
                shortcut: 's'
              },
              region: {
                usage: 'Region of the service',
                shortcut: 'r'
              },
              verbose: {
                usage: 'Display Stack output',
                shortcut: 'v'
              }
            }
          }
        }
      },
      {
        serverless: '~',
        commands: {
          logs: {
            usage: 'Output the logs of a deployed function',
            lifecycleEvents: ['logs'],
            options: {
              function: {
                usage: 'The function name',
                required: true,
                shortcut: 'f'
              },
              stage: {
                usage: 'Stage of the service',
                shortcut: 's'
              },
              region: {
                usage: 'Region of the service',
                shortcut: 'r'
              },
              tail: {
                usage: 'Tail the log output',
                shortcut: 't'
              },
              startTime: {
                usage: 'Logs before this time will not be displayed'
              },
              filter: {
                usage: 'A filter pattern'
              },
              interval: {
                usage: 'Tail polling interval in milliseconds. Default: `1000`',
                shortcut: 'i'
              }
            }
          }
        }
      },
      {
        serverless: '~',
        options: '~providers~aws~options',
        commands: {
          metrics: {
            usage: 'Show metrics for a specific function',
            lifecycleEvents: ['metrics'],
            options: {
              function: {
                usage: 'The function name',
                shortcut: 'f'
              },
              stage: {
                usage: 'Stage of the service',
                shortcut: 's'
              },
              region: {
                usage: 'Region of the service',
                shortcut: 'r'
              },
              startTime: {
                usage: 'Start time for the metrics retrieval (e.g. 1970-01-01)'
              },
              endTime: {
                usage: 'End time for the metrics retrieval (e.g. 1970-01-01)'
              }
            }
          }
        }
      },
      {
        serverless: '~',
        commands: {
          remove: {
            usage: 'Remove Serverless service and all resources',
            lifecycleEvents: ['remove'],
            options: {
              stage: {
                usage: 'Stage of the service',
                shortcut: 's'
              },
              region: {
                usage: 'Region of the service',
                shortcut: 'r'
              },
              verbose: {
                usage: 'Show all stack events during deployment',
                shortcut: 'v'
              }
            }
          }
        }
      },
      {
        serverless: '~',
        commands: {
          rollback: {
            usage: 'Rollback the Serverless service to a specific deployment',
            lifecycleEvents: ['initialize', 'rollback'],
            options: {
              timestamp: {
                usage:
                  'Timestamp of the deployment (list deployments with `serverless deploy list`)',
                shortcut: 't',
                required: true
              },
              verbose: {
                usage: 'Show all stack events during deployment',
                shortcut: 'v'
              }
            }
          }
        }
      },
      {
        serverless: '~',
        options: '~providers~aws~options',
        commands: {
          slstats: {
            usage: 'Enable or disable stats',
            lifecycleEvents: ['slstats'],
            options: {
              enable: {
                usage: 'Enable stats ("--enable")',
                shortcut: 'e'
              },
              disable: {
                usage: 'Disable stats ("--disable")',
                shortcut: 'd'
              }
            }
          }
        },
        hooks: {}
      },
      {
        serverless: '~',
        options: '~providers~aws~options',
        commands: {
          config: {
            commands: {
              credentials: {
                lifecycleEvents: ['config'],
                options: {
                  key: {
                    usage: 'Access key for the provider',
                    shortcut: 'k',
                    required: true
                  },
                  secret: {
                    usage: 'Secret key for the provider',
                    shortcut: 's',
                    required: true
                  },
                  profile: {
                    usage:
                      'Name of the profile you wish to create. Defaults to "default"',
                    shortcut: 'n'
                  }
                }
              }
            }
          }
        },
        hooks: {}
      },
      '~providers~aws',
      {
        serverless: '~',
        options: '~providers~aws~options',
        provider: '~providers~aws',
        hooks: {}
      },
      {
        serverless: '~',
        options: '~providers~aws~options',
        provider: '~providers~aws',
        hooks: {}
      },
      {
        serverless: '~',
        provider: '~providers~aws',
        options: '~providers~aws~options',
        hooks: {}
      },
      {
        serverless: '~',
        options: '~providers~aws~options',
        provider: '~providers~aws',
        hooks: {}
      },
      {
        serverless: '~',
        options: '~providers~aws~options',
        provider: '~providers~aws',
        hooks: {}
      },
      {
        serverless: '~',
        options: '~providers~aws~options',
        provider: '~providers~aws',
        hooks: {}
      },
      {
        serverless: '~',
        options: '~providers~aws~options',
        provider: '~providers~aws',
        hooks: {}
      },
      {
        serverless: '~',
        options: '~providers~aws~options',
        provider: '~providers~aws',
        hooks: {}
      },
      {
        serverless: '~',
        provider: '~providers~aws',
        hooks: {}
      },
      {
        serverless: '~',
        provider: '~providers~aws',
        hooks: {}
      },
      {
        serverless: '~',
        options: '~providers~aws~options',
        provider: '~providers~aws',
        DEFAULT_JSON_REQUEST_TEMPLATE:
          '\n    #set( $body = $input.json("$") )\n\n    \n  #define( $loop )\n    {\n    #foreach($key in $map.keySet())\n        #set( $k = $util.escapeJavaScript($key) )\n        #set( $v = $util.escapeJavaScript($map.get($key)).replaceAll("\\\\\'", "\'") )\n        "$k":\n          "$v"\n          #if( $foreach.hasNext ) , #end\n    #end\n    }\n  #end\n\n  {\n    "body": $body,\n    "method": "$context.httpMethod",\n    "principalId": "$context.authorizer.principalId",\n    "stage": "$context.stage",\n\n    "cognitoPoolClaims" : {\n       extraCognitoPoolClaims\n       "sub": "$context.authorizer.claims.sub"\n    },\n\n    #set( $map = $input.params().header )\n    "headers": $loop,\n\n    #set( $map = $input.params().querystring )\n    "query": $loop,\n\n    #set( $map = $input.params().path )\n    "path": $loop,\n\n    #set( $map = $context.identity )\n    "identity": $loop,\n\n    #set( $map = $stageVariables )\n    "stageVariables": $loop\n  }\n\n  ',
        DEFAULT_FORM_URL_ENCODED_REQUEST_TEMPLATE:
          '\n    #define( $body )\n      {\n      #foreach( $token in $input.path(\'$\').split(\'&\') )\n        #set( $keyVal = $token.split(\'=\') )\n        #set( $keyValSize = $keyVal.size() )\n        #if( $keyValSize >= 1 )\n          #set( $key = $util.escapeJavaScript($util.urlDecode($keyVal[0])) )\n          #if( $keyValSize >= 2 )\n            #set($val = $util.escapeJavaScript($util.urlDecode($keyVal[1])).replaceAll("\\\\\'","\'"))\n          #else\n            #set( $val = \'\' )\n          #end\n          "$key": "$val"#if($foreach.hasNext),#end\n        #end\n      #end\n      }\n    #end\n\n    \n  #define( $loop )\n    {\n    #foreach($key in $map.keySet())\n        #set( $k = $util.escapeJavaScript($key) )\n        #set( $v = $util.escapeJavaScript($map.get($key)).replaceAll("\\\\\'", "\'") )\n        "$k":\n          "$v"\n          #if( $foreach.hasNext ) , #end\n    #end\n    }\n  #end\n\n  {\n    "body": $body,\n    "method": "$context.httpMethod",\n    "principalId": "$context.authorizer.principalId",\n    "stage": "$context.stage",\n\n    "cognitoPoolClaims" : {\n       extraCognitoPoolClaims\n       "sub": "$context.authorizer.claims.sub"\n    },\n\n    #set( $map = $input.params().header )\n    "headers": $loop,\n\n    #set( $map = $input.params().querystring )\n    "query": $loop,\n\n    #set( $map = $input.params().path )\n    "path": $loop,\n\n    #set( $map = $context.identity )\n    "identity": $loop,\n\n    #set( $map = $stageVariables )\n    "stageVariables": $loop\n  }\n\n  ',
        hooks: {}
      },
      {
        serverless: '~',
        provider: '~providers~aws',
        hooks: {}
      },
      {
        serverless: '~',
        provider: '~providers~aws',
        hooks: {}
      },
      {
        serverless: '~',
        provider: '~providers~aws',
        hooks: {}
      },
      {
        serverless: '~',
        provider: '~providers~aws',
        hooks: {}
      },
      {
        serverless: '~',
        provider: '~providers~aws',
        hooks: {}
      },
      {
        serverless: '~',
        options: '~providers~aws~options',
        provider: '~providers~aws',
        pkg: {
          serverless: '~',
          options: '~providers~aws~options',
          defaultExcludes: '~pluginManager~plugins~3~defaultExcludes',
          hooks: {}
        },
        hooks: {}
      },
      {
        serverless: '~',
        options: '~providers~aws~options',
        provider: '~providers~aws',
        hooks: {}
      },
      {
        serverless: '~',
        options: '~providers~aws~options',
        provider: '~providers~aws',
        hooks: {}
      },
      {
        sls: '~',
        package: {},
        funcs: [],
        commands: {
          iopipe: {
            usage: 'Helps you start your first Serverless plugin',
            lifecycleEvents: ['run', 'finish'],
            options: {
              token: {
                usage:
                  'Your iopipe token (clientId) to wrap your functions with',
                required: false,
                shortcut: 't'
              },
              noVerify: {
                usage:
                  'Skip a check that ensures iopipe is installed via npm/yarn and present in package.json',
                required: false,
                shortcut: 'nv'
              },
              noUpgrade: {
                usage:
                  'The plugin automatically upgrades the IOpipe library to the most recent minor version. Use this option to disable that feature.',
                required: false,
                shortcut: 'nu'
              },
              noYarn: {
                usage:
                  'When auto-upgrading, Yarn will be used in place of NPM if a yarn.lock file is found. Use this flag disable yarn and use NPM to upgrade the iopipe library.',
                required: false,
                shortcut: 'ny'
              },
              exclude: {
                usage:
                  'Exclude certain handlers from being wrapped with IOpipe',
                required: false,
                shortcut: 'e'
              },
              placeholder: {
                usage:
                  'Use process.env.IOPIPE_TOKEN as a placeholder variable to allow the token to be configured via environment variables in Serverless, AWS CLI, or AWS Console',
                required: false,
                shortcut: 'p'
              }
            }
          }
        },
        hooks: {}
      }
    ],
    commands: {
      config: {
        usage: 'Configure Serverless',
        commands: {
          credentials: {
            usage:
              'Configures a new provider profile for the Serverless Framework',
            lifecycleEvents: ['config'],
            options: {
              provider: {
                usage: 'Name of the provider. Supported providers: "aws"',
                required: true,
                shortcut: 'p'
              },
              key: {
                usage: 'Access key for the provider',
                shortcut: 'k',
                required: true
              },
              secret: {
                usage: 'Secret key for the provider',
                shortcut: 's',
                required: true
              },
              profile: {
                usage:
                  'Name of the profile you wish to create. Defaults to "default"',
                shortcut: 'n'
              }
            },
            key: 'config:credentials',
            pluginName: 'AwsConfigCredentials',
            commands: {}
          }
        },
        key: 'config',
        pluginName: 'AwsConfigCredentials'
      },
      create: {
        usage: 'Create new Serverless service',
        lifecycleEvents: ['create'],
        options: {
          template: {
            usage:
              'Template for the service. Available templates: "aws-nodejs", "aws-python", "aws-groovy-gradle", "aws-java-maven", "aws-java-gradle", "aws-scala-sbt", "aws-csharp", "azure-nodejs", "openwhisk-nodejs" and "plugin"',
            required: true,
            shortcut: 't'
          },
          path: {
            usage:
              'The path where the service should be created (e.g. --path my-service)',
            shortcut: 'p'
          },
          name: {
            usage:
              'Name for the service. Overwrites the default name of the created service.',
            shortcut: 'n'
          }
        },
        key: 'create',
        pluginName: 'Create',
        commands: {}
      },
      install: {
        usage: 'Install a Serverless service from GitHub',
        lifecycleEvents: ['install'],
        options: {
          url: {
            usage: 'URL of the Serverless service on GitHub',
            required: true,
            shortcut: 'u'
          },
          name: {
            usage: 'Name for the service',
            shortcut: 'n'
          }
        },
        key: 'install',
        pluginName: 'Install',
        commands: {}
      },
      deploy: {
        usage: 'Deploy a Serverless service',
        lifecycleEvents: [
          'cleanup',
          'initialize',
          'setupProviderConfiguration',
          'createDeploymentArtifacts',
          'compileFunctions',
          'compileEvents',
          'deploy'
        ],
        options: {
          stage: {
            usage: 'Stage of the service',
            shortcut: 's'
          },
          region: {
            usage: 'Region of the service',
            shortcut: 'r'
          },
          noDeploy: {
            usage: 'Build artifacts without deploying',
            shortcut: 'n'
          },
          verbose: {
            usage: 'Show all stack events during deployment',
            shortcut: 'v'
          }
        },
        commands: {
          function: {
            usage: 'Deploy a single function from the service',
            lifecycleEvents: ['initialize', 'packageFunction', 'deploy'],
            options: {
              function: {
                usage: 'Name of the function',
                shortcut: 'f',
                required: true
              },
              stage: {
                usage: 'Stage of the function',
                shortcut: 's'
              },
              region: {
                usage: 'Region of the function',
                shortcut: 'r'
              }
            },
            key: 'deploy:function',
            pluginName: 'Deploy',
            commands: {}
          },
          list: {
            usage: 'List deployed version of your Serverless Service',
            lifecycleEvents: ['log'],
            key: 'deploy:list',
            pluginName: 'Deploy',
            commands: {}
          }
        },
        key: 'deploy',
        pluginName: 'Deploy'
      },
      invoke: {
        usage: 'Invoke a deployed function',
        lifecycleEvents: ['invoke'],
        options: {
          function: {
            usage: 'The function name',
            required: true,
            shortcut: 'f'
          },
          stage: {
            usage: 'Stage of the service',
            shortcut: 's'
          },
          region: {
            usage: 'Region of the service',
            shortcut: 'r'
          },
          path: {
            usage: 'Path to JSON or YAML file holding input data',
            shortcut: 'p'
          },
          type: {
            usage: 'Type of invocation',
            shortcut: 't'
          },
          log: {
            usage: 'Trigger logging data output',
            shortcut: 'l'
          },
          data: {
            usage: 'input data',
            shortcut: 'd'
          }
        },
        commands: {
          local: {
            usage: 'Invoke function locally',
            lifecycleEvents: ['invoke'],
            options: {
              function: {
                usage: 'Name of the function',
                shortcut: 'f',
                required: true
              },
              path: {
                usage: 'Path to JSON or YAML file holding input data',
                shortcut: 'p'
              },
              data: {
                usage: 'input data',
                shortcut: 'd'
              }
            },
            key: 'invoke:local',
            pluginName: 'Invoke',
            commands: {}
          }
        },
        key: 'invoke',
        pluginName: 'Invoke'
      },
      info: {
        usage: 'Display information about the service',
        lifecycleEvents: ['info'],
        options: {
          stage: {
            usage: 'Stage of the service',
            shortcut: 's'
          },
          region: {
            usage: 'Region of the service',
            shortcut: 'r'
          },
          verbose: {
            usage: 'Display Stack output',
            shortcut: 'v'
          }
        },
        key: 'info',
        pluginName: 'Info',
        commands: {}
      },
      logs: {
        usage: 'Output the logs of a deployed function',
        lifecycleEvents: ['logs'],
        options: {
          function: {
            usage: 'The function name',
            required: true,
            shortcut: 'f'
          },
          stage: {
            usage: 'Stage of the service',
            shortcut: 's'
          },
          region: {
            usage: 'Region of the service',
            shortcut: 'r'
          },
          tail: {
            usage: 'Tail the log output',
            shortcut: 't'
          },
          startTime: {
            usage: 'Logs before this time will not be displayed'
          },
          filter: {
            usage: 'A filter pattern'
          },
          interval: {
            usage: 'Tail polling interval in milliseconds. Default: `1000`',
            shortcut: 'i'
          }
        },
        key: 'logs',
        pluginName: 'Logs',
        commands: {}
      },
      metrics: {
        usage: 'Show metrics for a specific function',
        lifecycleEvents: ['metrics'],
        options: {
          function: {
            usage: 'The function name',
            shortcut: 'f'
          },
          stage: {
            usage: 'Stage of the service',
            shortcut: 's'
          },
          region: {
            usage: 'Region of the service',
            shortcut: 'r'
          },
          startTime: {
            usage: 'Start time for the metrics retrieval (e.g. 1970-01-01)'
          },
          endTime: {
            usage: 'End time for the metrics retrieval (e.g. 1970-01-01)'
          }
        },
        key: 'metrics',
        pluginName: 'Metrics',
        commands: {}
      },
      remove: {
        usage: 'Remove Serverless service and all resources',
        lifecycleEvents: ['remove'],
        options: {
          stage: {
            usage: 'Stage of the service',
            shortcut: 's'
          },
          region: {
            usage: 'Region of the service',
            shortcut: 'r'
          },
          verbose: {
            usage: 'Show all stack events during deployment',
            shortcut: 'v'
          }
        },
        key: 'remove',
        pluginName: 'Remove',
        commands: {}
      },
      rollback: {
        usage: 'Rollback the Serverless service to a specific deployment',
        lifecycleEvents: ['initialize', 'rollback'],
        options: {
          timestamp: {
            usage:
              'Timestamp of the deployment (list deployments with `serverless deploy list`)',
            shortcut: 't',
            required: true
          },
          verbose: {
            usage: 'Show all stack events during deployment',
            shortcut: 'v'
          }
        },
        key: 'rollback',
        pluginName: 'Rollback',
        commands: {}
      },
      slstats: {
        usage: 'Enable or disable stats',
        lifecycleEvents: ['slstats'],
        options: {
          enable: {
            usage: 'Enable stats ("--enable")',
            shortcut: 'e'
          },
          disable: {
            usage: 'Disable stats ("--disable")',
            shortcut: 'd'
          }
        },
        key: 'slstats',
        pluginName: 'SlStats',
        commands: {}
      },
      iopipe: {
        usage:
          "Automatically wraps your function handlers in IOpipe, so you don't have to.",
        lifecycleEvents: ['run', 'finish'],
        options: {
          token: {
            usage: 'Your iopipe token (clientId) to wrap your functions with',
            required: false,
            shortcut: 't'
          },
          noVerify: {
            usage:
              'Skip a check that ensures iopipe is installed via npm/yarn and present in package.json',
            required: false,
            shortcut: 'nv'
          },
          noUpgrade: {
            usage:
              'The plugin automatically upgrades the IOpipe library to the most recent minor version. Use this option to disable that feature.',
            required: false,
            shortcut: 'nu'
          },
          noYarn: {
            usage:
              'When auto-upgrading, Yarn will be used in place of NPM if a yarn.lock file is found. Use this flag disable yarn and use NPM to upgrade the iopipe library.',
            required: false,
            shortcut: 'ny'
          },
          exclude: {
            usage: 'Exclude certain handlers from being wrapped with IOpipe',
            required: false,
            shortcut: 'e'
          },
          placeholder: {
            usage:
              'Use process.env.IOPIPE_TOKEN as a placeholder variable to allow the token to be configured via environment variables in Serverless, AWS CLI, or AWS Console',
            required: false,
            shortcut: 'p'
          }
        },
        key: 'iopipe',
        pluginName: 'ServerlessIOpipePlugin',
        commands: {}
      }
    },
    hooks: {
      'before:config:credentials:config': [
        {
          pluginName: 'Config'
        }
      ],
      'create:create': [
        {
          pluginName: 'Create'
        }
      ],
      'install:install': [
        {
          pluginName: 'Install'
        }
      ],
      'deploy:cleanup': [
        {
          pluginName: 'Package'
        }
      ],
      'deploy:createDeploymentArtifacts': [
        {
          pluginName: 'Package'
        }
      ],
      'slstats:slstats': [
        {
          pluginName: 'SlStats'
        }
      ],
      'config:credentials:config': [
        {
          pluginName: 'AwsConfigCredentials'
        }
      ],
      'before:deploy:initialize': [
        {
          pluginName: 'AwsDeploy'
        }
      ],
      'deploy:initialize': [
        {
          pluginName: 'AwsDeploy'
        }
      ],
      'deploy:setupProviderConfiguration': [
        {
          pluginName: 'AwsDeploy'
        }
      ],
      'before:deploy:compileFunctions': [
        {
          pluginName: 'AwsDeploy'
        }
      ],
      'deploy:deploy': [
        {
          pluginName: 'AwsDeploy'
        },
        {
          pluginName: 'AwsInfo'
        }
      ],
      'invoke:invoke': [
        {
          pluginName: 'AwsInvoke'
        }
      ],
      'info:info': [
        {
          pluginName: 'AwsInfo'
        }
      ],
      'logs:logs': [
        {
          pluginName: 'AwsLogs'
        }
      ],
      'metrics:metrics': [
        {
          pluginName: 'AwsMetrics'
        }
      ],
      'remove:remove': [
        {
          pluginName: 'AwsRemove'
        }
      ],
      'before:rollback:initialize': [
        {
          pluginName: 'AwsRollback'
        }
      ],
      'rollback:rollback': [
        {
          pluginName: 'AwsRollback'
        }
      ],
      'deploy:compileFunctions': [
        {
          pluginName: 'AwsCompileFunctions'
        }
      ],
      'deploy:compileEvents': [
        {
          pluginName: 'AwsCompileScheduledEvents'
        },
        {
          pluginName: 'AwsCompileS3Events'
        },
        {
          pluginName: 'AwsCompileApigEvents'
        },
        {
          pluginName: 'AwsCompileSNSEvents'
        },
        {
          pluginName: 'AwsCompileStreamEvents'
        },
        {
          pluginName: 'AwsCompileAlexaSkillEvents'
        },
        {
          pluginName: 'AwsCompileIoTEvents'
        },
        {
          pluginName: 'AwsCompileCloudWatchEventEvents'
        }
      ],
      'deploy:function:initialize': [
        {
          pluginName: 'AwsDeployFunction'
        }
      ],
      'deploy:function:packageFunction': [
        {
          pluginName: 'AwsDeployFunction'
        }
      ],
      'deploy:function:deploy': [
        {
          pluginName: 'AwsDeployFunction'
        }
      ],
      'before:deploy:list:log': [
        {
          pluginName: 'AwsDeployList'
        }
      ],
      'deploy:list:log': [
        {
          pluginName: 'AwsDeployList'
        }
      ],
      'invoke:local:invoke': [
        {
          pluginName: 'AwsInvokeLocal'
        }
      ],
      'before:deploy:createDeploymentArtifacts': [
        {
          pluginName: 'ServerlessIOpipePlugin'
        }
      ],
      'after:deploy:compileFunctions': [
        {
          pluginName: 'ServerlessIOpipePlugin'
        }
      ],
      'iopipe:run': [
        {
          pluginName: 'ServerlessIOpipePlugin'
        }
      ],
      'iopipe:finish': [
        {
          pluginName: 'ServerlessIOpipePlugin'
        }
      ]
    }
  },
  config: {
    serverless: '~',
    serverlessPath: `${
      process.env.npm_config_prefix
    }/node_modules/serverless/lib`,
    interactive: true,
    servicePath: path.resolve(__dirname, '../../testProjects/default')
  },
  classes: {},
  cli: {
    serverless: '~',
    inputArray: null,
    loadedPlugins: '~pluginManager~plugins',
    loadedCommands: '~pluginManager~commands'
  },
  processedInput: {
    commands: '~pluginManager~cliCommands',
    options: '~providers~aws~options'
  }
};
