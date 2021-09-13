/* eslint-disable no-console */
'use strict';

const { isError } = require('lodash');
const net = require('net');
const util = require('util');

const IPC_SOCK = '/tmp/ipcLogs.sock';

const MAX_STR_LEN = 3200;
const truncateString = (str) => {
  return str.length < MAX_STR_LEN ? str : Buffer.from(str).slice(0, MAX_STR_LEN).toString();
};

const errToObj = (err) => {
  if (isError(err)) {
    return {
      type: err.name,
      message: truncateString(err.message),
      stacktrace: truncateString(err.stack),
    };
  }

  return {
    type: 'CapturedError',
    message: truncateString(err),
  };
};

const sendIpc = (type, dataObj) => {
  if (!this.intercepts || !this.intercepts.socket) {
    // Must not be using extension, bail
    return;
  }

  if (!['open', 'opening'].includes(this.intercepts.socket.readyState)) {
    throw new Error(`IPC socket is closed attempting to write ${type}: ${util.inspect(dataObj)}`);
  }

  const messageObj = {
    type,
    requestId: this.intercepts.requestId,
    // Error types get mangled when inspected and stringified
    data: ['error', 'capturedError'].includes(type) ? errToObj(dataObj) : dataObj || {},
    timestamp: Date.now(),
  };

  const message = Buffer.from(JSON.stringify(messageObj)).toString('base64');
  this.intercepts.socket.write(`${message}|`);
};

const startInterceptingLogs = (event, context) => {
  const socket = net.connect({
    path: IPC_SOCK,
  });

  this.intercepts = {};
  this.intercepts.socket = socket;
  this.intercepts.requestId = context.awsRequestId;

  this.intercepts.console = {};
  this.intercepts.console.log = console.log;
  this.intercepts.console.debug = console.debug;
  this.intercepts.console.info = console.info;
  this.intercepts.console.error = console.error;
  this.intercepts.console.warn = console.warn;

  this.intercepts.stdout = {};
  this.intercepts.stdout.write = process.stdout.write.bind(process.stdout);

  this.intercepts.stderr = {};
  this.intercepts.stderr.write = process.stderr.write.bind(process.stderr);

  // Set Intercept function
  const intercept = (type, logs) => {
    // Add to logs queue, and add type of log
    const log = { type };
    log.createdAt = Date.now();
    log.data = logs; // util.inspect converts circular objects to '[Circular]'.  Without, errors will happen on stringify...

    sendIpc('log', log);
  };

  // Replace console methods
  console.log = (...args) => {
    intercept('log', args);
  };
  console.debug = (...args) => {
    intercept('debug', args);
  };
  console.info = (...args) => {
    intercept('info', args);
  };
  console.error = (...args) => {
    intercept('error', args);
  };
  console.warn = (...args) => {
    intercept('warn', args);
  };
  process.stdout.write = (...args) => {
    intercept('stdout', args);
  };
  process.stderr.write = (...args) => {
    intercept('stderr', args);
  };
};

const stopInterceptingLogs = () => {
  // Replace console methods
  console.log = this.intercepts.console.log;
  console.debug = this.intercepts.console.debug;
  console.info = this.intercepts.console.info;
  console.error = this.intercepts.console.error;
  console.warn = this.intercepts.console.warn;

  process.stdout.write = this.intercepts.stdout.write;
  process.stderr.write = this.intercepts.stderr.write;

  this.intercepts.socket.end();
};

module.exports = {
  startInterceptingLogs,
  stopInterceptingLogs,
  sendIpc,
};
