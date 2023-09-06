import fs from "fs";
import gulp from "gulp";
import hash from "object-hash";
import path from "path";
import paths from "../paths.cjs";

const OUTPUT_DIR = path.resolve(paths.build_dir, "mdi");

gulp.task("gen-dummy-icons-json", (done) => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(path.resolve(OUTPUT_DIR, "iconList.json"), "[]");
  done();
});
