'use strict';

const util = require('util');
const afterAll = require('after-all-results');
const stackman = require('stackman')();

exports._MAX_HTTP_BODY_CHARS = 2048; // expose for testing purposes

const mysqlErrorMsg = /(ER_[A-Z_]+): /;

// Default `culprit` to the top of the stack or the highest non `library_frame`
// frame if such exists
function getCulprit(frames) {
  if (frames.length === 0) {
    return null;
  }

  let { filename } = frames[0];
  let fnName = frames[0].function;
  for (let n = 0; n < frames.length; n++) {
    if (!frames[n].library_frame) {
      ({ filename } = frames[n]);
      fnName = frames[n].function;
      break;
    }
  }

  return filename ? `${fnName} (${filename})` : fnName;
}

function getModule(frames) {
  if (frames.length === 0) {
    return null;
  }
  const frame = frames[0];
  if (!frame.library_frame) {
    return null;
  }
  const match = frame.filename.match(/node_modules\/([^/]*)/);
  if (!match) {
    return null;
  }
  return match[1];
}

exports.parseMessage = function (msg) {
  const error = { log: {} };

  if (typeof msg === 'string') {
    error.log.message = msg;
  } else if (typeof msg === 'object' && msg !== null) {
    // if `captureError` is passed an object instead of an error or a string we
    // expect it to be in the format of `{ message: '...', params: [] }` and it
    // will be used as `param_message`.
    if (msg.message) {
      error.log.message = util.format.apply(this, [msg.message].concat(msg.params));
      error.log.param_message = msg.message;
    } else {
      error.log.message = util.inspect(msg);
    }
  } else {
    error.log.message = String(msg);
  }

  return error;
};

exports.parseError = function (err, agent, cb) {
  stackman.callsites(err, (_err, callsites) => {
    if (_err) {
      //   agent.logger.debug('error while getting error callsites: %s', _err.message)
    }

    const errorMsg = String(err.message);
    const error = {
      exception: {
        message: errorMsg,
        type: String(err.name),
      },
    };

    if ('code' in err) {
      error.exception.code = String(err.code);
    } else {
      // To provide better grouping of mysql errors that happens after the async
      // boundery, we modify to exception type to include the custom mysql error
      // type (e.g. ER_PARSE_ERROR)
      const match = errorMsg.match(mysqlErrorMsg);
      if (match) {
        error.exception.code = match[1];
      }
    }

    const props = stackman.properties(err);
    if (props.code) {
      delete props.code;
    } // we already have it directly on the exception
    if (Object.keys(props).length > 0) {
      error.exception.attributes = props;
    }

    const next = afterAll((_, frames) => {
      // As of now, parseCallsite suppresses errors internally, but even if
      // they were passed on, we would want to suppress them here anyway

      // Filter frames that don't have a pre / post context
      // This is causing errors on the front end
      frames = frames.filter((frame) => frame.post_context && frame.pre_context);

      if (frames) {
        const culprit = getCulprit(frames);
        const module = getModule(frames);
        if (culprit) {
          error.culprit = culprit;
        } // TODO: consider moving culprit to exception
        if (module) {
          error.exception.module = module;
        } // TODO: consider if we should include this as it's not originally what module was intended for
        error.exception.stacktrace = frames;
      }

      cb(null, error);
    });

    if (callsites) {
      callsites.forEach((callsite) => {
        exports.parseCallsite(callsite, true, null, next());
      });
    }
  });
};

exports.parseCallsite = function (callsite, isError, agent, cb) {
  const filename = callsite.getFileName();
  const frame = {
    filename: callsite.getRelativeFileName() || '',
    lineno: callsite.getLineNumber(),
    function: callsite.getFunctionNameSanitized(),
    library_frame: !callsite.isApp(),
  };
  if (!Number.isFinite(frame.lineno)) {
    frame.lineno = 0;
  } // this should be an int, but sometimes it's not?! ¯\_(ツ)_/¯
  if (filename) {
    frame.abs_path = filename;
  }

  const lines = 5;
  if (lines === 0 || callsite.isNode()) {
    setImmediate(cb, null, frame);
    return;
  }

  callsite.sourceContext(lines, (err, context) => {
    if (err) {
      console.debug('error while getting callsite source context: %s', err.message);
    } else {
      frame.pre_context = context.pre;
      frame.context_line = context.line.slice(0, 100);
      frame.post_context = context.post;
    }

    cb(null, frame);
  });
};

module.exports.captureAwsRequestSpan = function (resp) {
  const endTime = new Date();

  const awsRegion = resp.request.httpRequest.region || null;
  const hostname = resp.request.service.endpoint.host;
  const awsService = resp.request.service.serviceIdentifier;

  const spanDetails = {
    tags: {
      type: 'aws',
      requestHostname: hostname,
      aws: {
        region: awsRegion,
        service: awsService,
        operation: resp.request.operation,
        requestId: resp.requestId,
        errorCode: (resp.error && resp.error.code) || null,
      },
    },
    startTime: resp.request.startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: endTime.getTime() - resp.request.startTime.getTime(),
  };

  return spanDetails;
};
