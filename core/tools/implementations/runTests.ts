import { ToolImpl } from ".";
import { getStringArg } from "../parseArgs";

export const runTestsImpl: ToolImpl = async (args, extras) => {
  const command =
    getStringArg(args, "command", true) ||
    (await extras.ide
      .subprocess("cat package.json | grep -q '\"test\"' && echo 'npm test' || echo 'make test'")
      .then(([stdout]) => stdout.trim())) ||
    "npm test";

  await extras.ide.runCommand(command);

  return [
    {
      name: "Tests",
      description: "Test command executed",
      content: `Running tests with: ${command}\nCheck the terminal for results.`,
    },
  ];
};
