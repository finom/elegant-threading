const path = require('path');

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

  ],
};
