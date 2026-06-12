import { ToolImpl } from ".";
import { getStringArg } from "../parseArgs";

export const gitStatusImpl: ToolImpl = async (args, extras) => {
  const directory = getStringArg(args, "directory", true);
  const [stdout, stderr] = await extras.ide.subprocess(
    "git status",
    directory,
  );

  const content = stdout || stderr || "No git status output";

  return [
    {
      name: "Git Status",
      description: "Current git status",
      content,
    },
  ];
};
