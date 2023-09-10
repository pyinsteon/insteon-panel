/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const path = require("path");
const config = require("../config.cjs");

if (!config.publicPath || config.publicPath == "/custom_panel") {
  throw Error(
    "publicPath must be changed in config.cjs file and must be unique across Home Assistant.",
  );
}

// Get the panel build directory from the "include" param of pyproject.toml
const polymer_dir = path.resolve(__dirname, "..");
const panel_frontend_dir =
  "../" +
  fs
    .readFileSync(path.resolve(polymer_dir, "pyproject.toml"), "utf8")
    .match(/include\W+=\W+\["(.*?)\*"\]/)[1];

if (!panel_frontend_dir) {
  throw Error("Panel build dir not found");
}
console.log("panel frontend dir: " + panel_frontend_dir);
module.exports = {
  polymer_dir: polymer_dir,
  panel_frontend_dir: panel_frontend_dir,
  src_dir: path.resolve(__dirname, "../src"),

  build_dir: path.resolve(__dirname, "../homeassistant-frontend/build"),
  app_output_root: path.resolve(__dirname, panel_frontend_dir),
  app_output_static: path.resolve(__dirname, panel_frontend_dir + "/static"),
  app_output_latest: path.resolve(
    __dirname,
    panel_frontend_dir + "/frontend_latest",
  ),
  app_output_es5: path.resolve(__dirname, panel_frontend_dir + "/frontend_es5"),

  panel_dir: path.resolve(__dirname, ".."),
  panel_output_root: path.resolve(__dirname, panel_frontend_dir),
  panel_output_static: path.resolve(__dirname, panel_frontend_dir + "/static"),
  panel_output_latest: path.resolve(
    __dirname,
    panel_frontend_dir + "/frontend_latest",
  ),
  panel_output_es5: path.resolve(
    __dirname,
    panel_frontend_dir + "/frontend_es5",
  ),
  panel_publicPath: config.publicPath,

  translations_src: path.resolve(__dirname, "../src/translations"),
};
