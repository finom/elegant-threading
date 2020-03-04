const path = require('path');
const webpack = require('webpack');

module.exports = {
  devtool: 'source-map',
  entry: './src/index',
  output: {
    path: path.join(__dirname, '/dist'),
    filename: 'elegant-threading.min.js',
    libraryTarget: 'umd',
    library: 'elegantThreading',
  },
  module: {
    rules: [{
      test: /\.js$/,
      use: ['babel-loader'],
    }],
  },
  plugins: [
    new webpack.BannerPlugin(`
      ${process.env.npm_package_name} v${process.env.npm_package_version} (${new Date().toUTCString()})
Made by Andrey Gubanov http://github.com/finom
Released under the MIT license
More info: https://github.com/finom/elegant-threading
    `.trim()),
  ],
};
