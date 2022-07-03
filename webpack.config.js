const { createInsteonConfig } = require("../build-scripts/webpack.js");
const { isProdBuild, isStatsBuild } = require("../build-scripts/env.js");

module.exports = createInsteonConfig({
  isProdBuild: isProdBuild(),
  isStatsBuild: isStatsBuild(),
  latestBuild: true,
});
