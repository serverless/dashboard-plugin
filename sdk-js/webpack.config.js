'use strict';

const path = require('path');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: {
    app: [path.resolve(__dirname, './src/index.js')],
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'index.js',
    libraryTarget: 'umd',
  },
  externals: {
    // Dynamic imports that are never used (gets rid of bundle warning).
    'bufferutil': 'bufferutil',
    'original-fs': 'original-fs',
    'utf-8-validate': 'utf-8-validate',
  },
};
