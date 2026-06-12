import { ToolImpl } from ".";
import { getStringArg } from "../parseArgs";

export const findModelFieldImpl: ToolImpl = async (args, extras) => {
  const fieldName = getStringArg(args, "fieldName");
  const modelName = getStringArg(args, "modelName", true);
  const filePattern = getStringArg(args, "filePattern", true) || "*";

  const grepQuery = modelName
    ? `${modelName}.*${fieldName}|${fieldName}.*${modelName}`
    : fieldName;

  const searchResults = await extras.ide.getSearchResults(grepQuery, 20);
  const fileResults = await extras.ide.getFileResults(filePattern, 20);

  let content = `Search for field "${fieldName}"`;
  if (modelName) content += ` in model "${modelName}"`;
  content += ":\n\n";

  if (fileResults.length) {
    content += "Matching files:\n" + fileResults.join("\n") + "\n\n";
  }

  if (searchResults) {
    content += "Content matches:\n" + searchResults;
  }

  if (!fileResults.length && !searchResults) {
    content += "No results found.";
  }

  return [
    {
      name: "Model Field Search",
      description: `Field: ${fieldName}`,
      content,
    },
  ];
};
