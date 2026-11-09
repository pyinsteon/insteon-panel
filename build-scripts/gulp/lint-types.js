import { execSync } from "child_process";
import gulp from "gulp";
import log from "fancy-log";

gulp.task("lint-types", (done) => {
  let output;
  try {
    output = execSync("tsc --pretty false --project tsconfig.json", { encoding: "utf-8" });
  } catch (err) {
    const stdout = err && err.stdout != null ? String(err.stdout) : "";
    const stderr = err && err.stderr != null ? String(err.stderr) : "";
    output = `${stdout}\n${stderr}`.trim();
  }
  const srcErrors = output.split("\n").filter((line) => line.startsWith("src/"));
  if (srcErrors.length > 0) {
    srcErrors.forEach((line) => log.error(line));
    throw new Error(`TypeScript: ${srcErrors.length} error(s) found in src/`);
  }
  done();
});
