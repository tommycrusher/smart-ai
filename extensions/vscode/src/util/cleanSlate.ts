
import { ExtensionContext } from "vscode";

/**
 * Clear all Smart AI-related artifacts to simulate a brand new user
 */
export function cleanSlate(context: ExtensionContext) {
  // Commented just to be safe
  // // Remove ~/.smart-ai
  // const smartAiPath = getSmartAiGlobalPath();
  // if (fs.existsSync(smartAiPath)) {
  //   fs.rmSync(smartAiPath, { recursive: true, force: true });
  // }
  // // Clear extension's globalState
  // context.globalState.keys().forEach((key) => {
  //   context.globalState.update(key, undefined);
  // });
}
