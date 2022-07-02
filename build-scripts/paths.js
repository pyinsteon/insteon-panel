/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

module.exports = {
  polymer_dir: path.resolve(__dirname, ".."),

  build_dir: path.resolve(__dirname, "../insteon_frontend"),
  app_output_root: path.resolve(__dirname, "../insteon_frontend"),
  app_output_static: path.resolve(__dirname, "../insteon_frontend/static"),
  app_output_latest: path.resolve(__dirname, "../insteon_frontend/frontend_latest"),
  app_output_es5: path.resolve(__dirname, "../insteon_frontend/frontend_es5"),

  insteon_dir: path.resolve(__dirname, ".."),
  insteon_output_root: path.resolve(__dirname, "../insteon_frontend"),
  insteon_output_static: path.resolve(__dirname, "../insteon_frontend/static"),
  insteon_output_latest: path.resolve(__dirname, "../insteon_frontend/frontend_latest"),
  insteon_output_es5: path.resolve(__dirname, "../insteon_frontend/frontend_es5"),
  insteon_publicPath: "/insteon_static",

  translations_src: path.resolve(__dirname, "../src/translations"),
};
