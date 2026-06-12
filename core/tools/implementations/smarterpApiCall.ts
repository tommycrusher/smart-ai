import { ToolImpl } from ".";
import { getStringArg } from "../parseArgs";

export const smarterpApiCallImpl: ToolImpl = async (args, extras) => {
  const url = getStringArg(args, "url");
  const method = (getStringArg(args, "method", true) || "GET").toUpperCase();
  const headers = (args.headers as Record<string, string>) || {};
  const body = getStringArg(args, "body", true);

  const response = await extras.fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...(body ? { body } : {}),
  });

  const responseBody = await response.text();

  return [
    {
      name: "SmartERP API Response",
      description: `${method} ${url}`,
      content: `Status: ${response.status}\n\n${responseBody}`,
    },
  ];
};
