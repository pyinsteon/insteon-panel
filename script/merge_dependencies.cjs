const fs = require("fs");

const rawPackageCore = fs.readFileSync("./homeassistant-frontend/package.json");
const rawPackageApp = fs.readFileSync("./package.json.project");

const packageCore = JSON.parse(rawPackageCore);
const packageApp = JSON.parse(rawPackageApp);

const yarnDirRegExp = /\.yarn\//g;
const yarnDirSubModule = "homeassistant-frontend/.yarn/";

const subdirResolutions = Object.fromEntries(
  Object.entries(packageCore.resolutions).map(([key, value]) => [
    key,
    value.replace(yarnDirRegExp, yarnDirSubModule),
  ])
);

fs.writeFileSync(
  "./package.json",
  JSON.stringify(
    {
      ...packageApp,
      resolutions: { ...packageApp.resolutions, ...subdirResolutions },
      dependencies: { ...packageApp.dependencies, ...packageCore.dependencies },
      devDependencies: {
        ...packageApp.devDependencies,
        ...packageCore.devDependencies,
      },
      prettier: { ...packageApp.prettier, ...packageCore.prettier },
      packageManager: packageCore.packageManager,
    },
    null,
    2
  )
);

const yarnRcCore = fs.readFileSync(
  "./homeassistant-frontend/.yarnrc.yml",
  "utf8"
);
const yarnRcApp = yarnRcCore.replace(yarnDirRegExp, yarnDirSubModule);
fs.writeFileSync("./.yarnrc.yml", yarnRcApp);
