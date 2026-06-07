import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

import {
    getTrainingEvalJsonlPath,
    getTrainingExportDirectoryPath,
    getTrainingJsonlPath,
    getTrainingPatchesDirectoryPath
} from "../util/paths.js";
import {
    DEFAULT_TRAINING_CAPTURE_CONFIG,
    TrainingCaptureConfig,
    TrainingRecord,
    TrainingSource,
    TrainingTaskType,
} from "./types.js";

/**
 * Detects if a workspace appears to be a Smarterp repository.
 */
export function detectSmarterpWorkspace(workspaceRoots: string[]): boolean {
  for (const root of workspaceRoots) {
    try {
      const files = fs.readdirSync(root);
      const hasManifest = files.some((f) =>
        fs.existsSync(path.join(root, f, "__manifest__.py")),
      );
      const hasSmarterpName = files.some(
        (f) => f.startsWith("smarterp-") || f.includes("smarterp_"),
      );

      if (hasManifest || hasSmarterpName) {
        return true;
      }
      if (!hasManifest) {
        const topDirs = files.filter((f) =>
          fs.statSync(path.join(root, f)).isDirectory(),
        );
        for (const dir of topDirs) {
          const subFiles = fs.readdirSync(path.join(root, dir));
          if (subFiles.includes("__manifest__.py")) {
            return true;
          }
        }
      }
    } catch {
      // Ignore unreadable directories
    }
  }
  return false;
}

/**
 * Derives task type and tags from the source and content.
 */
export function deriveTaskTypeAndTags(
  source: TrainingSource,
  instruction: string,
  output: string,
  isSmarterp: boolean,
): { taskType: TrainingTaskType; tags: string[] } {
  const lowerInst = instruction.toLowerCase();
  const tags: string[] = [];

  if (isSmarterp) {
    tags.push("smarterp");
  }

  if (lowerInst.includes("manifest") || lowerInst.includes("__manifest__")) {
    tags.push("manifest-review");
    return { taskType: "manifest-review", tags };
  }
  if (lowerInst.includes("addon") || lowerInst.includes("module")) {
    if (lowerInst.includes("generate") || lowerInst.includes("scaffold")) {
      tags.push("module-generation");
      return { taskType: "module-generation", tags };
    }
    tags.push("addon-analysis");
    return { taskType: "addon-analysis", tags };
  }
  if (lowerInst.includes("workspace") || lowerInst.includes("repository")) {
    tags.push("workspace-analysis");
    return { taskType: "workspace-analysis", tags };
  }
  if (lowerInst.includes("commit")) {
    tags.push("commit-message");
    return { taskType: "commit-message", tags };
  }
  if (lowerInst.includes("test") || lowerInst.includes("unit test")) {
    tags.push("test-generation");
    return { taskType: "test-generation", tags };
  }
  if (lowerInst.includes("fix") || lowerInst.includes("bug")) {
    tags.push("bug-fix");
    return { taskType: "bug-fix", tags };
  }
  if (lowerInst.includes("review")) {
    tags.push("code-review");
    return { taskType: "code-review", tags };
  }
  if (lowerInst.includes("refactor")) {
    tags.push("code-refactor");
    return { taskType: "code-refactor", tags };
  }
  if (lowerInst.includes("explain")) {
    tags.push("code-explanation");
    return { taskType: "code-explanation", tags };
  }
  if (source === "edit" || source === "apply") {
    tags.push("code-edit");
    return { taskType: "code-edit", tags };
  }
  if (source === "agent") {
    tags.push("agent-task");
    return { taskType: "agent-task", tags };
  }
  if (source === "autocomplete") {
    tags.push("code-generation");
    return { taskType: "code-generation", tags };
  }

  tags.push("general-chat");
  return { taskType: "general-chat", tags };
}

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Main service for capturing training data from Smart AI interactions.
 */
export class TrainingCaptureService {
  private static instance: TrainingCaptureService | null = null;
  private config: TrainingCaptureConfig = { ...DEFAULT_TRAINING_CAPTURE_CONFIG };
  private lastInteraction: Partial<TrainingRecord> | null = null;
  private pendingPatch: { before: string; after: string; filePaths: string[] } | null = null;

  private constructor() {}

  static getInstance(): TrainingCaptureService {
    if (!TrainingCaptureService.instance) {
      TrainingCaptureService.instance = new TrainingCaptureService();
    }
    return TrainingCaptureService.instance;
  }

  setConfig(config: Partial<TrainingCaptureConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): TrainingCaptureConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  setPendingInteraction(record: Partial<TrainingRecord>): void {
    this.lastInteraction = record;
  }

  getPendingInteraction(): Partial<TrainingRecord> | null {
    return this.lastInteraction;
  }

  setPendingPatch(
    before: string,
    after: string,
    filePaths: string[],
  ): void {
    this.pendingPatch = { before, after, filePaths };
  }

  clearPendingPatch(): void {
    this.pendingPatch = null;
  }

  private getDatasetPath(): string {
    return this.config.datasetPath ?? getTrainingJsonlPath();
  }

  private getEvalPath(): string {
    return this.config.evalPath ?? getTrainingEvalJsonlPath();
  }

  private getPatchDir(): string {
    return this.config.patchDirPath ?? getTrainingPatchesDirectoryPath();
  }

  private getExportDir(): string {
    return this.config.exportDirPath ?? getTrainingExportDirectoryPath();
  }

  private getDatasetRoot(): string {
    return path.dirname(this.getDatasetPath());
  }

  /**
   * Capture a training record. Main entry point.
   */
  async capture(record: Partial<TrainingRecord>): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    const finalRecord = await this.buildFinalRecord(record);
    if (!finalRecord) {
      return false;
    }

    if (!this.shouldAutoCapture(finalRecord.source)) {
      return false;
    }

    if (this.config.smarterpOnly && !finalRecord.smarterpMode) {
      return false;
    }

    const outputSize = Buffer.byteLength(finalRecord.output, "utf8");
    if (outputSize > this.config.maxResponseSizeBytes) {
      console.warn(
        `[TrainingCapture] Output too large (${outputSize} bytes), skipping`,
      );
      return false;
    }

    if (this.pendingPatch) {
      const patchSize =
        Buffer.byteLength(this.pendingPatch.before, "utf8") +
        Buffer.byteLength(this.pendingPatch.after, "utf8");
      if (patchSize <= this.config.maxPatchSizeBytes) {
        finalRecord.patchPath = await this.writePatch(finalRecord);
      }
      this.clearPendingPatch();
    }

    await this.appendToJsonl(finalRecord);

    return true;
  }

  /**
   * Build the final record with derived fields and runtime metadata.
   */
  private async buildFinalRecord(
    record: Partial<TrainingRecord>,
  ): Promise<TrainingRecord | null> {
    const merged = { ...this.lastInteraction, ...record };
    this.lastInteraction = null;

    if (!merged.instruction && !merged.input) {
      return null;
    }

    const instruction = merged.instruction ?? "";
    const input = merged.input ?? "";
    const output = merged.output ?? "";

    const { taskType, tags } = deriveTaskTypeAndTags(
      merged.source ?? "manual",
      instruction + input,
      output,
      merged.smarterpMode ?? false,
    );

    const allTags = merged.tags ? [...merged.tags, ...tags] : tags;

    if (merged.smarterpMode) {
      const smarterpTags = ["smarterp"];
      if (taskType === "addon-analysis") smarterpTags.push("addon-analysis");
      if (taskType === "module-generation") smarterpTags.push("module-generation");
      if (!smarterpTags.every((t) => allTags.includes(t))) {
        allTags.push(...smarterpTags.filter((t) => !allTags.includes(t)));
      }
    }

    let beforeHash: string | undefined;
    let afterHash: string | undefined;
    if (this.pendingPatch) {
      beforeHash = hashContent(this.pendingPatch.before);
      afterHash = hashContent(this.pendingPatch.after);
    }

    return {
      instruction,
      input,
      output,
      taskType,
      model: merged.model ?? "unknown",
      provider: merged.provider ?? "unknown",
      apiBase: merged.apiBase ?? this.config.ollamaApiBase,
      workspaceRoot: merged.workspaceRoot,
      filePaths: merged.filePaths,
      contextSummary: merged.contextSummary,
      timestamp: merged.timestamp ?? new Date().toISOString(),
      accepted: merged.accepted ?? false,
      source: merged.source ?? "manual",
      tags: allTags,
      smarterpMode: merged.smarterpMode ?? false,
      patchPath: undefined,
      beforeHash,
      afterHash,
      conversationId: merged.conversationId,
      sessionId: merged.sessionId,
      runtimeMode: this.config.runtimeMode,
      datasetRoot: this.getDatasetRoot(),
      ollamaApiBase: this.config.ollamaApiBase,
      hostMachine: os.hostname(),
      metadata: merged.metadata,
    };
  }

  private shouldAutoCapture(source: TrainingSource): boolean {
    switch (source) {
      case "chat":
        return this.config.autoCaptureChat;
      case "edit":
      case "apply":
        return this.config.autoCaptureEditApply;
      case "agent":
        return this.config.autoCaptureAgent;
      case "manual":
        return true;
      case "autocomplete":
        return this.config.autoCaptureAccepted;
      default:
        return false;
    }
  }

  private async writePatch(record: TrainingRecord): Promise<string | undefined> {
    if (!this.pendingPatch) return undefined;

    const patchDir = this.getPatchDir();
    ensureDir(patchDir);

    const timestamp = record.timestamp.replace(/[:.]/g, "-");
    const patchFileName = `patch-${timestamp}-${record.source}.patch`;
    const patchPath = path.join(patchDir, patchFileName);

    const patchContent = this.generateUnifiedDiff(
      this.pendingPatch.before,
      this.pendingPatch.after,
      this.pendingPatch.filePaths,
    );

    try {
      fs.writeFileSync(patchPath, patchContent, "utf8");
      return patchPath;
    } catch (e) {
      console.error(`[TrainingCapture] Failed to write patch: ${e}`);
      return undefined;
    }
  }

  private generateUnifiedDiff(
    before: string,
    after: string,
    filePaths: string[],
  ): string {
    const filePath = filePaths[0] ?? "file";
    const lines: string[] = [];
    lines.push(`--- a/${filePath}`);
    lines.push(`+++ b/${filePath}`);
    lines.push("@@ -1," + before.split("\n").length + " +1," + after.split("\n").length + " @@");

    const beforeLines = before.split("\n");
    const afterLines = after.split("\n");

    let i = 0;
    while (i < Math.max(beforeLines.length, afterLines.length)) {
      const bLine = beforeLines[i];
      const aLine = afterLines[i];
      if (bLine !== undefined && aLine !== undefined) {
        if (bLine === aLine) {
          lines.push(" " + bLine);
        } else {
          lines.push("-" + bLine);
          lines.push("+" + aLine);
        }
      } else if (bLine !== undefined) {
        lines.push("-" + bLine);
      } else if (aLine !== undefined) {
        lines.push("+" + aLine);
      }
      i++;
    }

    return lines.join("\n");
  }

  private async appendToJsonl(record: TrainingRecord): Promise<void> {
    const jsonlPath = this.getDatasetPath();
    ensureDir(path.dirname(jsonlPath));
    const line = JSON.stringify(record) + "\n";
    try {
      fs.writeFileSync(jsonlPath, line, { flag: "a" });
    } catch (e) {
      console.error(`[TrainingCapture] Failed to append to JSONL: ${e}`);
    }
  }

  /**
   * Export the captured dataset as a clean bundle.
   */
  async exportBundle(options?: {
    trainEvalSplit?: number;
    includePatches?: boolean;
  }): Promise<{ bundleDir: string; trainPath: string; evalPath?: string } | null> {
    const jsonlPath = this.getDatasetPath();
    if (!fs.existsSync(jsonlPath)) {
      console.warn("[TrainingCapture] No training data found to export.");
      return null;
    }

    const exportDir = this.getExportDir();
    ensureDir(exportDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const bundleDir = path.join(exportDir, `smart-ai-training-${timestamp}`);
    fs.mkdirSync(bundleDir, { recursive: true });

    const allLines = fs
      .readFileSync(jsonlPath, "utf8")
      .trim()
      .split("\n")
      .filter((l) => l.trim());

    const splitRatio = options?.trainEvalSplit ?? 0.9;
    const splitIndex = Math.floor(allLines.length * splitRatio);

    const trainLines = allLines.slice(0, splitIndex);
    const evalLines = allLines.slice(splitIndex);

    const trainPath = path.join(bundleDir, "train.jsonl");
    fs.writeFileSync(trainPath, trainLines.join("\n") + "\n");

    let evalPath: string | undefined;
    if (evalLines.length > 0) {
      evalPath = path.join(bundleDir, "eval.jsonl");
      fs.writeFileSync(evalPath, evalLines.join("\n") + "\n");
    }

    const manifest = {
      exportedAt: new Date().toISOString(),
      totalRecords: allLines.length,
      trainRecords: trainLines.length,
      evalRecords: evalLines.length,
      splitRatio,
      format: "jsonl",
      fields: [
        "instruction",
        "input",
        "output",
        "taskType",
        "model",
        "provider",
        "timestamp",
        "accepted",
        "source",
        "tags",
        "smarterpMode",
        "runtimeMode",
        "datasetRoot",
        "ollamaApiBase",
        "hostMachine",
      ],
      datasetRoot: this.getDatasetRoot(),
      runtimeMode: this.config.runtimeMode,
      ollamaApiBase: this.config.ollamaApiBase,
      hostMachine: os.hostname(),
      notes:
        "This dataset is prepared for LoRA/QLoRA fine-tuning. Import the resulting adapter into Ollama for continued use.",
    };
    fs.writeFileSync(
      path.join(bundleDir, "manifest.json"),
      JSON.stringify(manifest, null, 2),
    );

    if (options?.includePatches !== false) {
      const patchDir = this.getPatchDir();
      if (fs.existsSync(patchDir)) {
        const targetPatchDir = path.join(bundleDir, "patches");
        fs.mkdirSync(targetPatchDir, { recursive: true });
        const patchFiles = fs.readdirSync(patchDir);
        for (const file of patchFiles) {
          fs.copyFileSync(
            path.join(patchDir, file),
            path.join(targetPatchDir, file),
          );
        }
      }
    }

    return { bundleDir, trainPath, evalPath };
  }

  getStats(): {
    totalRecords: number;
    fileSizeBytes: number;
    patchCount: number;
  } {
    const jsonlPath = this.getDatasetPath();
    let totalRecords = 0;
    let fileSizeBytes = 0;

    if (fs.existsSync(jsonlPath)) {
      const content = fs.readFileSync(jsonlPath, "utf8");
      fileSizeBytes = content.length;
      totalRecords = content.trim().split("\n").filter((l) => l.trim()).length;
    }

    const patchDir = this.getPatchDir();
    let patchCount = 0;
    if (fs.existsSync(patchDir)) {
      patchCount = fs.readdirSync(patchDir).length;
    }

    return { totalRecords, fileSizeBytes, patchCount };
  }

  async markHighQuality(): Promise<boolean> {
    if (!this.lastInteraction) return false;
    return this.capture({
      ...this.lastInteraction,
      accepted: true,
      tags: [...(this.lastInteraction.tags ?? []), "high-quality"],
    });
  }

  async markRejected(): Promise<void> {
    this.lastInteraction = null;
    this.clearPendingPatch();
  }

  isSmarterpWorkspace(): boolean {
    return (this as any)._smarterpWorkspaceDetected ?? false;
  }
}
