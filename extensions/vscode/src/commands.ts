/* eslint-disable @typescript-eslint/naming-convention */
import * as fs from "node:fs";

import { ContextMenuConfig, ILLM, ModelInstaller } from "core";
import { CompletionProvider } from "core/autocomplete/CompletionProvider";
import { ConfigHandler } from "core/config/ConfigHandler";
import { EXTENSION_NAME } from "core/control-plane/env";
import { Core } from "core/core";
import { walkDirAsync } from "core/indexing/walkDir";
import { isModelInstaller } from "core/llm";
import { NextEditLoggingService } from "core/nextEdit/NextEditLoggingService";
import { TrainingCaptureService } from "core/training";
import { startLocalLemonade } from "core/util/lemonadeHelper";
import { startLocalOllama } from "core/util/ollamaHelper";
import {
    getConfigJsonPath,
    getConfigYamlPath,
    setConfigFilePermissions,
} from "core/util/paths";
import { Telemetry } from "core/util/posthog";
import * as vscode from "vscode";
import * as YAML from "yaml";

import { convertJsonToYamlConfig } from "../../../packages/config-yaml/dist";

import {
    getAutocompleteStatusBarDescription,
    getAutocompleteStatusBarTitle,
    getNextEditMenuItems,
    getStatusBarStatus,
    getStatusBarStatusFromQuickPickItemLabel,
    handleNextEditToggle,
    isNextEditToggleLabel,
    quickPickStatusText,
    setupStatusBar,
    StatusBarStatus,
} from "./autocomplete/statusBar";
import { ContinueConsoleWebviewViewProvider } from "./ContinueConsoleWebviewViewProvider";
import { ContinueGUIWebviewViewProvider } from "./ContinueGUIWebviewViewProvider";
import { processDiff } from "./diff/processDiff";
import { VerticalDiffManager } from "./diff/vertical/manager";
import EditDecorationManager from "./quickEdit/EditDecorationManager";
import { QuickEdit, QuickEditShowParams } from "./quickEdit/QuickEditQuickPick";
import {
    addCodeToContextFromRange,
    addEntireFileToContext,
    addHighlightedCodeToContext,
} from "./util/addCode";
import { Battery } from "./util/battery";
import { getMetaKeyLabel } from "./util/util";
import { openEditorAndRevealRange } from "./util/vscode";
import { VsCodeIde } from "./VsCodeIde";

let fullScreenPanel: vscode.WebviewPanel | undefined;

function getFullScreenTab() {
  const tabs = vscode.window.tabGroups.all.flatMap((tabGroup) => tabGroup.tabs);
  return tabs.find((tab) =>
    (tab.input as any)?.viewType?.endsWith("smartai.continueGUIView"),
  );
}

type TelemetryCaptureParams = Parameters<typeof Telemetry.capture>;

/**
 * Helper method to add the `isCommandEvent` to all telemetry captures
 */
function captureCommandTelemetry(
  commandName: TelemetryCaptureParams[0],
  properties: TelemetryCaptureParams[1] = {},
) {
  Telemetry.capture(commandName, { isCommandEvent: true, ...properties });
}

function focusGUI() {
  const fullScreenTab = getFullScreenTab();
  if (fullScreenTab) {
    // focus fullscreen
    fullScreenPanel?.reveal();
  } else {
    // focus sidebar
    vscode.commands.executeCommand("smartai.continueGUIView.focus");
    // vscode.commands.executeCommand("workbench.action.focusAuxiliaryBar");
  }
}

function hideGUI() {
  const fullScreenTab = getFullScreenTab();
  if (fullScreenTab) {
    // focus fullscreen
    fullScreenPanel?.dispose();
  } else {
    // focus sidebar
    vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
    // vscode.commands.executeCommand("workbench.action.toggleAuxiliaryBar");
  }
}

function waitForSidebarReady(
  sidebar: ContinueGUIWebviewViewProvider,
  timeout: number,
  interval: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkReadyState = () => {
      if (sidebar.isReady) {
        resolve(true);
      } else if (Date.now() - startTime >= timeout) {
        resolve(false); // Timed out
      } else {
        setTimeout(checkReadyState, interval);
      }
    };

    checkReadyState();
  });
}

// Copy everything over from extension.ts
const getCommandsMap: (
  ide: VsCodeIde,
  extensionContext: vscode.ExtensionContext,
  sidebar: ContinueGUIWebviewViewProvider,
  consoleView: ContinueConsoleWebviewViewProvider,
  configHandler: ConfigHandler,
  verticalDiffManager: VerticalDiffManager,
  battery: Battery,
  quickEdit: QuickEdit,
  core: Core,
  editDecorationManager: EditDecorationManager,
) => { [command: string]: (...args: any) => any } = (
  ide,
  extensionContext,
  sidebar,
  consoleView,
  configHandler,
  verticalDiffManager,
  battery,
  quickEdit,
  core,
  editDecorationManager,
) => {
  /**
   * Streams an inline edit to the vertical diff manager.
   *
   * This function retrieves the configuration, determines the appropriate model title,
   * increments the FTC count, and then streams an edit to the
   * vertical diff manager.
   *
   * @param  promptName - The key for the prompt in the context menu configuration.
   * @param  fallbackPrompt - The prompt to use if the configured prompt is not available.
   * @param  [range] - Optional. The range to edit if provided.
   * @returns
   */
  async function streamInlineEdit(
    promptName: keyof ContextMenuConfig,
    fallbackPrompt: string,
    range?: vscode.Range,
  ) {
    const { config } = await configHandler.loadConfig();
    if (!config) {
      throw new Error("Config not loaded");
    }

    const llm =
      config.selectedModelByRole.edit ?? config.selectedModelByRole.chat;

    if (!llm) {
      throw new Error("No edit or chat model selected");
    }

    void sidebar.webviewProtocol.request("incrementFtc", undefined);

    await verticalDiffManager.streamEdit({
      input:
        config.experimental?.contextMenuPrompts?.[promptName] ?? fallbackPrompt,
      llm,
      range,
      rulesToInclude: config.rules,
      isApply: false,
    });
  }

  return {
    "smartai.acceptDiff": async (newFileUri?: string, streamId?: string) => {
      captureCommandTelemetry("acceptDiff");
      void processDiff(
        "accept",
        sidebar,
        ide,
        core,
        verticalDiffManager,
        newFileUri,
        streamId,
      );
    },

    "smartai.rejectDiff": async (newFileUri?: string, streamId?: string) => {
      captureCommandTelemetry("rejectDiff");
      void processDiff(
        "reject",
        sidebar,
        ide,
        core,
        verticalDiffManager,
        newFileUri,
        streamId,
      );
    },
    "smartai.acceptVerticalDiffBlock": (fileUri?: string, index?: number) => {
      captureCommandTelemetry("acceptVerticalDiffBlock");
      verticalDiffManager.acceptRejectVerticalDiffBlock(true, fileUri, index);
    },
    "smartai.rejectVerticalDiffBlock": (fileUri?: string, index?: number) => {
      captureCommandTelemetry("rejectVerticalDiffBlock");
      verticalDiffManager.acceptRejectVerticalDiffBlock(false, fileUri, index);
    },
    "smartai.quickFix": async (
      range: vscode.Range,
      diagnosticMessage: string,
    ) => {
      captureCommandTelemetry("quickFix");

      const prompt = `Please explain the cause of this error and how to solve it: ${diagnosticMessage}`;

      addCodeToContextFromRange(range, sidebar.webviewProtocol, prompt);

      vscode.commands.executeCommand("smartai.continueGUIView.focus");
    },
    // Passthrough for telemetry purposes
    "smartai.defaultQuickAction": async (args: QuickEditShowParams) => {
      captureCommandTelemetry("defaultQuickAction");
      vscode.commands.executeCommand("smartai.focusEdit", args);
    },
    "smartai.customQuickActionSendToChat": async (
      prompt: string,
      range: vscode.Range,
    ) => {
      captureCommandTelemetry("customQuickActionSendToChat");

      addCodeToContextFromRange(range, sidebar.webviewProtocol, prompt);

      vscode.commands.executeCommand("smartai.continueGUIView.focus");
    },
    "smartai.customQuickActionStreamInlineEdit": async (
      prompt: string,
      range: vscode.Range,
    ) => {
      captureCommandTelemetry("customQuickActionStreamInlineEdit");

      streamInlineEdit("docstring", prompt, range);
    },
    "smartai.codebaseForceReIndex": async () => {
      core.invoke("index/forceReIndex", undefined);
    },
    "smartai.rebuildCodebaseIndex": async () => {
      core.invoke("index/forceReIndex", { shouldClearIndexes: true });
    },
    "smartai.docsIndex": async () => {
      core.invoke("context/indexDocs", { reIndex: false });
    },
    "smartai.docsReIndex": async () => {
      core.invoke("context/indexDocs", { reIndex: true });
    },
    "smartai.focusContinueInput": async () => {
      const isContinueInputFocused = await sidebar.webviewProtocol.request(
        "isContinueInputFocused",
        undefined,
        false,
      );

      // This is a temporary fix—sidebar.webviewProtocol.request is blocking
      // when the GUI hasn't yet been setup and we should instead be
      // immediately throwing an error, or returning a Result object
      focusGUI();
      if (!sidebar.isReady) {
        const isReady = await waitForSidebarReady(sidebar, 5000, 100);
        if (!isReady) {
          return;
        }
      }

      const historyLength = await sidebar.webviewProtocol.request(
        "getWebviewHistoryLength",
        undefined,
        false,
      );

      if (isContinueInputFocused) {
        if (historyLength === 0) {
          hideGUI();
        } else {
          void sidebar.webviewProtocol?.request(
            "focusContinueInputWithNewSession",
            undefined,
            false,
          );
        }
      } else {
        focusGUI();
        sidebar.webviewProtocol?.request(
          "focusContinueInputWithNewSession",
          undefined,
          false,
        );
        void addHighlightedCodeToContext(sidebar.webviewProtocol);
      }
    },
    "smartai.focusContinueInputWithoutClear": async () => {
      const isContinueInputFocused = await sidebar.webviewProtocol.request(
        "isContinueInputFocused",
        undefined,
        false,
      );

      // This is a temporary fix—sidebar.webviewProtocol.request is blocking
      // when the GUI hasn't yet been setup and we should instead be
      // immediately throwing an error, or returning a Result object
      focusGUI();
      if (!sidebar.isReady) {
        const isReady = await waitForSidebarReady(sidebar, 5000, 100);
        if (!isReady) {
          return;
        }
      }

      if (isContinueInputFocused) {
        hideGUI();
      } else {
        focusGUI();

        sidebar.webviewProtocol?.request(
          "focusContinueInputWithoutClear",
          undefined,
        );

        void addHighlightedCodeToContext(sidebar.webviewProtocol);
      }
    },
    // QuickEditShowParams are passed from CodeLens, temp fix
    // until we update to new params specific to Edit
    "smartai.focusEdit": async (args?: QuickEditShowParams) => {
      captureCommandTelemetry("focusEdit");
      focusGUI();
      sidebar.webviewProtocol?.request("focusEdit", undefined);
    },
    "smartai.exitEditMode": async () => {
      captureCommandTelemetry("exitEditMode");
      editDecorationManager.clear();
      void sidebar.webviewProtocol?.request("exitEditMode", undefined);
    },
    "smartai.generateRule": async () => {
      captureCommandTelemetry("generateRule");
      focusGUI();
      void sidebar.webviewProtocol?.request("generateRule", undefined);
    },
    "smartai.writeCommentsForCode": async () => {
      captureCommandTelemetry("writeCommentsForCode");

      streamInlineEdit(
        "comment",
        "Write comments for this code. Do not change anything about the code itself.",
      );
    },
    "smartai.writeDocstringForCode": async () => {
      captureCommandTelemetry("writeDocstringForCode");

      void streamInlineEdit(
        "docstring",
        "Write a docstring for this code. Do not change anything about the code itself.",
      );
    },
    "smartai.fixCode": async () => {
      captureCommandTelemetry("fixCode");

      streamInlineEdit(
        "fix",
        "Fix this code. If it is already 100% correct, simply rewrite the code.",
      );
    },
    "smartai.optimizeCode": async () => {
      captureCommandTelemetry("optimizeCode");
      streamInlineEdit("optimize", "Optimize this code");
    },
    "smartai.fixGrammar": async () => {
      captureCommandTelemetry("fixGrammar");
      streamInlineEdit(
        "fixGrammar",
        "If there are any grammar or spelling mistakes in this writing, fix them. Do not make other large changes to the writing.",
      );
    },
    "smartai.clearConsole": async () => {
      consoleView.clearLog();
    },
    "smartai.viewLogs": async () => {
      captureCommandTelemetry("viewLogs");
      vscode.commands.executeCommand("workbench.action.toggleDevTools");
    },
    "smartai.debugTerminal": async () => {
      captureCommandTelemetry("debugTerminal");

      const terminalContents = await ide.getTerminalContents();

      vscode.commands.executeCommand("smartai.continueGUIView.focus");

      sidebar.webviewProtocol?.request("userInput", {
        input: `I got the following error, can you please help explain how to fix it?\n\n${terminalContents.trim()}`,
      });
    },
    "smartai.hideInlineTip": () => {
      vscode.workspace
        .getConfiguration(EXTENSION_NAME)
        .update("showInlineTip", false, vscode.ConfigurationTarget.Global);
    },

    // Commands without keyboard shortcuts
    "smartai.addModel": () => {
      captureCommandTelemetry("addModel");

      vscode.commands.executeCommand("smartai.continueGUIView.focus");
      sidebar.webviewProtocol?.request("addModel", undefined);
    },
    "smartai.newSession": () => {
      sidebar.webviewProtocol?.request("newSession", undefined);
    },

    "smartai.shareSession": async (sessionId: string | undefined) => {
      if (!sessionId) {
        sessionId = await sidebar.webviewProtocol?.request(
          "getCurrentSessionId",
          undefined,
        );
      }
      if (!sessionId) {
        void vscode.window.showErrorMessage(
          "No session ID found. Please start a new session first.",
        );
        return;
      }
      //let user select the destination folder
      const destinationFolder = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: "Select Destination Folder",
      });
      if (!destinationFolder || destinationFolder.length === 0) {
        return;
      }

      try {
        // despite core.invoke not being async, we still need to await it, because the 'history/share' command is async
        // if not awaited, then errors will not be caught.
        await core.invoke("history/share", {
          id: sessionId,
          outputDir: destinationFolder[0].fsPath,
        });
      } catch (error) {
        const errorMessage = `Failed to save session: ${error instanceof Error ? error.message : String(error)}`;
        void vscode.window.showErrorMessage(errorMessage);
      }
    },
    "smartai.viewHistory": () => {
      vscode.commands.executeCommand("smartai.navigateTo", "/history", true);
    },
    "smartai.focusContinueSessionId": async (
      sessionId: string | undefined,
    ) => {
      if (!sessionId) {
        sessionId = await vscode.window.showInputBox({
          prompt: "Enter the Session ID",
        });
      }
      void sidebar.webviewProtocol?.request("focusContinueSessionId", {
        sessionId,
      });
    },
    "smartai.applyCodeFromChat": () => {
      void sidebar.webviewProtocol.request("applyCodeFromChat", undefined);
    },
    "smartai.openConfigPage": () => {
      vscode.commands.executeCommand("smartai.navigateTo", "/config", false);
    },
    "smartai.selectFilesAsContext": async (
      firstUri: vscode.Uri,
      uris: vscode.Uri[],
    ) => {
      if (uris === undefined) {
        throw new Error("No files were selected");
      }

      vscode.commands.executeCommand("smartai.continueGUIView.focus");

      for (const uri of uris) {
        // If it's a folder, add the entire folder contents recursively by using walkDir (to ignore ignored files)
        const isDirectory = await vscode.workspace.fs
          .stat(uri)
          ?.then((stat) => stat.type === vscode.FileType.Directory);
        if (isDirectory) {
          for await (const fileUri of walkDirAsync(uri.toString(), ide, {
            source: "vscode smartai.selectFilesAsContext command",
          })) {
            await addEntireFileToContext(
              vscode.Uri.parse(fileUri),
              sidebar.webviewProtocol,
              ide.ideUtils,
            );
          }
        } else {
          await addEntireFileToContext(
            uri,
            sidebar.webviewProtocol,
            ide.ideUtils,
          );
        }
      }
    },
    "smartai.logAutocompleteOutcome": (
      completionId: string,
      completionProvider: CompletionProvider,
    ) => {
      completionProvider.accept(completionId);
    },
    "smartai.logNextEditOutcomeAccept": (
      completionId: string,
      nextEditLoggingService: NextEditLoggingService,
    ) => {
      nextEditLoggingService.accept(completionId);
    },
    "smartai.logNextEditOutcomeReject": (
      completionId: string,
      nextEditLoggingService: NextEditLoggingService,
    ) => {
      nextEditLoggingService.reject(completionId);
    },
    "smartai.toggleTabAutocompleteEnabled": () => {
      captureCommandTelemetry("toggleTabAutocompleteEnabled");

      const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
      const enabled = config.get("enableTabAutocomplete");
      const pauseOnBattery = config.get<boolean>(
        "pauseTabAutocompleteOnBattery",
      );
      if (!pauseOnBattery || battery.isACConnected()) {
        config.update(
          "enableTabAutocomplete",
          !enabled,
          vscode.ConfigurationTarget.Global,
        );
      } else {
        if (enabled) {
          const paused = getStatusBarStatus() === StatusBarStatus.Paused;
          if (paused) {
            setupStatusBar(StatusBarStatus.Enabled);
          } else {
            config.update(
              "enableTabAutocomplete",
              false,
              vscode.ConfigurationTarget.Global,
            );
          }
        } else {
          setupStatusBar(StatusBarStatus.Paused);
          config.update(
            "enableTabAutocomplete",
            true,
            vscode.ConfigurationTarget.Global,
          );
        }
      }
    },
    "smartai.forceAutocomplete": async () => {
      captureCommandTelemetry("forceAutocomplete");

      // 1. Explicitly hide any existing suggestion. This clears VS Code's cache for the current position.
      await vscode.commands.executeCommand("editor.action.inlineSuggest.hide");

      // 2. Now trigger a new one. VS Code has no cached suggestion, so it's forced to call our provider.
      await vscode.commands.executeCommand(
        "editor.action.inlineSuggest.trigger",
      );
    },

    "smartai.openTabAutocompleteConfigMenu": async () => {
      captureCommandTelemetry("openTabAutocompleteConfigMenu");

      const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
      const quickPick = vscode.window.createQuickPick();

      const { config: continueConfig } = await configHandler.loadConfig();
      const autocompleteModels =
        continueConfig?.modelsByRole.autocomplete ?? [];
      const selected =
        continueConfig?.selectedModelByRole?.autocomplete?.title ?? undefined;

      // Toggle between Disabled, Paused, and Enabled
      const pauseOnBattery =
        config.get<boolean>("pauseTabAutocompleteOnBattery") &&
        !battery.isACConnected();
      const currentStatus = getStatusBarStatus();

      let targetStatus: StatusBarStatus | undefined;
      if (pauseOnBattery) {
        // Cycle from Disabled -> Paused -> Enabled
        targetStatus =
          currentStatus === StatusBarStatus.Paused
            ? StatusBarStatus.Enabled
            : currentStatus === StatusBarStatus.Disabled
              ? StatusBarStatus.Paused
              : StatusBarStatus.Disabled;
      } else {
        // Toggle between Disabled and Enabled
        targetStatus =
          currentStatus === StatusBarStatus.Disabled
            ? StatusBarStatus.Enabled
            : StatusBarStatus.Disabled;
      }

      const nextEditEnabled = config.get<boolean>("enableNextEdit") ?? false;

      quickPick.items = [
        {
          label: "$(gear) Open settings",
        },
        {
          label: "$(comment) Open chat",
          description: getMetaKeyLabel() + " + L",
        },
        {
          label: "$(screen-full) Open full screen chat",
          description:
            getMetaKeyLabel() + " + K, " + getMetaKeyLabel() + " + M",
        },
        {
          label: quickPickStatusText(targetStatus),
          description:
            getMetaKeyLabel() + " + K, " + getMetaKeyLabel() + " + A",
        },
        ...getNextEditMenuItems(currentStatus, nextEditEnabled),
        {
          kind: vscode.QuickPickItemKind.Separator,
          label: "Switch model",
        },
        ...autocompleteModels.map((model) => ({
          label: getAutocompleteStatusBarTitle(selected, model),
          description: getAutocompleteStatusBarDescription(selected, model),
        })),
      ];
      quickPick.onDidAccept(() => {
        const selectedOption = quickPick.selectedItems[0].label;
        const targetStatus =
          getStatusBarStatusFromQuickPickItemLabel(selectedOption);

        if (targetStatus !== undefined) {
          setupStatusBar(targetStatus);
          config.update(
            "enableTabAutocomplete",
            targetStatus === StatusBarStatus.Enabled,
            vscode.ConfigurationTarget.Global,
          );
        } else if (isNextEditToggleLabel(selectedOption)) {
          handleNextEditToggle(selectedOption, config);
        } else if (
          autocompleteModels.some((model) => model.title === selectedOption)
        ) {
          if (core.configHandler.currentProfile?.profileDescription.id) {
            core.invoke("config/updateSelectedModel", {
              profileId:
                core.configHandler.currentProfile?.profileDescription.id,
              role: "autocomplete",
              title: selectedOption,
            });
          }
        } else if (selectedOption === "$(comment) Open chat") {
          vscode.commands.executeCommand("smartai.focusContinueInput");
        } else if (selectedOption === "$(screen-full) Open full screen chat") {
          vscode.commands.executeCommand("smartai.openInNewWindow");
        } else if (selectedOption === "$(gear) Open settings") {
          vscode.commands.executeCommand("smartai.navigateTo", "/config");
        }

        quickPick.dispose();
      });
      quickPick.show();
    },
    "smartai.navigateTo": (path: string, toggle: boolean) => {
      sidebar.webviewProtocol?.request("navigateTo", { path, toggle });
      focusGUI();
    },
    "smartai.startLocalOllama": () => {
      startLocalOllama(ide);
    },
    "smartai.startLocalLemonade": () => {
      startLocalLemonade(ide);
    },
    "smartai.installModel": async (
      modelName: string,
      llmProvider: ILLM | undefined,
    ) => {
      try {
        if (!isModelInstaller(llmProvider)) {
          const msg = llmProvider
            ? `LLM provider '${llmProvider.providerName}' does not support installing models`
            : "Missing LLM Provider";
          throw new Error(msg);
        }
        await installModelWithProgress(modelName, llmProvider);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(
          `Failed to install '${modelName}': ${message}`,
        );
      }
    },
    "smartai.convertConfigJsonToConfigYaml": async () => {
      const configJson = fs.readFileSync(getConfigJsonPath(), "utf-8");
      const parsed = JSON.parse(configJson);
      const configYaml = convertJsonToYamlConfig(parsed);

      const configYamlPath = getConfigYamlPath();
      fs.writeFileSync(configYamlPath, YAML.stringify(configYaml));
      setConfigFilePermissions(configYamlPath);

      // Open config.yaml
      await openEditorAndRevealRange(
        vscode.Uri.file(configYamlPath),
        undefined,
        undefined,
        false,
      );

      void vscode.window
        .showInformationMessage(
          "Your config.json has been converted to the new config.yaml format. If you need to switch back to config.json, you can delete or rename config.yaml.",
          "Read the docs",
        )
        .then(async (selection) => {
          if (selection === "Read the docs") {
            await vscode.env.openExternal(
              vscode.Uri.parse("https://docs.smart-ai.dev/yaml-migration"),
            );
          }
        });
    },
    "smartai.enterEnterpriseLicenseKey": async () => {
      captureCommandTelemetry("enterEnterpriseLicenseKey");

      const licenseKey = await vscode.window.showInputBox({
        prompt: "Enter your enterprise license key",
        password: true,
        ignoreFocusOut: true,
        placeHolder: "License key",
      });

      if (!licenseKey) {
        return;
      }

      try {
        const isValid = core.invoke("mdm/setLicenseKey", {
          licenseKey,
        });

        if (isValid) {
          void vscode.window.showInformationMessage(
            "Enterprise license key successfully validated and saved. Reloading window.",
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await vscode.commands.executeCommand("workbench.action.reloadWindow");
        } else {
          void vscode.window.showErrorMessage(
            "Invalid license key. Please check your license key and try again.",
          );
        }
      } catch (error) {
        void vscode.window.showErrorMessage(
          `Failed to set enterprise license key: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
    "smartai.toggleNextEditEnabled": async () => {
      captureCommandTelemetry("toggleNextEditEnabled");

      const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
      const tabAutocompleteEnabled = config.get<boolean>(
        "enableTabAutocomplete",
      );

      if (!tabAutocompleteEnabled) {
        vscode.window.showInformationMessage(
          "Please enable tab autocomplete first to use Next Edit",
        );
        return;
      }

      const nextEditEnabled = config.get<boolean>("enableNextEdit") ?? false;

      // updateNextEditState in VsCodeExtension.ts will handle the validation.
      config.update(
        "enableNextEdit",
        !nextEditEnabled,
        vscode.ConfigurationTarget.Global,
      );
    },
    "smartai.openInNewWindow": async () => {
      focusGUI();

      const sessionId = await sidebar.webviewProtocol.request(
        "getCurrentSessionId",
        undefined,
      );
      // Check if full screen is already open by checking open tabs
      const fullScreenTab = getFullScreenTab();

      if (fullScreenTab && fullScreenPanel) {
        // Full screen open, but not focused - focus it
        fullScreenPanel.reveal();
        return;
      }

      // Clear the sidebar to prevent overwriting changes made in fullscreen
      vscode.commands.executeCommand("smartai.newSession");

      // Full screen not open - open it
      captureCommandTelemetry("openInNewWindow");

      // Create the full screen panel
      let panel = vscode.window.createWebviewPanel(
        "smartai.continueGUIView",
        "Smart AI",
        vscode.ViewColumn.One,
        {
          retainContextWhenHidden: true,
          enableScripts: true,
        },
      );
      fullScreenPanel = panel;

      // Add content to the panel
      panel.webview.html = sidebar.getSidebarContent(
        extensionContext,
        panel,
        undefined,
        undefined,
        true,
      );

      const sessionLoader = panel.onDidChangeViewState(() => {
        vscode.commands.executeCommand("smartai.newSession");
        if (sessionId) {
          vscode.commands.executeCommand(
            "smartai.focusContinueSessionId",
            sessionId,
          );
        }
        panel.reveal();
        sessionLoader.dispose();
      });

      // When panel closes, reset the webview and focus
      panel.onDidDispose(
        () => {
          sidebar.resetWebviewProtocolWebview();
          vscode.commands.executeCommand("smartai.focusContinueInput");
        },
        null,
        extensionContext.subscriptions,
      );

      vscode.commands.executeCommand("workbench.action.copyEditorToNewWindow");
      vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
    },
    "smartai.forceNextEdit": async () => {
      captureCommandTelemetry("forceNextEdit");

      // This is basically the same logic as forceAutocomplete.
      // I'm writing a new command KV pair here in case we diverge in features.

      await vscode.commands.executeCommand("editor.action.inlineSuggest.hide");

      await vscode.commands.executeCommand(
        "editor.action.inlineSuggest.trigger",
      );
    },
    // Smart AI Training Capture Commands
    "smartai.toggleTrainingCapture": async () => {
      const trainingService = TrainingCaptureService.getInstance();
      const currentConfig = trainingService.getConfig();
      const newEnabled = !currentConfig.enabled;
      trainingService.setConfig({ enabled: newEnabled });
      vscode.window.showInformationMessage(
        `Smart AI training capture is now ${newEnabled ? "enabled" : "disabled"}.`,
      );
    },
    "smartai.saveLastExchange": async () => {
      const trainingService = TrainingCaptureService.getInstance();
      const pending = trainingService.getPendingInteraction();
      if (!pending) {
        vscode.window.showWarningMessage(
          "No recent exchange available to save as training example.",
        );
        return;
      }
      const success = await trainingService.capture(pending);
      if (success) {
        vscode.window.showInformationMessage(
          "Saved last exchange as training example.",
        );
      }
    },
    "smartai.saveLastPatch": async () => {
      const trainingService = TrainingCaptureService.getInstance();
      const pending = trainingService.getPendingInteraction();
      if (!pending) {
        vscode.window.showWarningMessage(
          "No recent patch available to save as training example.",
        );
        return;
      }
      const success = await trainingService.capture(pending);
      if (success) {
        vscode.window.showInformationMessage(
          "Saved last patch as training example.",
        );
      }
    },
    "smartai.exportTrainingBundle": async () => {
      const trainingService = TrainingCaptureService.getInstance();
      const result = await trainingService.exportBundle({
        trainEvalSplit: 0.9,
        includePatches: true,
      });
      if (result) {
        vscode.window.showInformationMessage(
          `Training bundle exported to: ${result.bundleDir}`,
        );
      } else {
        vscode.window.showWarningMessage("No training data found to export.");
      }
    },
    "smartai.openTrainingFolder": async () => {
      const { getTrainingDataDirectoryPath } = await import("core/util/paths");
      const datasetPath = getTrainingDataDirectoryPath();
      const uri = vscode.Uri.file(datasetPath);
      vscode.commands.executeCommand("vscode.openFolder", uri);
    },
    "smartai.markHighQuality": async () => {
      const trainingService = TrainingCaptureService.getInstance();
      const success = await trainingService.markHighQuality();
      if (success) {
        vscode.window.showInformationMessage(
          "Marked last response as high quality training example.",
        );
      } else {
        vscode.window.showWarningMessage("No pending interaction to mark.");
      }
    },
    "smartai.markReject": async () => {
      const trainingService = TrainingCaptureService.getInstance();
      await trainingService.markRejected();
      vscode.window.showInformationMessage(
        "Marked last response as reject. Will not be used for training.",
      );
    },
  };
};

async function installModelWithProgress(
  modelName: string,
  modelInstaller: ModelInstaller,
) {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Installing model '${modelName}'`,
      cancellable: true,
    },
    async (windowProgress, token) => {
      let currentProgress: number = 0;
      const progressWrapper = (
        details: string,
        worked?: number,
        total?: number,
      ) => {
        let increment = 0;
        if (worked && total) {
          const progressValue = Math.round((worked / total) * 100);
          increment = progressValue - currentProgress;
          currentProgress = progressValue;
        }
        windowProgress.report({ message: details, increment });
      };
      const abortController = new AbortController();
      token.onCancellationRequested(() => {
        console.log(`Pulling ${modelName} model was cancelled`);
        abortController.abort();
      });
      await modelInstaller.installModel(
        modelName,
        abortController.signal,
        progressWrapper,
      );
    },
  );
}

export function registerAllCommands(
  context: vscode.ExtensionContext,
  ide: VsCodeIde,
  extensionContext: vscode.ExtensionContext,
  sidebar: ContinueGUIWebviewViewProvider,
  consoleView: ContinueConsoleWebviewViewProvider,
  configHandler: ConfigHandler,
  verticalDiffManager: VerticalDiffManager,
  battery: Battery,
  quickEdit: QuickEdit,
  core: Core,
  editDecorationManager: EditDecorationManager,
) {
  for (const [command, callback] of Object.entries(
    getCommandsMap(
      ide,
      extensionContext,
      sidebar,
      consoleView,
      configHandler,
      verticalDiffManager,
      battery,
      quickEdit,
      core,
      editDecorationManager,
    ),
  )) {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, callback),
    );
  }
}
