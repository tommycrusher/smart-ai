# Smart AI Training Capture Pipeline

This module provides automatic training-data capture from real Smart AI IDE usage, producing structured datasets ready for later LoRA/QLoRA fine-tuning.

## Architecture

```
Smart AI IDE Usage
  |
  +-- Accepted edits   --> processDiff.ts --> TrainingCaptureService.capture()
  +-- Apply operations --> ApplyManager.ts (pending state) --> processDiff.ts
  +-- Manual saves     --> VS Code commands --> TrainingCaptureService.capture()
  +-- Chat responses   --> Manual command (auto-capture TBD)
  +-- Agent runs       --> Manual command (auto-capture TBD)
  |
  v
~/.smart-ai/training/train.jsonl   (structured JSONL — default)
~/.smart-ai/training/patches/        (unified diff files — default)
  |
  +-- Export Bundle --> train.jsonl + eval.jsonl + patches/ + manifest.json
  |
  v
LoRA/QLoRA Fine-Tuning Pipeline (separate process)
  |
  v
Ollama Model Import
```

## Core Components

### TrainingCaptureService

Singleton service that manages all training data capture.

**Key methods:**
- `capture(record)` - Append a structured record to the dataset
- `setPendingInteraction(record)` - Stage data before user acceptance
- `setPendingPatch(before, after, filePaths)` - Stage diff data
- `markHighQuality()` - Flag last interaction as premium example
- `markRejected()` - Exclude last interaction from training
- `exportBundle(options)` - Generate a clean dataset bundle
- `getStats()` - Get dataset statistics

### Configuration

All paths and endpoints are configurable. No path is hardcoded into the implementation.

Controlled via VS Code settings (`smartai.training*`):

| Setting | Default | Description |
|---------|---------|-------------|
| `trainingCaptureEnabled` | `false` | Master on/off switch |
| `trainingAutoCaptureAccepted` | `true` | Auto-capture accepted edits/applies |
| `trainingAutoCaptureChat` | `true` | Auto-capture chat outputs |
| `trainingAutoCaptureEditApply` | `true` | Auto-capture edit/apply operations |
| `trainingAutoCaptureAgent` | `true` | Auto-capture agent outputs |
| `trainingMaxPatchSize` | `500000` | Max patch file size in bytes |
| `trainingMaxResponseSize` | `100000` | Max captured response size in bytes |
| `trainingSmarterpOnly` | `false` | Only capture in Smarterp repos |
| `trainingDatasetPath` | `null` | Custom training JSONL path |
| `trainingEvalPath` | `null` | Custom eval JSONL path |
| `trainingPatchDirPath` | `null` | Custom patches directory |
| `trainingExportDirPath` | `null` | Custom export directory |
| `trainingTempDirPath` | `null` | Optional temp directory |
| `trainingRuntimeMode` | `"local"` | `"local"` or `"remote-host"` |
| `trainingOllamaApiBase` | `"http://localhost:11434"` | Ollama endpoint for metadata |

**Path resolution order:**
1. If a custom path is set in VS Code settings, it is used as-is.
2. If unset, the default Smart AI global training directory is used (`~/.smart-ai/training/...`).

**Default path examples:**

Remote-host mode (Linux):
```
datasetPath:    /home/tom/smart-ai-training/train.jsonl
evalPath:       /home/tom/smart-ai-training/eval.jsonl
patchDirPath:   /home/tom/smart-ai-training/patches
exportDirPath:  /home/tom/smart-ai-training/exports
```

Local Windows mode:
```
datasetPath:    D:\AI_CACHE\smarterp-model\datasets\train.jsonl
evalPath:       D:\AI_CACHE\smarterp-model\datasets\eval.jsonl
patchDirPath:   D:\AI_CACHE\smarterp-model\patches
exportDirPath:  D:\AI_CACHE\smarterp-model\exports
```

**Important:** The extension host writes files on the machine where it runs. If you use remote-host mode (e.g., SSH into a Linux box from a Windows laptop), set the paths to locations writable on that remote host.

### Record Format (JSONL)

```json
{
  "instruction": "Fix the type error in this function",
  "input": "function greet(name: string) { return name + 1; }",
  "output": "function greet(name: string) { return name + '!'; }",
  "taskType": "bug-fix",
  "model": "qwen2.5-coder:7b",
  "provider": "ollama",
  "apiBase": "http://localhost:11434",
  "workspaceRoot": "/home/user/my-project",
  "filePaths": ["/home/user/my-project/src/greet.ts"],
  "contextSummary": "TypeScript function with string concatenation error",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "accepted": true,
  "source": "edit",
  "tags": ["bug-fix", "typescript", "smarterp"],
  "smarterpMode": true,
  "patchPath": "/home/user/.smart-ai/training/patches/patch-... .patch",
  "beforeHash": "a1b2c3d4...",
  "afterHash": "e5f6g7h8...",
  "conversationId": "conv-123",
  "sessionId": "session-456",
  "runtimeMode": "local",
  "datasetRoot": "/home/user/.smart-ai/training",
  "ollamaApiBase": "http://localhost:11434",
  "hostMachine": "workstation-lab01"
}
```

### Smarterp-Aware Enrichment

When working in a Smarterp repository (detected by `__manifest__.py` files or `smarterp-*` naming):

- `smarterpMode` is set to `true`
- Auto-tags: `smarterp`, `addon-analysis`, `module-generation`, `manifest-review`
- The rule "Smarterp is an independent fork, never Odoo" is enforced

## Integration Points

### 1. Diff Acceptance (`processDiff.ts`)

When a user accepts a diff via `smartai.acceptDiff`:
1. `editOutcomeTracker.getPendingEdit(streamId)` retrieves model/prompt/completion info
2. `TrainingCaptureService.capture()` writes the record
3. Patch is generated from pre-save vs post-save content

### 2. Apply Operations (`ApplyManager.ts`)

When code is applied from chat:
1. The apply creates a diff via `VerticalDiffManager`
2. User accepts via `processDiff`
3. Training record is captured with `source: "apply"`

### 3. Chat Responses (Manual)

For chat responses, use the VS Code command:
- `Smart AI: Save Last Exchange as Training Example`

Future enhancement: auto-capture on thumbs-up or explicit acceptance.

### 4. Agent Mode (Manual / Future)

For agent runs, manual save is available. Future work can auto-capture approved agent outputs.

## Export Workflow

The `exportBundle` method generates:

```
~/.smart-ai/training/exports/smart-ai-training-2025-01-15T10-30-00/
  train.jsonl          # 90% of records (default)
  eval.jsonl           # 10% of records
  patches/             # Copied patch files
  manifest.json        # Metadata and schema docs
```

This bundle is ready for a separate fine-tuning pipeline.

## Connecting to Ollama

**Important:** This module does NOT self-train Ollama. The end-to-end workflow is:

1. **Capture** - Smart AI collects training data during normal usage
2. **Export** - Generate a clean dataset bundle
3. **Fine-tune** - Run LoRA/QLoRA training in a separate pipeline (e.g., using `unsloth`, `axolotl`, or custom scripts)
4. **Import** - Convert the resulting adapter to GGUF and import into Ollama:
   ```bash
   ollama create smarterp-coder-improved -f Modelfile
   ```

## Future Work

- Auto-capture chat responses on thumbs-up/acceptance
- Auto-capture agent runs on task completion
- Integration with external dataset storage (S3, etc.)
- Real-time dataset quality scoring
- Active learning: suggest which examples to label next
