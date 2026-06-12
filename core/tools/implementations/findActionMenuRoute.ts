import { ToolImpl } from ".";
import { getStringArg } from "../parseArgs";

export const findActionMenuRouteImpl: ToolImpl = async (args, extras) => {
  const query = getStringArg(args, "query");
  const filePattern = getStringArg(args, "filePattern", true) || "*";

  const searchResults = await extras.ide.getSearchResults(query, 20);
  const fileResults = await extras.ide.getFileResults(filePattern, 20);

  let content = `Search for action/menu/route "${query}":\n\n`;

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
      name: "Action/Menu/Route Search",
      description: `Query: ${query}`,
      content,
    },
  ];
};
