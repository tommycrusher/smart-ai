import { getContinueRcPath, getTsConfigPath } from "core/util/paths";
import { Telemetry } from "core/util/posthog";
import * as vscode from "vscode";

import { VsCodeExtension } from "../extension/VsCodeExtension";
import { getExtensionVersion, isUnsupportedPlatform } from "../util/util";

import { GlobalContext } from "core/util/GlobalContext";
import { VsCodeContinueApi } from "./api";
import setupInlineTips from "./InlineTipManager";

export async function activateExtension(context: vscode.ExtensionContext) {
  console.log("SMART_AI: Starting activateExtension");
  const platformCheck = isUnsupportedPlatform();
  const globalContext = new GlobalContext();
  const hasShownUnsupportedPlatformWarning = globalContext.get(
    "hasShownUnsupportedPlatformWarning",
  );

  if (platformCheck.isUnsupported && !hasShownUnsupportedPlatformWarning) {
    const platformTarget = "windows-arm64";

    globalContext.update("hasShownUnsupportedPlatformWarning", true);
    void vscode.window.showInformationMessage(
      `Smart AI detected that you are using ${platformTarget}. Due to native dependencies, Smart AI may not be able to start`,
    );

    void Telemetry.capture(
      "unsupported_platform_activation_attempt",
      {
        platform: platformTarget,
        extensionVersion: getExtensionVersion(),
        reason: platformCheck.reason,
      },
      true,
    );
  }

  // Add necessary files
  console.log("SMART_AI: Getting config paths");
  getTsConfigPath();
  getContinueRcPath();

  // Register commands and providers
  console.log("SMART_AI: Setting up inline tips");
  setupInlineTips(context);

  console.log("SMART_AI: Creating VsCodeExtension");
  const vscodeExtension = new VsCodeExtension(context);
  console.log("SMART_AI: VsCodeExtension created successfully");

  // Load Smart AI configuration
  if (!context.globalState.get("hasBeenInstalled")) {
    void context.globalState.update("hasBeenInstalled", true);
    void Telemetry.capture(
      "install",
      {
        extensionVersion: getExtensionVersion(),
      },
      true,
    );
  }

  // Register config.yaml schema by removing old entries and adding new one (uri.fsPath changes with each version)
  const yamlMatcher = ".smart-ai/**/*.yaml";
  const yamlConfig = vscode.workspace.getConfiguration("yaml");
  const yamlSchemas = yamlConfig.get<object>("schemas", {});

  const newPath = vscode.Uri.joinPath(
    context.extension.extensionUri,
    "config-yaml-schema.json",
  ).toString();

  try {
    await yamlConfig.update(
      "schemas",
      {
        ...yamlSchemas,
        [newPath]: [yamlMatcher],
      },
      vscode.ConfigurationTarget.Global,
    );
  } catch (error) {
    console.error(
      "Failed to register Smart AI config.yaml schema, most likely, YAML extension is not installed",
      error,
    );
  }

  const api = new VsCodeContinueApi(vscodeExtension);
  const continuePublicApi = {
    registerCustomContextProvider: api.registerCustomContextProvider.bind(api),
  };

  // 'export' public api-surface
  // or entire extension for testing
  return process.env.NODE_ENV === "test"
    ? {
        ...continuePublicApi,
        extension: vscodeExtension,
      }
    : continuePublicApi;
}
