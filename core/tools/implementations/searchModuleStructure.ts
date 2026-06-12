import { ToolImpl } from ".";
import { getNumberArg, getStringArg } from "../parseArgs";

export const searchModuleStructureImpl: ToolImpl = async (args, extras) => {
  const path = getStringArg(args, "path", true) || ".";
  const depth = args.depth ? getNumberArg(args, "depth") : 3;

  const [stdout] = await extras.ide.subprocess(
    `find ${path} -maxdepth ${depth} -type f | head -n 100`,
  );

  const files = stdout.trim().split("\n").filter(Boolean);

  if (!files.length) {
    return [
      {
        name: "Module Structure",
        description: path,
        content: "No files found.",
      },
    ];
  }

  return [
    {
      name: "Module Structure",
      description: path,
      content: files.join("\n"),
    },
  ];
};
