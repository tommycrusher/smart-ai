const fs = require("fs");
const path = require("path");

const messages = {
  missing_api_key: `## Code Review Summary

⚠️ AI review skipped: SMARTAI_API_KEY not configured.

### Configuration Required
- Please set the SMARTAI_API_KEY secret in repository settings
- Verify that the organization and config path are valid
`,
  cli_install_failed: `## Code Review Summary

⚠️ AI review skipped: Smart AI CLI installation failed.

### Troubleshooting
- Check that npm installation succeeded
- Verify @smartai/cli package is available
`,
  empty_output: `## Code Review Summary

⚠️ Smart AI CLI returned an empty response. Please check the configuration.
`,
  cli_not_found: `## Code Review Summary

⚠️ Smart AI CLI is not properly installed. Please ensure @smartai/cli is installed globally.
`,
  config_error: `## Code Review Summary

⚠️ Smart AI configuration error. Please verify that the assistant exists in Smart AI Hub.
`,
  auth_error: `## Code Review Summary

⚠️ Smart AI API authentication failed. Please check your SMARTAI_API_KEY.
`,
  generic_failure: `## Code Review Summary

⚠️ AI review failed. Please check the Smart AI API key and configuration.

### Troubleshooting
- Verify the SMARTAI_API_KEY secret is set correctly
- Check that the organization and config path are valid
- Ensure the Smart AI service is accessible
`,
};

function main() {
  const [outputPath, messageKey] = process.argv.slice(2);

  if (!outputPath || !messageKey) {
    console.error("Usage: node writeMarkdown.js <outputPath> <messageKey>");
    process.exit(1);
  }

  const message = messages[messageKey];

  if (!message) {
    console.error(`Unknown message key: ${messageKey}`);
    process.exit(1);
  }

  const absolutePath = path.resolve(process.cwd(), outputPath);
  fs.writeFileSync(absolutePath, message, "utf8");
  console.log(`Wrote ${messageKey} message to ${absolutePath}`);
}

main();
