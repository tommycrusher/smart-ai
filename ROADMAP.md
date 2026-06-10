# Smart AI Extension Roadmap

## Platform-Specific VSIX Builds (Completed 2026-06-09)

The VS Code: extension currently requires separate platform-specific builds because it bundles native binary modules (ONNX Runtime, SQLite3, LanceDB, ripgrep). Each OS uses different binary formats (`.so`/`.dll`/`.dylib`, `.node`, `.exe`).

### Current State

Two separate VSIX files are produced in `extensions/vscode/build/`:

| File | Target | Notes |
|---|---|---|
| `smart-ai-1.3.39.vsix` | `linux-x64` | Default build for the development machine |
| `smart-ai-win32-x64-1.3.39.vsix` | `win32-x64` | Built with `SMARTAI_VSCODE_TARGET=win32-x64` |

### How to Build

```bash
# Linux (default — no target needed)
cd extensions/vscode && npm run package

# Windows
cd extensions/vscode && SMARTAI_VSCODE_TARGET=win32-x64 npm run package -- --target win32-x64
```

**Note:** The Windows build requires manual placement of `rg.exe` (ripgrep) because `@vscode/ripgrep` does not ship `rg.exe` on Linux hosts:
```bash
mkdir -p node_modules/@vscode/ripgrep/bin
mkdir -p out/node_modules/@vscode/ripgrep/bin
cp /path/to/rg.exe node_modules/@vscode/ripgrep/bin/rg.exe
cp /path/to/rg.exe out/node_modules/@vscode/ripgrep/bin/rg.exe
```

---

## Future: Universal VSIX with `optionalDependencies`

### Goal

Publish a single `.vsix` that works on **all platforms** by leveraging VS Code:'s `optionalDependencies` mechanism. This is the same approach used by `@vscode/ripgrep`.

### How It Works

1. The base VSIX contains only cross-platform JavaScript/TypeScript code (no native binaries).
2. `package.json` declares platform-specific packages as `optionalDependencies`.
3. VS Code: resolves and downloads only the dependency matching the user's platform at install time.

### Required Changes

#### 1. Remove Native Binaries from `prepackage.js`

Update `extensions/vscode/scripts/prepackage.js` to **stop copying** the following into the VSIX:

- `bin/napi-v3/*/onnxruntime_binding.node`
- `bin/napi-v3/*/libonnxruntime.so.1.14.0` / `onnxruntime.dll`
- `out/node_modules/@lancedb/vectordb-*-*/index.node`
- `out/build/Release/node_sqlite3.node`
- `node_modules/@vscode/ripgrep/bin/rg` / `rg.exe`

#### 2. Add `optionalDependencies` to `package.json`

```json
{
  "optionalDependencies": {
    "@lancedb/vectordb-darwin-x64": "0.5.0",
    "@lancedb/vectordb-darwin-arm64": "0.5.0",
    "@lancedb/vectordb-linux-x64-gnu": "0.5.0",
    "@lancedb/vectordb-linux-arm64-gnu": "0.5.0",
    "@lancedb/vectordb-win32-x64-msvc": "0.5.0",
    "@vscode/ripgrep-darwin-x64": "latest",
    "@vscode/ripgrep-darwin-arm64": "latest",
    "@vscode/ripgrep-linux-x64": "latest",
    "@vscode/ripgrep-linux-arm64": "latest",
    "@vscode/ripgrep-win32-x64": "latest"
  }
}
```

#### 3. Update Native Module Loading Paths

In `extensions/vscode/src/util/vscode.ts` (or wherever native modules are loaded), change from hardcoded `out/node_modules/...` paths to dynamic resolution that checks `node_modules` at runtime.

Example pattern:
```typescript
function resolveNativeModule(moduleName: string, binaryName: string): string {
  // 1. Check if bundled in VSIX (for offline/air-gapped installs)
  const bundledPath = path.join(__dirname, "..", "node_modules", moduleName, binaryName);
  if (fs.existsSync(bundledPath)) return bundledPath;

  // 2. Check optionalDependency installed by VS Code:
  const optionalPath = path.join(__dirname, "..", "..", moduleName, binaryName);
  if (fs.existsSync(optionalPath)) return optionalPath;

  // 3. Fallback to global node_modules
  return require.resolve(`${moduleName}/${binaryName}`);
}
```

#### 4. Handle `onnxruntime-node` and `sqlite3`

These packages already publish platform-specific binaries via npm's `optionalDependencies` (e.g., `onnxruntime-node` includes `onnxruntime_binding.node` for all platforms in one package). However, the current build copies only the Linux binary into the VSIX.

**Option A:** Remove manual copying from `prepackage.js` and let npm resolve the correct binary at runtime.

**Option B:** Keep manual copying but copy **all** platform binaries into the VSIX (increases size significantly).

#### 5. Adjust `scripts/package.js`

Remove or modify the `--no-dependencies` flag. Currently `package.js` uses:
```javascript
"npx @vscode/vsce package --out ./build --no-dependencies"
```
The `--no-dependencies` flag prevents VS Code: from bundling `node_modules`. For the universal VSIX approach, we likely want:
```javascript
"npx @vscode/vsce package --out ./build"
```
so that VS Code: knows about the `optionalDependencies` in `package.json`.

### Benefits

- **Single artifact:** One `.vsix` file for all platforms.
- **Smaller per-platform footprint:** Users download only the native binaries they need.
- **Automated marketplace publishing:** VS Code: Marketplace already supports platform-specific `optionalDependencies`.
- **No manual `rg.exe` hacks:** Platform packages are pulled from npm automatically.

### Risks & Considerations

- **Air-gapped / offline users:** If native binaries are not bundled, the extension fails on machines without internet access. Mitigation: provide a separate "offline" VSIX that bundles all platforms (large file), or pre-download the optional deps during CI.
- **LanceDB version lock:** All platform LanceDB packages must be kept in sync.
- **Electron/Node ABI compatibility:** Native `.node` modules must match the Node.js version used by the VS Code: extension host. This is already handled by npm for packages that publish prebuilt binaries.

### Acceptance Criteria

- [ ] `npm run package` produces one `smart-ai-X.X.X.vsix` without platform suffix.
- [ ] Installing that VSIX on Windows works without prior manual `rg.exe` placement.
- [ ] Installing that VSIX on Linux works without bundling Windows binaries.
- [ ] Installing that VSIX on macOS works without bundling Linux/Windows binaries.
- [ ] Extension size per platform remains under ~80 MB.

---

*Last updated: 2026-06-09*
