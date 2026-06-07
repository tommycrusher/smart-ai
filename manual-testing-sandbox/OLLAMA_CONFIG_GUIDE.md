# Smart AI - Ollama Provider Configuration Guide

This guide explains how to configure and use Ollama provider with Smart AI, including support for local and remote tunnel modes.

## Quick Start

### 1. Install Ollama

Download and install Ollama from [https://ollama.ai](https://ollama.ai)

### 2. Pull Required Models

```bash
# Chat/Code model (primary - 7B)
ollama pull qwen2.5-coder:7b

# Autocomplete model (lightweight - 1.5B)
ollama pull qwen2.5-coder:1.5b

# Embeddings model
ollama pull nomic-embed-text
```

**Optional:** If you have a custom `smarterp-coder` model, ensure it's available in Ollama:
```bash
ollama create smarterp-coder -f Modelfile  # with your custom Modelfile
```

### 3. Run Ollama

```bash
# Start Ollama service
ollama serve
```

Ollama will be available at `http://localhost:11434` by default.

### 4. Configure Smart AI

Choose one of the configuration methods below:

#### Option A: Using YAML Configuration (Recommended)

Copy `config.yaml.ollama-template` to your Smart AI config directory:

```bash
# For global configuration
cp config.yaml.ollama-template ~/.smartairc.yaml

# For project-specific configuration
cp config.yaml.ollama-template ./.smartairc.yaml
```

#### Option B: Using JSON Configuration

Copy `.smartairc.ollama-template.json` to your Smart AI config directory:

```bash
# For global configuration
cp .smartairc.ollama-template.json ~/.smartairc.json

# For project-specific configuration
cp .smartairc.ollama-template.json ./.smartairc.json
```

#### Option C: Programmatic Configuration

Smart AI automatically uses Ollama defaults when no configuration is provided. These defaults are defined in:
- `/smart-ai/core/config/ollama.ts` - Configuration constants
- `/smart-ai/core/config/onboarding.ts` - Onboarding setup

## Mode Configuration

Smart AI supports two modes for Ollama:

### Local Mode (Default)
- **API Base**: `http://localhost:11434`
- **Use Case**: Direct local Ollama instance
- **Environment Variable**: (not set or `SMARTAI_OLLAMA_MODE=local`)

### Remote Tunnel Mode
- **API Base**: `http://localhost:11435`
- **Use Case**: Remote Ollama via SSH tunnel
- **Environment Variable**: `SMARTAI_OLLAMA_MODE=remote`

#### Setting Up Remote Tunnel Mode

1. **Create SSH Tunnel** (on your local machine):
```bash
ssh -L 11435:remote-host:11434 user@remote-host
```

2. **Configure Smart AI** to use remote mode:

**Method 1: Environment Variable**
```bash
export SMARTAI_OLLAMA_MODE=remote
# Then start Smart AI
```

**Method 2: Edit Configuration**
In your config file, change the `apiBase`:
```yaml
# For remote mode
models:
  - name: "Smart AI Coder"
    provider: "ollama"
    model: "smarterp-coder"
    apiBase: "http://localhost:11435"  # Remote tunnel
    ...
```

## Model Configuration Details

### Default Models

| Role | Model | Purpose |
|------|-------|---------|
| Chat | smarterp-coder | General conversation and code discussion |
| Edit | smarterp-coder | Inline code editing |
| Apply | smarterp-coder | Apply code changes |
| Autocomplete | qwen2.5-coder:1.5b | Tab autocomplete (FIM-optimized) |
| Embeddings | nomic-embed-text | Context retrieval and similarity search |

### Fallback Models

If primary models are unavailable, Smart AI will try:

- **Chat/Edit/Apply**: Fallback to `qwen2.5-coder:7b`
- **Autocomplete**: Fallback to `qwen2.5-coder:7b` (slower but functional)
- **Embeddings**: Fallback to `mistral-embed` if available

## Context Providers (Copilot-Style Awareness)

Smart AI ships with a set of default context providers that give it strong repo and file awareness, similar to GitHub Copilot:

| Provider | Trigger | Description |
|----------|---------|-------------|
| `file` | `@Files` | Reference any file in the workspace |
| `currentFile` | Auto / `@Current File` | The currently open file |
| `open` | `@Open Files` | All currently open (or pinned) files |
| `codebase` | `@Codebase` | Automatically find relevant files across the repo |
| `folder` | `@Folder` | Reference an entire folder for context |
| `diff` | `@Git Diff` | Current git diff (staged + unstaged) |
| `terminal` | `@Terminal` | Last terminal command output |
| `problems` | `@Problems` | Diagnostics / errors in the current file |
| `rules` | `@Rules` | Custom rules from `.continuerules` files |
| `docs` | `@Docs` | Indexed documentation (if configured) |

These providers are enabled by default when using the Ollama template or when no explicit context configuration is provided.

### Using Context Providers

In chat or edit mode, type `@` to see available providers:

- `@Codebase` - Ask questions about the entire repository without manually adding files
- `@Folder src/components` - Get context from a specific directory
- `@Git Diff` - Review your current changes
- `@Terminal` - Debug a failed command using terminal output
- `@Problems` - Ask Smart AI to fix errors shown in the Problems panel

### Context Provider Configuration

If you want to customize which providers are active, edit your `context` block:

```yaml
context:
  - provider: "file"
  - provider: "currentFile"
  - provider: "open"
  - provider: "codebase"
  - provider: "folder"
  - provider: "diff"
  - provider: "terminal"
  - provider: "problems"
  - provider: "rules"
```

**Note:** `codebase` and `folder` require an embeddings model (e.g., `nomic-embed-text`) for semantic search. If indexing is disabled, they will fall back to basic text search.

## Advanced Configuration

### Custom Completion Options

Edit your config file to customize model behavior:

```yaml
models:
  - name: "Smart AI Coder"
    provider: "ollama"
    model: "smarterp-coder"
    completionOptions:
      temperature: 0.7        # Randomness (0-1, higher = more creative)
      maxTokens: 2048         # Maximum response length
      topP: 0.95              # Nucleus sampling
      topK: 40                # Top-K sampling
      mirostat: 0             # Mirostat sampling (0=disabled)
      numThreads: 8           # CPU threads for generation
      keepAlive: 1800         # Keep model loaded for 30 minutes
```

### Tab Autocomplete Options

Fine-tune autocomplete behavior:

```yaml
tabAutocompleteOptions:
  disable: false              # Enable/disable
  maxPromptTokens: 1024       # Context size
  debounceDelay: 300          # Delay before generation (ms)
  maxSuffixPercentage: 0.2    # Max suffix in prompt
  prefixPercentage: 0.5       # Prefix/suffix ratio
  useCache: true              # Cache completions
  onlyMyCode: false           # Only suggest from project code
```

## Troubleshooting

### Model Not Found

If you get "model not found" errors:

1. Check if model is installed:
```bash
ollama list
```

2. Pull the model:
```bash
ollama pull qwen2.5-coder:7b
```

3. Verify Ollama is running:
```bash
curl http://localhost:11434/api/tags
```

### Connection Refused

If you get connection errors:

1. Ensure Ollama is running:
```bash
# Check if Ollama process is running
ps aux | grep ollama

# Restart Ollama
ollama serve
```

2. Check if port 11434 is accessible:
```bash
curl -v http://localhost:11434/
```

3. For remote mode, verify SSH tunnel is active:
```bash
netstat -an | grep 11435
```

### Slow Performance

If autocomplete or chat is slow:

1. Reduce `maxPromptTokens` for faster completion
2. Use smaller model for autocomplete (already using 1.5B by default)
3. Check system resources (CPU, RAM, GPU)
4. Reduce `keepAlive` to free up memory between requests

### Out of Memory

If you get OOM errors:

1. Use smaller models:
```bash
ollama pull qwen2.5-coder:1.5b  # Instead of 7b
ollama pull phi2                 # Very lightweight
```

2. Reduce context length:
```yaml
models:
  - name: "Smart AI Coder"
    contextLength: 2048  # Lower than default
```

## Configuration Files Reference

### Core Configuration (Auto-applied)
- Location: `/smart-ai/core/config/ollama.ts`
- Contains: Default models, ports, completion options
- Environment: `SMARTAI_OLLAMA_MODE=local|remote`

### Onboarding Configuration
- Location: `/smart-ai/core/config/onboarding.ts`
- When Used: First-time setup or no config file found
- Models Set: Chat (smarterp-coder), Autocomplete (qwen2.5-coder:1.5b), Embeddings (nomic-embed-text)

### User Configuration
- YAML: `~/.smartairc.yaml` or `./.smartairc.yaml`
- JSON: `~/.smartairc.json` or `./.smartairc.json`
- Priority: Project-specific > User home > Built-in defaults

## Next Steps

1. Copy one of the template files to start your configuration
2. Run Ollama and pull the required models
3. Update `apiBase` if using remote tunnel mode
4. Test with Smart AI - start a chat or use tab autocomplete
5. Fine-tune model parameters based on your needs

For more information, see:
- [Smart AI Documentation](https://docs.smart-ai.dev)
- [Ollama Documentation](https://github.com/ollama/ollama)
- [Model Cards](https://ollama.ai/library)
