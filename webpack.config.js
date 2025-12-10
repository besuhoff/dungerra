const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const { env } = require("process");

module.exports = {
  entry: "./src/main.ts",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            allowTsInNodeModules: true,
          },
        },
        exclude: /node_modules\/(?!dungeon-game-go)/,
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
        generator: {
          filename: "assets/[hash][ext][query]",
        },
      },
      {
        test: /\.ogg$/i,
        type: "asset/resource",
        generator: {
          filename: "assets/[hash][ext][query]",
        },
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "[name].[contenthash].js",
    path: path.resolve(__dirname, "docs"),
    clean: true,
    publicPath: process.env.NODE_ENV === "production" ? "/dungeon-game/" : "/",
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
      inject: "body",
      hash: true,
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: "src/favicon.png", to: "favicon.png" }],
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, "dist"),
    },
    compress: true,
    port: 9000,
    hot: true,
  },
};
