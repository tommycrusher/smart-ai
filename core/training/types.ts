export type TrainingSource =
  | "chat"
  | "edit"
  | "apply"
  | "agent"
  | "manual"
  | "autocomplete";

export type TrainingTaskType =
  | "general-chat"
  | "code-explanation"
  | "code-generation"
  | "code-edit"
  | "code-review"
  | "code-refactor"
  | "bug-fix"
  | "test-generation"
  | "addon-analysis"
  | "module-generation"
  | "manifest-review"
  | "workspace-analysis"
  | "commit-message"
  | "agent-task";

export type RuntimeMode = "local" | "remote-host";

export interface TrainingRecord {
  instruction: string;
  input: string;
  output: string;
  taskType: TrainingTaskType;
  model: string;
  provider: string;
  apiBase?: string;
  workspaceRoot?: string;
  filePaths?: string[];
  contextSummary?: string;
  timestamp: string;
  accepted: boolean;
  source: TrainingSource;
  tags: string[];
  smarterpMode: boolean;
  patchPath?: string;
  beforeHash?: string;
  afterHash?: string;
  conversationId?: string;
  sessionId?: string;
  /** Runtime metadata so later fine-tuning steps know where the sample came from */
  runtimeMode?: RuntimeMode;
  datasetRoot?: string;
  ollamaApiBase?: string;
  hostMachine?: string;
  metadata?: Record<string, any>;
}

export interface TrainingCaptureConfig {
  enabled: boolean;
  autoCaptureAccepted: boolean;
  autoCaptureChat: boolean;
  autoCaptureEditApply: boolean;
  autoCaptureAgent: boolean;
  maxPatchSizeBytes: number;
  maxResponseSizeBytes: number;
  smarterpOnly: boolean;
  tagEnrichment: boolean;
  /** Path to the training dataset JSONL file. If omitted, defaults to the Smart AI global training dir. */
  datasetPath?: string;
  /** Path to the eval dataset JSONL file. If omitted, defaults to the Smart AI global training dir. */
  evalPath?: string;
  /** Directory for patch files. If omitted, defaults to the Smart AI global training dir. */
  patchDirPath?: string;
  /** Directory for exported bundles. If omitted, defaults to the Smart AI global training dir. */
  exportDirPath?: string;
  /** Optional temp directory for staging files during export. */
  tempDirPath?: string;
  /** Runtime mode: "local" or "remote-host". Affects path defaults and metadata. */
  runtimeMode: RuntimeMode;
  /** The Ollama API base URL to record in metadata. */
  ollamaApiBase: string;
}

export const DEFAULT_TRAINING_CAPTURE_CONFIG: TrainingCaptureConfig = {
  enabled: false,
  autoCaptureAccepted: true,
  autoCaptureChat: true,
  autoCaptureEditApply: true,
  autoCaptureAgent: true,
  maxPatchSizeBytes: 500_000,
  maxResponseSizeBytes: 100_000,
  smarterpOnly: false,
  tagEnrichment: true,
  runtimeMode: "local",
  ollamaApiBase: "http://localhost:11434",
};
