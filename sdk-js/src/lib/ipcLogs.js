/* eslint-disable no-console */
'use strict';

const net = require('net');
const util = require('util');

const IPC_SOCK = '/tmp/ipcLogs.sock';
const DELIMITER = '|';

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
    data: dataObj,
    timestamp: Date.now(),
  };

  const message = Buffer.from(JSON.stringify(messageObj)).toString('base64');
  this.intercepts.socket.write(`${message}${DELIMITER}`);
};

const startInterceptingLogs = (event, context) => {
  const socket = net.connect({
    path: IPC_SOCK,
  });

  this.intercepts = {};
  this.intercepts.socket = socket;
  this.intercepts.requestId = context.awsRequestId;
};

const stopInterceptingLogs = () => {
  this.intercepts.socket.end();
};

module.exports = {
  startInterceptingLogs,
  stopInterceptingLogs,
  sendIpc,
};
