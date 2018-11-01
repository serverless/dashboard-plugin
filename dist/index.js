module.exports = function(modules) {
    var installedModules = {};
    function __webpack_require__(moduleId) {
        if (installedModules[moduleId]) {
            return installedModules[moduleId].exports;
        }
        var module = installedModules[moduleId] = {
            i: moduleId,
            l: false,
            exports: {}
        };
        modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
        module.l = true;
        return module.exports;
    }
    __webpack_require__.m = modules;
    __webpack_require__.c = installedModules;
    __webpack_require__.i = function(value) {
        return value;
    };
    __webpack_require__.d = function(exports, name, getter) {
        if (!__webpack_require__.o(exports, name)) {
            Object.defineProperty(exports, name, {
                configurable: false,
                enumerable: true,
                get: getter
            });
        }
    };
    __webpack_require__.n = function(module) {
        var getter = module && module.__esModule ? function getDefault() {
            return module["default"];
        } : function getModuleExports() {
            return module;
        };
        __webpack_require__.d(getter, "a", getter);
        return getter;
    };
    __webpack_require__.o = function(object, property) {
        return Object.prototype.hasOwnProperty.call(object, property);
    };
    __webpack_require__.p = "";
    return __webpack_require__(__webpack_require__.s = 7);
}([ function(module, exports, __webpack_require__) {
    "use strict";
    module.exports = "let handler, handlerError\n// The following is an automatically generated require statement by the plugin,\n// aimed to provide syntax/type errors to the IOpipe service.\n// The original file is imported as text with capitalized tokens replaced.\ntry {\n  handler = require('../RELATIVE_PATH')\n} catch (err) {\n  handlerError = err\n}\nexports['EXPORT_NAME'] = function FUNCTION_NAME(event, context, callback) {\n  if (!apm.isStarted()) {\n    apm.start({\n      serviceName: 'SERVICE_NAME',\n      serverUrl: 'http://apm.signalmalt.com'\n    })\n  }\n\n  // Better way to do this?\n  apm.addFilter(function(payload) {\n    // the payload can either contain an array of transactions or errors\n    var items = payload.transactions || payload.errors || []\n    const serverless = {\n      tenantId: 'TENANT_NAME',\n      applicationName: 'APPLICATION_NAME',\n      serviceName: 'SERVICE_NAME',\n      region: 'REGION',\n      provider: 'PROVIDER'\n    }\n    items.map((item) => {\n      let functionName\n      // strip out the app name (should strip out the stage too)\n      if (item.context.custom.lambda.functionName.includes(serverless.applicationName)) {\n        shortFnName = item.context.custom.lambda.functionName.slice(\n          applicationName.length + 1,\n          item.context.custom.lambda.functionName.length\n        )\n      } else {\n        functionName = item.context.custom.lambda.functionName\n      }\n\n      item.context.tags = {\n        ...item.context.tags,\n        ...serverless,\n        functionName\n      }\n      console.log(item.context.tags)\n    })\n\n    payload.service.name = 'SERVICE_NAME'\n\n    return payload\n  })\n\n  try {\n    return apm.lambda(`PROVIDER-REGION`, (evt, ctx, cb) => {\n      if (handlerError) {\n        return cb(handlerError)\n      }\n      return handler.METHOD(evt, ctx, cb)\n    })(event, context, callback)\n  } catch (err) {\n    throw err\n  }\n}\n";
}, function(module, exports) {
    module.exports = {
        name: "serverless-apm-plugin",
        version: "1.0.0",
        description: "",
        main: "dist/index.js",
        scripts: {
            build: "NODE_ENV=production npm run folder && npm run webpack && npm run uglify",
            folder: "rm -rf dist && mkdir dist",
            uglify: "./node_modules/uglify-es/bin/uglifyjs dist/index.js --output dist/index.js --beautify",
            webpack: "webpack"
        },
        dependencies: {
            "elastic-apm-node": "git+https://07a01e4e5f66400a13cbbb3377759512dbfa771f:x-oauth-basic@github.com/westergaards/apm-agent-nodejs.git#demo-agent",
            cosmiconfig: "^3",
            debug: "^2.6.8",
            "fs-extra": "^5.0.0",
            "babel-core": "^6.26.3",
            "babel-cli": "^6.26.0",
            "babel-jest": "^21.2.0",
            "babel-macros": "^1.2.0",
            "babel-plugin-dynamic-import-node": "^1.2.0",
            "babel-plugin-external-helpers": "^6.22.0",
            "babel-plugin-minify-dead-code-elimination": "^0.2.0",
            "babel-plugin-module-resolver": "2.7.1",
            "babel-plugin-transform-async-to-generator": "^6.24.1",
            "babel-plugin-transform-class-properties": "^6.24.1",
            "babel-plugin-transform-inline-environment-variables": "^0.2.0",
            "babel-plugin-transform-object-rest-spread": "^6.26.0",
            "babel-plugin-transform-react-jsx": "^6.24.1",
            "babel-plugin-transform-react-remove-prop-types": "^0.4.10",
            "babel-preset-env": "^1.6.1",
            "babel-preset-react": "^6.24.1"
        },
        devDependencies: {
            "adm-zip": "^0.4.7",
            "babel-loader": "^7.0.0",
            "circular-json": "^0.3.1",
            "cross-spawn": "^6.0.4",
            "pre-commit": "^1.2.2",
            "raw-loader": "^0.5.1",
            serverless: "1.23.0",
            "uglify-es": "^3.0.27",
            webpack: "^2.6.1",
            "webpack-node-externals": "^1.6.0",
            yargs: "^11.0.0"
        },
        author: "",
        license: "ISC"
    };
}, function(module, exports) {
    module.exports = require("cosmiconfig");
}, function(module, exports) {
    module.exports = require("debug");
}, function(module, exports) {
    module.exports = require("fs-extra");
}, function(module, exports) {
    module.exports = require("lodash");
}, function(module, exports) {
    module.exports = require("path");
}, function(module, exports, __webpack_require__) {
    "use strict";
    var _lodash = __webpack_require__(5);
    var _lodash2 = _interopRequireDefault(_lodash);
    var _debug = __webpack_require__(3);
    var _debug2 = _interopRequireDefault(_debug);
    var _cosmiconfig = __webpack_require__(2);
    var _cosmiconfig2 = _interopRequireDefault(_cosmiconfig);
    var _package = __webpack_require__(1);
    var _package2 = _interopRequireDefault(_package);
    var _fsExtra = __webpack_require__(4);
    var _fsExtra2 = _interopRequireDefault(_fsExtra);
    var _handlerCode = __webpack_require__(0);
    var _handlerCode2 = _interopRequireDefault(_handlerCode);
    var _path = __webpack_require__(6);
    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }
    function createDebugger(suffix) {
        return (0, _debug2.default)(`serverless-plugin-apm:${suffix}`);
    }
    function outputHandlerCode(obj = {}, apmConfig) {
        const {name: name, relativePath: relativePath, method: method} = obj;
        const fnName = _lodash2.default.camelCase(`attempt-${name}`);
        return _handlerCode2.default.replace(/EXPORT_NAME/g, name).replace(/FUNCTION_NAME/g, fnName).replace(/RELATIVE_PATH/g, relativePath).replace(/METHOD/g, method).replace(/SERVICE_NAME/g, apmConfig.serviceNane).replace(/APPLICATION_NAME/g, apmConfig.appName).replace(/TENANT_NAME/g, apmConfig.tenantId).replace(/REGION/g, apmConfig.region).replace(/PROVIDER/g, apmConfig.provider);
    }
    class ServerlessApmPlugin {
        constructor(sls, options) {
            this.sls = sls;
            this.options = options;
            this.originalServicePath = this.sls.config.servicePath;
            this.commands = {
                apm: {
                    usage: "Wraps your function",
                    lifecycleEvents: [ "run" ]
                }
            };
            this.hooks = {
                "apm:run": this.run.bind(this),
                "before:package:createDeploymentArtifacts": this.run.bind(this),
                "before:deploy:function:packageFunction": this.run.bind(this),
                "before:invoke:local:invoke": this.run.bind(this),
                "before:offline:start:init": this.run.bind(this),
                "before:step-functions-offline:start": this.run.bind(this),
                "after:package:createDeploymentArtifacts": this.finish.bind(this),
                "after:invoke:local:invoke": this.finish.bind(this)
            };
        }
        run() {
            this.setOptions({});
            this.getApmConfig();
            this.getFuncs();
            this.log("Wrapping your functions...");
            this.createFiles();
            this.assignHandlers();
        }
        getApmConfig() {
            this.apmConfig = {
                stage: this.sls.service.provider.stage,
                region: this.sls.service.provider.region,
                provider: this.sls.service.provider.name,
                serviceNane: this.sls.service.service,
                appName: this.sls.service.app,
                tenantId: this.sls.service.tenant
            };
        }
        setOptions(opts) {
            const debug = createDebugger("setOptions");
            const custom = _lodash2.default.chain(this.sls).get("service.custom").pickBy((val, key) => key.match(/^apm/)).mapKeys((val, key) => _lodash2.default.camelCase(key.replace(/^apm/, ""))).mapValues((val, key) => {
                if (key === "exclude" && _lodash2.default.isString(val)) {
                    return val.split(",");
                }
                return val;
            }).value();
            const envVars = _lodash2.default.chain(process.env).pickBy((val, key) => key.match(/^APM/)).mapKeys((val, key) => _lodash2.default.camelCase(key.replace(/^APM/, ""))).value();
            const val = _lodash2.default.defaults(opts, custom, envVars);
            debug("Options object:", val);
            this.getOptions(val);
        }
        getFuncs() {
            try {
                const {servicePath: servicePath} = this.sls.config;
                this.funcs = _lodash2.default.chain(this.sls.service.functions).toPairs().reject(arr => {
                    const key = arr[0];
                    const obj = arr[1];
                    if (_lodash2.default.isString(obj.runtime) && !obj.runtime.match("node")) {
                        this.log(`Function "${key}" is not Node.js. Currently the plugin only supports Node.js functions. Skipping ${key}.`);
                        return true;
                    }
                    return false;
                }).map(arr => {
                    const [key, obj] = arr;
                    const handlerArr = _lodash2.default.isString(obj.handler) ? obj.handler.split(".") : [];
                    const relativePath = handlerArr.slice(0, -1).join(".");
                    const path = `${servicePath}/${relativePath}.js`;
                    return _lodash2.default.assign({}, obj, {
                        method: _lodash2.default.last(handlerArr),
                        path: path,
                        name: key,
                        relativePath: relativePath,
                        file: _lodash2.default.last((handlerArr.slice(-2, -1)[0] || "").split("/"))
                    });
                }).value();
            } catch (err) {
                console.error("Failed to read functions from serverless.yml.");
                throw new Error(err);
            }
        }
        createFiles() {
            const debug = createDebugger("createFiles");
            debug("Creating file");
            const {inlineConfig: inlineConfig} = this.getConfig();
            const {handlerDir: handlerDir} = this.getOptions();
            const iopipeInclude = `const apm = require('elastic-apm-node');`;
            this.funcs.forEach(func => {
                const handler = outputHandlerCode(func, this.apmConfig);
                const contents = `${iopipeInclude}\n\n${handler}`;
                _fsExtra2.default.ensureDirSync((0, _path.join)(this.originalServicePath, handlerDir));
                _fsExtra2.default.writeFileSync((0, _path.join)(this.originalServicePath, (0, _path.join)(handlerDir, `${func.name}-apm.js`)), contents);
            });
        }
        getInstalledPackageName({dependencies: dependencies} = this.package) {
            return [ "@iopipe/iopipe", "@iopipe/core", "iopipe" ].find(s => _lodash2.default.keys(dependencies).find(n => n === s));
        }
        log(arg1, ...rest) {
            const logger = this.sls.cli.log || logger.call(this.sls.cli, `serverless-plugin-apm: ${arg1}`, ...rest);
        }
        getConfig() {
            const {token: token} = this.getOptions();
            const {config: cosmi = {}} = (0, _cosmiconfig2.default)("apm", {
                cache: false,
                sync: true,
                rcExtensions: true
            }).load(process.cwd()) || {};
            const plugins = (cosmi.plugins || []).map(plugin => {
                const pluginModule = _lodash2.default.isArray(plugin) ? plugin[0] : plugin;
                const pluginConfig = _lodash2.default.isArray(plugin) ? JSON.stringify(plugin[1]) : "";
                return `require('${pluginModule}')(${pluginConfig})`;
            });
            const inlineConfigObject = _lodash2.default.pickBy(_lodash2.default.assign({}, cosmi, {
                token: token,
                installMethod: `${_package2.default.name}@${_package2.default.version}`,
                plugins: "xxx"
            }));
            let inlineConfig = JSON.stringify(inlineConfigObject);
            inlineConfig = inlineConfig.replace(/"plugins":"xxx"/, `"plugins":[${plugins.join(",")}]`);
            return {
                inlineConfig: inlineConfig
            };
        }
        getOptions(obj = this.options) {
            this.options = _lodash2.default.chain(obj).defaults(this.options).defaults({
                quote: "single",
                handlerDir: "apm_handlers"
            }).mapKeys((val, key) => _lodash2.default.camelCase(key)).value();
            return this.options;
        }
        assignHandlers() {
            const debug = createDebugger("assignHandlers");
            debug("Assigning apm handlers to sls service");
            const {handlerDir: handlerDir} = this.getOptions();
            console.log("before funcs", this.funcs);
            this.funcs.forEach(obj => {
                _lodash2.default.set(this.sls.service.functions, `${obj.name}.handler`, _path.posix.join(handlerDir, `${obj.name}-apm.${obj.name}`));
            });
            console.log("after funcs", this.funcs);
        }
        finish() {
            const debug = createDebugger("finish");
            this.log("Cleaning up extraneous apm files");
            debug(`Removing ${this.handlerFileName}.js`);
            const {handlerDir: handlerDir = "apm_handlers"} = this.getOptions();
            _fsExtra2.default.removeSync((0, _path.join)(this.originalServicePath, handlerDir));
        }
    }
    module.exports = ServerlessApmPlugin;
} ]);