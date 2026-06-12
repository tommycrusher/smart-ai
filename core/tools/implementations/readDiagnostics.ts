import { ToolImpl } from ".";
import { getStringArg } from "../parseArgs";

export const readDiagnosticsImpl: ToolImpl = async (args, extras) => {
  const filepath = getStringArg(args, "filepath", true);
  const problems = await extras.ide.getProblems(filepath);

  if (!problems || problems.length === 0) {
    return [
      {
        name: "Diagnostics",
        description: filepath || "Workspace diagnostics",
        content: "No diagnostics found.",
      },
    ];
  }

  const formatted = problems
    .map(
      (p) =>
        `${p.filepath}:${p.range?.start?.line ?? 0}:${p.range?.start?.character ?? 0} - ${p.message}`,
    )
    .join("\n");

  return [
    {
      name: "Diagnostics",
      description: filepath || "Workspace diagnostics",
      content: formatted,
    },
  ];
};
