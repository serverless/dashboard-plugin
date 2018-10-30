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
    return __webpack_require__(__webpack_require__.s = 11);
}([ function(module, exports) {
    module.exports = require("lodash");
}, function(module, exports) {
    module.exports = require("debug");
}, function(module, exports) {
    module.exports = require("fs-extra");
}, function(module, exports) {
    module.exports = require("path");
}, function(module, exports) {
    module.exports = "let handler, handlerError;\n// The following is an automatically generated require statement by the plugin,\n// aimed to provide syntax/type errors to the IOpipe service.\n// The original file is imported as text with capitalized tokens replaced.\ntry {\n  handler = require('../RELATIVE_PATH');\n} catch (err) {\n  handlerError = err;\n}\n\nexports['EXPORT_NAME'] = apm.lambda('AWS', (event, context, callback) => {\n  return handler.METHOD(evt, ctx, cb);\n})";
}, function(module, __webpack_exports__, __webpack_require__) {
    "use strict";
    var __WEBPACK_IMPORTED_MODULE_0_lodash__ = __webpack_require__(0);
    var __WEBPACK_IMPORTED_MODULE_0_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash__);
    __webpack_exports__["a"] = function(startTime = process.hrtime(), suffix = true) {
        const endTime = process.hrtime(startTime);
        const millis = __WEBPACK_IMPORTED_MODULE_0_lodash___default.a.round(endTime[0] * 1e3 + endTime[1] / 1e6);
        return suffix ? `${millis}ms` : millis;
    };
}, function(module, __webpack_exports__, __webpack_require__) {
    "use strict";
    __webpack_exports__["a"] = getVisitor;
    __webpack_exports__["b"] = track;
    var __WEBPACK_IMPORTED_MODULE_0_path__ = __webpack_require__(3);
    var __WEBPACK_IMPORTED_MODULE_0_path___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_path__);
    var __WEBPACK_IMPORTED_MODULE_1_crypto__ = __webpack_require__(12);
    var __WEBPACK_IMPORTED_MODULE_1_crypto___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_crypto__);
    var __WEBPACK_IMPORTED_MODULE_2_universal_analytics__ = __webpack_require__(13);
    var __WEBPACK_IMPORTED_MODULE_2_universal_analytics___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_universal_analytics__);
    var __WEBPACK_IMPORTED_MODULE_3_fs_extra__ = __webpack_require__(2);
    var __WEBPACK_IMPORTED_MODULE_3_fs_extra___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_fs_extra__);
    var __WEBPACK_IMPORTED_MODULE_4_lodash__ = __webpack_require__(0);
    var __WEBPACK_IMPORTED_MODULE_4_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4_lodash__);
    var __WEBPACK_IMPORTED_MODULE_5_uuid__ = __webpack_require__(14);
    var __WEBPACK_IMPORTED_MODULE_5_uuid___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5_uuid__);
    var __WEBPACK_IMPORTED_MODULE_6_debug__ = __webpack_require__(1);
    var __WEBPACK_IMPORTED_MODULE_6_debug___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_6_debug__);
    const debug = __WEBPACK_IMPORTED_MODULE_6_debug___default()("serverless-plugin-iopipe:track");
    function getVisitor(pluginInstance) {
        let pkg = {};
        if (!pluginInstance.getOptions().noStats) {
            try {
                pkg = __WEBPACK_IMPORTED_MODULE_3_fs_extra___default.a.readJsonSync(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_path__["join"])(pluginInstance.prefix, "package.json"));
            } catch (err) {
                __WEBPACK_IMPORTED_MODULE_4_lodash___default.a.noop();
            }
        }
        const str = pkg.author || __WEBPACK_IMPORTED_MODULE_4_lodash___default.a.get(pkg, "repository.url") || pkg.name || pkg.homepage || __WEBPACK_IMPORTED_MODULE_5_uuid___default.a.v4();
        const userId = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_crypto__["createHash"])("md5").update(str).digest("hex");
        const visitor = __WEBPACK_IMPORTED_MODULE_2_universal_analytics___default()("UA-73165042-2", userId, {
            strictCidFormat: false,
            https: true
        });
        return visitor;
    }
    function track(pluginInstance, obj = {}) {
        const {visitor: visitor} = pluginInstance;
        if (!visitor) {
            return Promise.resolve("no-visitor");
        }
        if (pluginInstance.getOptions().noStats) {
            return Promise.resolve("no-stats");
        }
        const {category: category = "event", action: action = "action", label: label = "label", value: value} = obj;
        const newLabel = __WEBPACK_IMPORTED_MODULE_4_lodash___default.a.isString(label) ? label : JSON.stringify(label);
        debug(`Tracking ${category}: ${action}`);
        return new Promise((resolve, reject) => {
            visitor.event(category, action, newLabel, value, (err, res) => {
                return err ? reject(err) : resolve(res);
            });
        });
    }
}, function(module, exports) {
    module.exports = function(originalModule) {
        if (!originalModule.webpackPolyfill) {
            var module = Object.create(originalModule);
            if (!module.children) module.children = [];
            Object.defineProperty(module, "loaded", {
                enumerable: true,
                get: function() {
                    return module.l;
                }
            });
            Object.defineProperty(module, "id", {
                enumerable: true,
                get: function() {
                    return module.i;
                }
            });
            Object.defineProperty(module, "exports", {
                enumerable: true
            });
            module.webpackPolyfill = 1;
        }
        return module;
    };
}, function(module, exports) {
    module.exports = {
        author: "Serverless <dev@serverless.com>",
        dependencies: {
            cosmiconfig: "^3",
            debug: "^2.6.8",
            del: "^3.0.0",
            "fs-extra": "^5.0.0",
            lodash: "^4.17.4",
            "universal-analytics": "^0.4.13",
            uuid: "^3.0.1"
        },
        description: "Serverless Plugin APM",
        devDependencies: {
            "babel-core": "6",
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
        engines: {
            node: ">=4.2.6"
        },
        files: [ "dist/" ],
        homepage: "https://github.com/serverless/serverless-plugin-apm#readme",
        jest: {
            testPathIgnorePatterns: [ "node_modules/", "dist/", "testProjects/" ]
        },
        main: "src/index.js",
        name: "serverless-plugin-apm",
        "pre-commit": [ "lint" ],
        scripts: {
            build: "NODE_ENV=production npm run folder && npm run webpack && npm run uglify",
            commit: "apm-scripts commit",
            folder: "rm -rf dist && mkdir dist",
            lint: "apm-scripts lint",
            prepublish: "npm run build",
            release: "apm-scripts release",
            sls: "LOCAL_PLUGIN=true SLS_DEBUG=* cd testProject && yarn && npm run build && cd ../",
            slsDeploy: "LOCAL_PLUGIN=true SLS_DEBUG=* cd testProject && yarn && npm run deploy && cd ../",
            test: "apm-scripts test",
            testProjects: "node util/testProjects",
            uglify: "./node_modules/uglify-es/bin/uglifyjs dist/index.js --output dist/index.js --beautify",
            validate: "npm run lint && npm run build && npm run test && npm run testProjects",
            webpack: "webpack"
        }
    };
}, function(module, exports) {
    module.exports = require("child_process");
}, function(module, exports) {
    module.exports = require("cosmiconfig");
}, function(module, __webpack_exports__, __webpack_require__) {
    "use strict";
    Object.defineProperty(__webpack_exports__, "__esModule", {
        value: true
    });
    (function(module) {
        var __WEBPACK_IMPORTED_MODULE_0_child_process__ = __webpack_require__(9);
        var __WEBPACK_IMPORTED_MODULE_0_child_process___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_child_process__);
        var __WEBPACK_IMPORTED_MODULE_1_path__ = __webpack_require__(3);
        var __WEBPACK_IMPORTED_MODULE_1_path___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_path__);
        var __WEBPACK_IMPORTED_MODULE_2_lodash__ = __webpack_require__(0);
        var __WEBPACK_IMPORTED_MODULE_2_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_lodash__);
        var __WEBPACK_IMPORTED_MODULE_3_fs_extra__ = __webpack_require__(2);
        var __WEBPACK_IMPORTED_MODULE_3_fs_extra___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_fs_extra__);
        var __WEBPACK_IMPORTED_MODULE_4_debug__ = __webpack_require__(1);
        var __WEBPACK_IMPORTED_MODULE_4_debug___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4_debug__);
        var __WEBPACK_IMPORTED_MODULE_5_cosmiconfig__ = __webpack_require__(10);
        var __WEBPACK_IMPORTED_MODULE_5_cosmiconfig___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5_cosmiconfig__);
        var __WEBPACK_IMPORTED_MODULE_6__package__ = __webpack_require__(8);
        var __WEBPACK_IMPORTED_MODULE_6__package___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_6__package__);
        var __WEBPACK_IMPORTED_MODULE_7__util_track__ = __webpack_require__(6);
        var __WEBPACK_IMPORTED_MODULE_8__util_hrMillis__ = __webpack_require__(5);
        var __WEBPACK_IMPORTED_MODULE_9__handlerCode__ = __webpack_require__(4);
        var __WEBPACK_IMPORTED_MODULE_9__handlerCode___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_9__handlerCode__);
        function createDebugger(suffix) {
            return __WEBPACK_IMPORTED_MODULE_4_debug___default()(`serverless-plugin-apm:${suffix}`);
        }
        function outputHandlerCode(obj = {}) {
            const {name: name, relativePath: relativePath, method: method} = obj;
            const fnName = __WEBPACK_IMPORTED_MODULE_2_lodash___default.a.camelCase(`attempt-${name}`);
            return __WEBPACK_IMPORTED_MODULE_9__handlerCode___default.a.replace(/EXPORT_NAME/g, name).replace(/FUNCTION_NAME/g, fnName).replace(/RELATIVE_PATH/g, relativePath).replace(/METHOD/g, method);
        }
        class ServerlessAPMPlugin {
            constructor(sls = {}, opts) {
                this.sls = sls;
                this.prefix = opts.prefix || this.sls.config.servicePath || process.env.npm_config_prefix;
                this.visitor = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_7__util_track__["a"])(this);
                this.package = {};
                this.funcs = [];
                this.originalServicePath = this.sls.config.servicePath;
                this.commands = {
                    apm: {
                        usage: "Automatically wraps your function handlers in APM, so you don't have to.",
                        lifecycleEvents: [ "run", "clean" ],
                        commands: {
                            clean: {
                                usage: "Cleans up extra APM files if necessary",
                                lifecycleEvents: [ "init" ]
                            }
                        }
                    }
                };
                this.hooks = {
                    "before:package:createDeploymentArtifacts": this.run.bind(this),
                    "before:deploy:function:packageFunction": this.run.bind(this),
                    "before:invoke:local:invoke": this.run.bind(this),
                    "before:offline:start:init": this.run.bind(this),
                    "before:step-functions-offline:start": this.run.bind(this),
                    "after:package:createDeploymentArtifacts": this.finish.bind(this),
                    "after:invoke:local:invoke": this.finish.bind(this),
                    "apm:clean:init": this.finish.bind(this)
                };
            }
            getOptions(obj = this.options) {
                this.options = __WEBPACK_IMPORTED_MODULE_2_lodash___default.a.chain(obj).defaults(this.options).defaults({
                    quote: "single",
                    handlerDir: "apm_handlers"
                }).mapKeys((val, key) => __WEBPACK_IMPORTED_MODULE_2_lodash___default.a.camelCase(key)).value();
                return this.options;
            }
            log(arg1, ...rest) {
                const logger = this.sls.cli.log || console.log;
                logger.call(this.sls.cli, `serverless-plugin-apm: ${arg1}`, ...rest);
            }
            track(kwargs) {
                return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_7__util_track__["b"])(this, kwargs);
            }
            greeting() {
                this.log("Welcome to the APM Serverless plugin. You can use this plugin for sls invoke local or sls deploy.");
            }
            async run() {
                const start = process.hrtime();
                this.track({
                    action: "run-start"
                });
                this.log("Wrapping your functions with APM|...");
                this.getFuncs();
                this.createFiles();
                this.assignHandlers();
                this.track({
                    action: "run-finish",
                    value: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_8__util_hrMillis__["a"])(start)
                });
            }
            getFuncs() {
                try {
                    const {servicePath: servicePath} = this.sls.config;
                    this.funcs = __WEBPACK_IMPORTED_MODULE_2_lodash___default.a.chain(this.sls.service.functions).omit(this.getOptions().exclude).toPairs().reject(arr => {
                        const key = arr[0];
                        const obj = arr[1];
                        if (__WEBPACK_IMPORTED_MODULE_2_lodash___default.a.isString(obj.runtime) && !obj.runtime.match("node")) {
                            this.log(`Function "${key}" is not Node.js. Currently the plugin only supports Node.js functions. Skipping ${key}.`);
                            return true;
                        }
                        return false;
                    }).map(arr => {
                        const [key, obj] = arr;
                        const handlerArr = __WEBPACK_IMPORTED_MODULE_2_lodash___default.a.isString(obj.handler) ? obj.handler.split(".") : [];
                        const relativePath = handlerArr.slice(0, -1).join(".");
                        const path = `${servicePath}/${relativePath}.js`;
                        return __WEBPACK_IMPORTED_MODULE_2_lodash___default.a.assign({}, obj, {
                            method: __WEBPACK_IMPORTED_MODULE_2_lodash___default.a.last(handlerArr),
                            path: path,
                            name: key,
                            relativePath: relativePath,
                            file: __WEBPACK_IMPORTED_MODULE_2_lodash___default.a.last((handlerArr.slice(-2, -1)[0] || "").split("/"))
                        });
                    }).value();
                    this.track({
                        action: "funcs-count",
                        value: this.funcs.length
                    });
                } catch (err) {
                    this.track({
                        action: "get-funcs-fail",
                        value: err
                    });
                    console.error("Failed to read functions from serverless.yml.");
                    throw new Error(err);
                }
            }
            createFiles() {
                const debug = createDebugger("createFiles");
                debug("Creating file");
                const {handlerDir: handlerDir} = this.getOptions();
                const apmInclude = function(fnName) {
                    return `var apm = require('elastic-apm-node').start({\n        serviceName: '${fnName}',\n        secretToken: '',\n        serverUrl: ''\n      })`;
                };
                this.funcs.forEach(func => {
                    const handler = outputHandlerCode(func.name);
                    const contents = `${apmInclude}\n\n${handler}`;
                    __WEBPACK_IMPORTED_MODULE_3_fs_extra___default.a.ensureDirSync(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_path__["join"])(this.originalServicePath, handlerDir));
                    __WEBPACK_IMPORTED_MODULE_3_fs_extra___default.a.writeFileSync(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_path__["join"])(this.originalServicePath, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_path__["join"])(handlerDir, `${func.name}-apm.js`)), contents);
                });
            }
            assignHandlers() {
                const debug = createDebugger("assignHandlers");
                debug("Assigning apm handlers to sls service");
                const {handlerDir: handlerDir} = this.getOptions();
                this.funcs.forEach(obj => {
                    __WEBPACK_IMPORTED_MODULE_2_lodash___default.a.set(this.sls.service.functions, `${obj.name}.handler`, __WEBPACK_IMPORTED_MODULE_1_path__["posix"].join(handlerDir, `${obj.name}-apm.${obj.name}`));
                });
            }
            finish() {
                const debug = createDebugger("finish");
                this.log("Cleaning up extraneous apm files");
                debug(`Removing ${this.handlerFileName}.js`);
                const {handlerDir: handlerDir = "apm_handlers"} = this.getOptions();
                __WEBPACK_IMPORTED_MODULE_3_fs_extra___default.a.removeSync(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_path__["join"])(this.originalServicePath, handlerDir));
                this.track({
                    action: "finish"
                }).then(__WEBPACK_IMPORTED_MODULE_2_lodash___default.a.noop).catch(debug);
            }
        }
        module.exports = ServerlessAPMPlugin;
    }).call(__webpack_exports__, __webpack_require__(7)(module));
}, function(module, exports) {
    module.exports = require("crypto");
}, function(module, exports) {
    module.exports = require("universal-analytics");
}, function(module, exports) {
    module.exports = require("uuid");
} ]);