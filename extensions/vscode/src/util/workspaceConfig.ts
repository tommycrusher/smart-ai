import { workspace } from "vscode";

export const SMARTAI_WORKSPACE_KEY = "continue";

export function getContinueWorkspaceConfig() {
  return workspace.getConfiguration(SMARTAI_WORKSPACE_KEY);
}
