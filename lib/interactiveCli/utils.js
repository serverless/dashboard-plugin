'use strict';

module.exports = {
  sleep: (timeout) => new Promise((resolve) => setTimeout(resolve, timeout)),
};
