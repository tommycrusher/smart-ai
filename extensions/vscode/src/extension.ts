/**
 * This is the entry point for the extension.
 */

import * as fs from "fs";
fs.writeFileSync("/tmp/smart_ai_loaded.txt", "Module loaded at " + new Date().toISOString() + "\n");

import { setupCa } from "core/util/ca";
import { extractMinimalStackTraceInfo } from "core/util/extractMinimalStackTraceInfo";
import { Telemetry } from "core/util/posthog";
import * as vscode from "vscode";

import { SentryLogger } from "core/util/sentry/SentryLogger";
import { getExtensionVersion } from "./util/util";
export { default as buildTimestamp } from "./.buildTimestamp";

async function dynamicImportAndActivate(context: vscode.ExtensionContext) {
  console.log("SMART_AI: dynamicImportAndActivate started");
  try {
    console.log("SMART_AI: calling setupCa");
    await setupCa();
    console.log("SMART_AI: setupCa completed");
    const { activateExtension } = await import("./activation/activate");
    console.log("SMART_AI: imported activateExtension");
    return await activateExtension(context);
  } catch (e) {
    console.error("SMART_AI: Error in dynamicImportAndActivate:", e);
    throw e;
  }
}

export function activate(context: vscode.ExtensionContext) {
  fs.writeFileSync("/tmp/smart_ai_activate.txt", "activate() called at " + new Date().toISOString() + "\n");
  return dynamicImportAndActivate(context).catch((e) => {
    fs.writeFileSync("/tmp/smart_ai_error.txt", "ERROR: " + e.message + "\n" + e.stack + "\n");
    console.log("Error activating extension: ", e);
    Telemetry.capture(
      "vscode_extension_activation_error",
      {
        stack: extractMinimalStackTraceInfo(e.stack),
        message: e.message,
      },
      false,
      true,
    );
    vscode.window
      .showWarningMessage(
        "Error activating the Smart AI extension.",
        "View Logs",
        "Retry",
      )
      .then((selection) => {
        if (selection === "View Logs") {
          vscode.commands.executeCommand("smartai.viewLogs");
        } else if (selection === "Retry") {
          // Reload VS Code window
          vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
      });
  });
}

export function deactivate() {
  void Telemetry.capture(
    "deactivate",
    {
      extensionVersion: getExtensionVersion(),
    },
    true,
  );

  Telemetry.shutdownPosthogClient();
  SentryLogger.shutdownSentryClient();
}
