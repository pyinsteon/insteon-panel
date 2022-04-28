const gulp = require("gulp");
const rollup = require("rollup");
const http = require("http");
const path = require("path");
const fs = require("fs-extra");
const log = require("fancy-log");
const { string } = require("rollup-plugin-string");
const handler = require("serve-handler");
const json = require("@rollup/plugin-json");
const ignore = require("../../homeassistant-frontend/build-scripts/rollup-plugins/ignore-plugin");
const commonjs = require("@rollup/plugin-commonjs");
const babel = require("@rollup/plugin-babel").babel;
const babelTypescript = require("@babel/preset-typescript");
const babelDecorators = require("@babel/plugin-proposal-decorators");
const babelClassProperties = require("@babel/plugin-proposal-class-properties");
const entrypointHashmanifest = require("rollup-plugin-entrypoint-hashmanifest");

const nodeResolve = require("@rollup/plugin-node-resolve");
const gzipPlugin = require("rollup-plugin-gzip");
const { terser } = require("rollup-plugin-terser");

const extensions = [".js", ".ts"];

const entrypoint = "./src/entrypoint.ts";

const DevelopPlugins = [
  string({
    include: ["node_modules/**/*.css"],
  }),
  commonjs(),
  nodeResolve({
    extensions,
    preferBuiltins: false,
    browser: true,
    rootDir: "./src",
  }),
  json({
    compact: true,
    preferConst: true,
  }),
  babel({
    babelrc: false,
    compact: true,
    presets: [babelTypescript.default],
    babelHelpers: "bundled",
    plugins: [
      "@babel/syntax-dynamic-import",
      "@babel/plugin-proposal-optional-chaining",
      "@babel/plugin-proposal-nullish-coalescing-operator",
      [babelDecorators.default, { decoratorsBeforeExport: true }],
      [babelClassProperties.default, { loose: true }],
    ].filter(Boolean),
    extensions,
    exclude: [require.resolve("@mdi/js/mdi.js")],
  }),
  ignore({
    files: [
      require.resolve("@polymer/font-roboto/roboto.js"),
      path.resolve("./homeassistant-frontend/src/components/ha-icon.ts"),
    ],
  }),
  entrypointHashmanifest({ manifestName: "./insteon_frontend/manifest.json" }),
];

const BuildPlugins = DevelopPlugins.concat([
  terser({
    output: { comments: false },
  }),
  gzipPlugin.default(),
]);

const inputconfig = {
  input: entrypoint,
  plugins: DevelopPlugins,
  preserveEntrySignatures: false,
};
const outputconfig = (isDev) => {
  return {
    dir: "./insteon_frontend/",
    chunkFileNames: !isDev ? "c.[hash].js" : "[name]-dev.js",
    assetFileNames: !isDev ? "a.[hash].js" : "[name]-dev.js",
    entryFileNames: !isDev ? "[name]-[hash].js" : "[name]-dev.js",
    format: "es",
    intro: `const __DEMO__ = false;
    const __SUPERVISOR__ = true`,
  };
};

function createServer() {
  const server = http.createServer((request, response) => {
    return handler(request, response, {
      public: "./insteon_frontend/",
    });
  });

  server.listen(5001, true, () => {
    log.info("File will be served to http://127.0.0.1:5001/entrypoint.js");
  });
}

gulp.task("rollup-develop", () => {
  const watcher = rollup.watch({
    input: inputconfig.input,
    plugins: inputconfig.plugins,
    output: outputconfig(true),
    preserveEntrySignatures: false,
    watch: {
      include: ["./src/**"],
      chokidar: {
        usePolling: true,
      },
    },
  });

  let startedHttp = false;
  let first = true;

  watcher.on("event", (event) => {
    if (!startedHttp) {
      startedHttp = true;
      createServer();
    }
    if (event.code === "BUNDLE_START") {
      log(`Build started @ ${new Date().toLocaleTimeString()}`);
    } else if (event.code === "BUNDLE_END") {
      if (first) {
        writeEntrypointHash();
        first = false;
      }

      log(`Build done @ ${new Date().toLocaleTimeString()}`);
    } else if (event.code === "ERROR") {
      log.error(event.error);
    }
  });
});

gulp.task("rollup-build", async function (task) {
  inputconfig.plugins = BuildPlugins;
  const bundle = await rollup.rollup(inputconfig);
  await bundle.write(outputconfig(false));
  writeEntrypointHash();
  task();
});

function writeEntrypointHash() {
  const entrypointManifest = require(path.resolve("./insteon_frontend/manifest.json"));
  const entrypointFile = entrypointManifest[entrypoint];
  const fileElements = entrypointFile.split("-");
  const fileHash = fileElements[1].split(".")[0];

  fs.writeFileSync(
    path.resolve("./insteon_frontend/constants.py"),
    `
FILE_HASH = '${fileHash}'
`
  );
}
