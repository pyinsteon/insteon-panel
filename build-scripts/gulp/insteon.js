const gulp = require("gulp");

const env = require("../env");

require("./clean.js");
require("./gen-icons-json.js");
require("./webpack.js");
require("./compress.js");
require("./rollup.js");
require("./gather-static.js");
require("./translations-insteon.js");

gulp.task(
  "develop-insteon",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "development";
    },
    "clean-insteon",
    "gen-index-insteon-dev",
    "generate-translations-insteon",
    "webpack-watch-insteon"
  )
);

gulp.task(
  "build-insteon",
  gulp.series(
    async function setEnv() {
      process.env.NODE_ENV = "production";
    },
    "clean-insteon",
    "ensure-insteon-build-dir",
    "generate-translations-insteon",
    "webpack-prod-insteon",
    "gen-index-insteon-prod",
    ...// Don't compress running tests
    (env.isTest() ? [] : ["compress-insteon"])
  )
);
