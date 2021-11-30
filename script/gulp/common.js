const gulp = require("gulp");
const del = require("del");
require("./rollup.js");
require("./translations");

gulp.task("cleanup", (task) => {
  del.sync(["./homeassistant-frontend/build/**", "./homeassistant-frontend/build"]);
  del.sync(["./insteon_frontend/*.js", "./insteon_frontend/*.json", "./insteon_frontend/*.gz"]);
  task();
});

gulp.task("common", gulp.series("cleanup", "generate-translations"));
