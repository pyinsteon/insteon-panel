import gulp from "gulp";
import env from "../env.cjs";

import "./clean.js";
import "./compress.js";
import "./entry-html.js";
import "./gen-icons-json.js";
import "./lint-types.js";
import "./rspack.js";
import "./translations.js";
import "./locale-data.js";

gulp.task(
  "develop-insteon",
  gulp.series(
    async () => {
      process.env.NODE_ENV = "development";
    },
    "clean-insteon",
    "gen-icons-json",
    "build-translations",
    "build-locale-data",
    "gen-index-insteon-dev",
    "rspack-watch-insteon",
  ),
);

gulp.task(
  "build-insteon",
  gulp.series(
    async () => {
      process.env.NODE_ENV = "production";
    },
    "clean-insteon",
    "ensure-insteon-build-dir",
    "gen-icons-json",
    "build-translations",
    "build-locale-data",
    "lint-types",
    "rspack-prod-insteon",
    "gen-index-insteon-prod",
    ...// Don't compress running tests
    (env.isTest() ? [] : ["compress-insteon"]),
  ),
);
