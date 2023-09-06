// Tasks to compress

import gulp from "gulp";
import zopfli from "gulp-zopfli-green";
import path from "path";
import paths from "../paths.cjs";

const zopfliOptions = { threshold: 150 };

gulp.task("compress-panel", () =>
  gulp
    .src(path.resolve(paths.panel_output_root, "**/*.js"))
    .pipe(zopfli(zopfliOptions))
    .pipe(gulp.dest(paths.panel_output_root))
);
