import { deleteSync } from "del";
import gulp from "gulp";
import paths from "../paths.cjs";

gulp.task("clean-panel", async () =>
  deleteSync([paths.panel_output_root, paths.build_dir])
);
