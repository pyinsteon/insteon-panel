/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

module.exports = {
  polymer_dir: path.resolve(__dirname, ".."),

  build_dir: path.resolve(__dirname, "../build"),
  app_output_root: path.resolve(__dirname, "../build"),
  app_output_static: path.resolve(__dirname, "../build/static"),
  app_output_latest: path.resolve(__dirname, "../build/frontend_latest"),
  app_output_es5: path.resolve(__dirname, "../build/frontend_es5"),

  // demo_dir: path.resolve(__dirname, "../demo"),
  // demo_output_root: path.resolve(__dirname, "../demo/dist"),
  // demo_output_static: path.resolve(__dirname, "../demo/dist/static"),
  // demo_output_latest: path.resolve(__dirname, "../demo/dist/frontend_latest"),
  // demo_output_es5: path.resolve(__dirname, "../demo/dist/frontend_es5"),

  // cast_dir: path.resolve(__dirname, "../cast"),
  // cast_output_root: path.resolve(__dirname, "../cast/dist"),
  // cast_output_static: path.resolve(__dirname, "../cast/dist/static"),
  // cast_output_latest: path.resolve(__dirname, "../cast/dist/frontend_latest"),
  // cast_output_es5: path.resolve(__dirname, "../cast/dist/frontend_es5"),

  // gallery_dir: path.resolve(__dirname, "../gallery"),
  // gallery_build: path.resolve(__dirname, "../gallery/build"),
  // gallery_output_root: path.resolve(__dirname, "../gallery/dist"),
  // gallery_output_latest: path.resolve(__dirname, "../gallery/dist/frontend_latest"),
  // gallery_output_static: path.resolve(__dirname, "../gallery/dist/static"),

  // hassio_dir: path.resolve(__dirname, "../hassio"),
  // hassio_output_root: path.resolve(__dirname, "../hassio/build"),
  // hassio_output_static: path.resolve(__dirname, "../hassio/build/static"),
  // hassio_output_latest: path.resolve(__dirname, "../hassio/build/frontend_latest"),
  // hassio_output_es5: path.resolve(__dirname, "../hassio/build/frontend_es5"),
  // hassio_publicPath: "/api/hassio/app",

  insteon_dir: path.resolve(__dirname, ".."),
  insteon_output_root: path.resolve(__dirname, "../build"),
  insteon_output_static: path.resolve(__dirname, "../build/static"),
  insteon_output_latest: path.resolve(__dirname, "../build/frontend_latest"),
  insteon_output_es5: path.resolve(__dirname, "../build/frontend_es5"),
  insteon_publicPath: "/insteon",

  translations_src: path.resolve(__dirname, "../src/translations"),
};
