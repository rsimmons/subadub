const webpack = require("webpack");
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    content_script: path.resolve(__dirname, './src/content_script.ts')
  },
  output: {
    path: path.join(__dirname, './dist'),
    filename: '[name].js'
  },
  optimization: {
    minimize: false
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  plugins: [
    new CopyPlugin([
      { from: './res', to: '.' },
      { from: './src/subadub.css', to: 'subadub.css' }
    ])
  ]
};
