'use strict';

const url = require('url');
const http = require('http');
const https = require('https');

const captureHosts = {};
if (process.env.SERVERLESS_ENTERPRISE_SPANS_CAPTURE_HOSTS) {
  const domainNames = process.env.SERVERLESS_ENTERPRISE_SPANS_CAPTURE_HOSTS.toLowerCase()
    .split(',')
    .filter(domain => domain.length > 0);
  Object.assign(captureHosts, ...domainNames.map(domain => ({ [domain]: true })));
} else {
  captureHosts['*'] = true;
}
const ignoreHosts = {};
if (process.env.SERVERLESS_ENTERPRISE_SPANS_IGNORE_HOSTS) {
  const domainNames = process.env.SERVERLESS_ENTERPRISE_SPANS_IGNORE_HOSTS.toLowerCase()
    .split(',')
    .filter(domain => domain.length > 0);
  Object.assign(ignoreHosts, ...domainNames.map(domain => ({ [domain]: true })));
}

module.exports = emitter => {
  function patchModule(_http) {
    if (!_http.request) {
      return _http;
    }
    // Monkey patch the request method with a proxy
    _http.request = new Proxy(_http.request, {
      apply: (_request, _this, _args) => {
        const startTime = Date.now();
        const clientRequest = _request.apply(_this, _args);

        let requestHostname;
        if (_args.length > 0 && _args[0]) {
          if (_args[0].constructor.name === 'String' || _args[0] instanceof url.Url) {
            const requestUrl = url.parse(_args[0]);
            requestHostname = (requestUrl.host || requestUrl.hostname || '').toLowerCase();
          } else {
            requestHostname = (_args[0].host || _args[0].hostname || '').toLowerCase();
          }
        }

        if ((captureHosts['*'] || captureHosts[requestHostname]) && !ignoreHosts[requestHostname]) {
          clientRequest.on('response', response => {
            const endTime = Date.now();

            const userAgent = (_args[0].headers || {})['User-Agent'] || '';
            // we store the __slsCapturedRequest boolean on the callback because on node 8
            // the https library ultimately calls the http library  resultiing in duplicate spans.
            // this avoids that (in node 10+, it doesn't so we can't just wrap the http lib)
            if (
              (!userAgent.startsWith('aws-sdk-nodejs/') ||
                process.env.SERVERLESS_ENTERPRISE_SPANS_CAPTURE_AWS_SDK_HTTP) &&
              !_args.slice(-1)[0].__slsCapturedRequest // eslint-disable-line no-underscore-dangle
            ) {
              // eslint-disable-next-line no-underscore-dangle
              _args.slice(-1)[0].__slsCapturedRequest = true;
              emitter.emit('span', {
                tags: {
                  type: 'http',
                  requestHostname,
                  httpMethod: clientRequest.method,
                  httpStatus: response.statusCode,
                },
                startTime: new Date(startTime).toISOString(),
                endTime: new Date(endTime).toISOString(),
                duration: endTime - startTime,
              });
            }
          });
        }

        return clientRequest;
      },
    });

    // Monkey patch bc of how node 10 changed exports so that request monkeypatches don't affect
    // calls within https module. See original src. this is the same:
    // https://github.com/nodejs/node/blob/v10.x/lib/https.js#L292-L296
    _http.get = (...args) => {
      const req = _http.request(...args);
      req.end();
      return req;
    };

    return _http;
  }

  patchModule(http);
  patchModule(https);
};
