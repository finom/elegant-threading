const path = require('path');
const webpack = require('webpack');

module.exports = [{
  devtool: 'source-map',
  entry: path.join(__dirname, '/lol'),
  optimization: {
    minimize: false,
    runtimeChunk: true,
  },
  output: {
    path: path.join(__dirname, '/tmp'),
    filename: 'yop.min.js',
    libraryTarget: 'commonjs2',
    library: 'Hey',
  },
  module: {
    rules: [{
      test: /\.js$/,
      use: ['babel-loader'],
    }],
  },
}];
