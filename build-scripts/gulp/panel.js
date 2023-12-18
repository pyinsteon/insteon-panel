/* eslint @typescript-eslint/no-var-requires: "off", import/extensions: "off" */
import gulp from "gulp";
import env from "../env.cjs";

import "./clean.js";
import "./webpack.js";
import "./compress.js";
import "./entry-html.js";
import "./gen-dummy-icons-json.js";

gulp.task(
  "develop-panel",
  gulp.series(
    async () => {
      process.env.NODE_ENV = "development";
    },
    "clean-panel",
    "gen-dummy-icons-json",
    "gen-index-panel-dev",
    "webpack-watch-panel",
  ),
);

gulp.task(
  "build-panel",
  gulp.series(
    async () => {
      process.env.NODE_ENV = "production";
    },
    "clean-panel",
    "ensure-panel-build-dir",
    "gen-dummy-icons-json",
    "webpack-prod-panel",
    "gen-index-panel-prod",
    // Don't compress running tests
    ...(env.isTestBuild() ? [] : ["compress-panel"]),
  ),
);
