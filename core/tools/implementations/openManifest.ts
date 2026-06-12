import { inferResolvedUriFromRelativePath } from "../../util/ideUtils";
import { ToolImpl } from ".";
import { getStringArg } from "../parseArgs";
import { ContinueError, ContinueErrorReason } from "../../util/errors";

export const openManifestImpl: ToolImpl = async (args, extras) => {
  const filename = getStringArg(args, "filename", true);

  const candidates = filename
    ? [filename]
    : [
        "package.json",
        "tsconfig.json",
        "pyproject.toml",
        "Cargo.toml",
        "go.mod",
        "composer.json",
        "build.gradle",
        "pom.xml",
        "requirements.txt",
        "Makefile",
        "Dockerfile",
      ];

  for (const candidate of candidates) {
    const resolved = await inferResolvedUriFromRelativePath(
      candidate,
      extras.ide,
    );
    if (resolved) {
      try {
        const content = await extras.ide.readFile(resolved);
        return [
          {
            name: candidate,
            description: resolved,
            content,
            uri: { type: "file", value: resolved },
          },
        ];
      } catch {
        if (filename) break;
        continue;
      }
    }
  }

  throw new ContinueError(
    ContinueErrorReason.FileNotFound,
    filename
      ? `Manifest file "${filename}" not found`
      : "No manifest file found in workspace",
  );
};
