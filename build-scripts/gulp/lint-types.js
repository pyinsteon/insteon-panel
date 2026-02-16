import { execSync } from "child_process";
import gulp from "gulp";
import log from "fancy-log";

gulp.task("lint-types", (done) => {
  let output;
  try {
    output = execSync("tsc --pretty false --project tsconfig.json", { encoding: "utf-8" });
  } catch (err) {
    output = err.stdout || "";
  }
  const srcErrors = output.split("\n").filter((line) => line.startsWith("src/"));
  if (srcErrors.length > 0) {
    srcErrors.forEach((line) => log.error(line));
    throw new Error(`TypeScript: ${srcErrors.length} error(s) found in src/`);
  }
  done();
});
