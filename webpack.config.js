const webpack = require("webpack");
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const removeSchema = (b) => JSON.stringify(JSON.parse(b.toString()), (k, v) => k === '$schema' ? undefined : v, 2);

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
      { from: './res/**/*.png', to: '.', flatten: true },
      { from: './res/manifest.json', to: 'manifest.json', transform: removeSchema },
      { from: './src/subadub.css', to: 'subadub.css' }
    ])
  ]
};
