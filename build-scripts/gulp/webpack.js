// Tasks to run webpack.

import log from "fancy-log";
import fs from "fs";
import gulp from "gulp";
import webpack from "webpack";
import paths from "../paths.cjs";
import { createPanelConfig } from "../webpack.cjs";

const bothBuilds = (createConfigFunc, params) => [
  createConfigFunc({ ...params, latestBuild: true }),
  createConfigFunc({ ...params, latestBuild: false }),
];

const isWsl =
  fs.existsSync("/proc/version") &&
  fs
    .readFileSync("/proc/version", "utf-8")
    .toLocaleLowerCase()
    .includes("microsoft");

gulp.task("ensure-panel-build-dir", (done) => {
  if (!fs.existsSync(paths.panel_output_root)) {
    fs.mkdirSync(paths.panel_output_root, { recursive: true });
  }
  if (!fs.existsSync(paths.app_output_root)) {
    fs.mkdirSync(paths.app_output_root, { recursive: true });
  }
  done();
});

const doneHandler = (done) => (err, stats) => {
  if (err) {
    log.error(err.stack || err);
    if (err.details) {
      log.error(err.details);
    }
    return;
  }

  if (stats.hasErrors() || stats.hasWarnings()) {
    // eslint-disable-next-line no-console
    console.log(stats.toString("minimal"));
  }

  log(`Build done @ ${new Date().toLocaleTimeString()}`);

  if (done) {
    done();
  }
};

const prodBuild = (conf) =>
  new Promise((resolve) => {
    webpack(
      conf,
      // Resolve promise when done. Because we pass a callback, webpack closes itself
      doneHandler(resolve)
    );
  });

gulp.task("webpack-watch-panel", () => {
  // This command will run forever because we don't close compiler
  webpack(
    createPanelConfig({
      isProdBuild: false,
      latestBuild: true,
    })
  ).watch({ ignored: /build/, poll: isWsl }, doneHandler());
});

gulp.task("webpack-prod-panel", () =>
  prodBuild(
    bothBuilds(createPanelConfig, {
      isProdBuild: true,
    })
  )
);
