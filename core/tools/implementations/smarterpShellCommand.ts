import { ToolImpl } from ".";
import { getStringArg } from "../parseArgs";

export const smarterpShellCommandImpl: ToolImpl = async (args, extras) => {
  const command = getStringArg(args, "command");
  const cwd = getStringArg(args, "cwd", true);

  const [stdout, stderr] = await extras.ide.subprocess(command, cwd);

  const content = stdout || stderr || "No output";

  return [
    {
      name: "SmartERP Shell Output",
      description: command,
      content,
    },
  ];
};
