import { ToolImpl } from ".";
import { getNumberArg, getStringArg } from "../parseArgs";

export const searchRepoImpl: ToolImpl = async (args, extras) => {
  const query = getStringArg(args, "query", true);
  const filePattern = getStringArg(args, "filePattern", true);
  const maxResults = args.maxResults ? getNumberArg(args, "maxResults") : 20;

  let results: string[] = [];

  if (filePattern) {
    const fileResults = await extras.ide.getFileResults(
      filePattern,
      maxResults,
    );
    results.push("Files matching pattern:", ...fileResults);
  }

  if (query) {
    const searchResults = await extras.ide.getSearchResults(query, maxResults);
    if (searchResults) {
      results.push("Content matches:", searchResults);
    }
  }

  if (results.length === 0) {
    return [
      {
        name: "Search Results",
        description: "Repository search",
        content: "No results found.",
      },
    ];
  }

  return [
    {
      name: "Search Results",
      description: "Repository search",
      content: results.join("\n"),
    },
  ];
};
