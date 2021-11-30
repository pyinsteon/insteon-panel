const fs = require("fs");

let rawcore = fs.readFileSync("./homeassistant-frontend/package.json");
let rawinsteon = fs.readFileSync("./package.json");

const core = JSON.parse(rawcore);
const insteon = JSON.parse(rawinsteon);

fs.writeFileSync(
  "./package.json",
  JSON.stringify(
    {
      ...insteon,
      resolutions: { ...core.resolutions, ...insteon.resolutionsOverride },
      dependencies: { ...core.dependencies, ...insteon.dependenciesOverride },
      devDependencies: { ...core.devDependencies, ...insteon.devDependenciesOverride },
    },
    null,
    2
  )
);
