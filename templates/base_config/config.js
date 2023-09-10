import path from "path";

module.exports = {
  // Target directory for the build.
  buildDir: path.resolve(__dirname, "build"),
  nodeDir: path.resolve(__dirname, "../node_modules"),
  // Path where the Home Assistant frontend will be publicly available.
  publicPath: "/custom_panel",
  panel_name: "custom_panel",
};
