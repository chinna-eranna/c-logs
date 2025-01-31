const HtmlWebPackPlugin = require("html-webpack-plugin");
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');

const htmlWebpackPlugin = new HtmlWebPackPlugin({
  template: "./src/index.html",
  filename: "./index.html",
  inlineSource: '.(js|css)$'
});

module.exports = {
  mode: 'development',
  output: {
    path: __dirname + '/dist',
    filename: 'client.js'
  },
  resolve: {
    extensions: ['.wasm', '.js', '.json', '.mjs'],
    mainFields: ['browser', 'main', 'module']
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: "style-loader"
          },
          {
            loader: "css-loader",
            options: {
              modules: true,
              importLoaders: 1,
              localIdentName: "[name]_[local]_[hash:base64]",
              sourceMap: true,
              minimize: true
            }
          }
        ]
      }
    ]
  },
  plugins: [htmlWebpackPlugin, new HtmlWebpackInlineSourcePlugin()]
};
