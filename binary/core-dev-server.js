const path = require("path");
process.env.SMARTAI_DEVELOPMENT = true;

process.env.SMARTAI_GLOBAL_DIR = path.join(
  process.env.PROJECT_DIR,
  "extensions",
  ".smart-ai-debug",
);

require("./out/index.js");
