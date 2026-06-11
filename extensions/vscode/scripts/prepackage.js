const fs = require("fs");
const os = require("os");
const path = require("path");

const ncp = require("ncp").ncp;
const { rimrafSync } = require("rimraf");

const {
  validateFilesPresent,
  execCmdSync,
  autodetectPlatformAndArch,
} = require("../../../scripts/util/index");

const { copySqlite } = require("./download-copy-sqlite");
const { generateAndCopyConfigYamlSchema } = require("./generate-copy-config");
const { installAndCopyNodeModules } = require("./install-copy-nodemodule");
const { npmInstall } = require("./npm-install");
const { writeBuildTimestamp, continueDir } = require("./utils");

// Clear folders that will be packaged to ensure clean slate
rimrafSync(path.join(__dirname, "..", "bin"));
rimrafSync(path.join(__dirname, "..", "out"));
fs.mkdirSync(path.join(__dirname, "..", "out", "node_modules"), {
  recursive: true,
});
const guiDist = path.join(__dirname, "..", "..", "..", "gui", "dist");
if (!fs.existsSync(guiDist)) {
  fs.mkdirSync(guiDist, { recursive: true });
}

const skipInstalls = process.env.SKIP_INSTALLS === "true";

// Get the target to package for
let target = undefined;
const args = process.argv;
if (args[2] === "--target") {
  target = args[3];
}
if (!target) {
  const envTarget =
    process.env.SMARTAI_VSCODE_TARGET ||
    process.env.SMARTAI_BUILD_TARGET ||
    process.env.VSCODE_TARGET;
  if (envTarget && typeof envTarget === "string") {
    target = envTarget.trim();
  }
}

let targetOs;
let targetArch;
if (target) {
  [targetOs, targetArch] = target.split("-");
} else {
  [targetOs, targetArch] = autodetectPlatformAndArch();
}

if (targetOs === "alpine") {
  targetOs = "linux";
}
if (targetArch === "armhf") {
  targetArch = "arm64";
}
target = `${targetOs}-${targetArch}`;
console.log("[info] Using target: ", target);

const exe = targetOs === "win32" ? ".exe" : "";

const isWinTarget = target?.startsWith("win");
const isLinuxTarget = target?.startsWith("linux");
const isMacTarget = target?.startsWith("darwin");

void (async () => {
  const startTime = Date.now();
  console.log(
    `[info] Packaging extension for target ${target} - started at ${new Date().toISOString()}`,
  );

  // Make sure we have an initial timestamp file
  writeBuildTimestamp();

  if (!skipInstalls) {
    const installStart = Date.now();
    console.log(`[timer] Starting npm installs at ${new Date().toISOString()}`);
    await Promise.all([generateAndCopyConfigYamlSchema(), npmInstall()]);
    console.log(
      `[timer] npm installs completed in ${Date.now() - installStart}ms`,
    );
  }

  process.chdir(path.join(continueDir, "gui"));

  // Copy over the dist folder to the JetBrains extension //
  const intellijExtensionWebviewPath = path.join(
    "..",
    "extensions",
    "intellij",
    "src",
    "main",
    "resources",
    "webview",
  );

  const indexHtmlPath = path.join(intellijExtensionWebviewPath, "index.html");
  fs.copyFileSync(indexHtmlPath, "tmp_index.html");
  rimrafSync(intellijExtensionWebviewPath);
  fs.mkdirSync(intellijExtensionWebviewPath, { recursive: true });

  const jetbrainsCopyStart = Date.now();
  console.log(`[timer] Starting JetBrains copy at ${new Date().toISOString()}`);
  await new Promise((resolve, reject) => {
    ncp("dist", intellijExtensionWebviewPath, (error) => {
      if (error) {
        console.warn(
          "[error] Error copying React app build to JetBrains extension: ",
          error,
        );
        reject(error);
      }
      resolve();
    });
  });
  console.log(
    `[timer] JetBrains copy completed in ${Date.now() - jetbrainsCopyStart}ms`,
  );

  // Put back index.html
  if (fs.existsSync(indexHtmlPath)) {
    rimrafSync(indexHtmlPath);
  }
  fs.copyFileSync("tmp_index.html", indexHtmlPath);
  fs.unlinkSync("tmp_index.html");

  console.log("[info] Copied gui build to JetBrains extension");

  // Then copy over the dist folder to the VSCode extension //
  const vscodeGuiPath = path.join("../extensions/vscode/gui");
  rimrafSync(vscodeGuiPath);
  fs.mkdirSync(vscodeGuiPath, { recursive: true });
  const vscodeCopyStart = Date.now();
  console.log(`[timer] Starting VSCode copy at ${new Date().toISOString()}`);
  await new Promise((resolve, reject) => {
    ncp("dist", vscodeGuiPath, (error) => {
      if (error) {
        console.log(
          "Error copying React app build to VSCode extension: ",
          error,
        );
        reject(error);
      } else {
        console.log("Copied gui build to VSCode extension");
        resolve();
      }
    });
  });
  console.log(
    `[timer] VSCode copy completed in ${Date.now() - vscodeCopyStart}ms`,
  );

  if (!fs.existsSync(path.join("dist", "assets", "index.js"))) {
    throw new Error("gui build did not produce index.js");
  }
  if (!fs.existsSync(path.join("dist", "assets", "index.css"))) {
    throw new Error("gui build did not produce index.css");
  }

  // Copy over native / wasm modules //
  process.chdir("../extensions/vscode");

  fs.mkdirSync("bin", { recursive: true });

  // onnxruntime-node
  const onnxCopyStart = Date.now();
  console.log(
    `[timer] Starting onnxruntime copy at ${new Date().toISOString()}`,
  );
  await new Promise((resolve, reject) => {
    ncp(
      path.join(__dirname, "../../../core/node_modules/onnxruntime-node/bin"),
      path.join(__dirname, "../bin"),
      {
        dereference: true,
      },
      (error) => {
        if (error) {
          console.warn("[info] Error copying onnxruntime-node files", error);
          reject(error);
        }
        resolve();
      },
    );
  });
  console.log(
    `[timer] onnxruntime copy completed in ${Date.now() - onnxCopyStart}ms`,
  );

  // Platform-specific build: keep only the target platform's onnxruntime
  // binaries to keep the VSIX ~90MB.
  const onnxBase = path.join(__dirname, "../bin/napi-v3");
  if (fs.existsSync(onnxBase)) {
    if (!isMacTarget) rimrafSync(path.join(onnxBase, "darwin"));
    if (!isLinuxTarget) rimrafSync(path.join(onnxBase, "linux"));
    if (!isWinTarget) rimrafSync(path.join(onnxBase, "win32"));
    // Drop large CUDA/TensorRT providers we don't ship
    if (isLinuxTarget) {
      for (const f of [
        "libonnxruntime_providers_cuda.so",
        "libonnxruntime_providers_shared.so",
        "libonnxruntime_providers_tensorrt.so",
      ]) {
        const fp = path.join(onnxBase, "linux", targetArch, f);
        if (fs.existsSync(fp)) fs.rmSync(fp);
      }
    }
  }
  console.log(`[info] Copied onnxruntime-node (target ${target} only)`);

  // tree-sitter-wasm
  fs.mkdirSync("out", { recursive: true });

  await new Promise((resolve, reject) => {
    ncp(
      path.join(__dirname, "../../../core/node_modules/tree-sitter-wasms/out"),
      path.join(__dirname, "../out/tree-sitter-wasms"),
      { dereference: true },
      (error) => {
        if (error) {
          console.warn("[error] Error copying tree-sitter-wasm files", error);
          reject(error);
        } else {
          resolve();
        }
      },
    );
  });

  const filesToCopy = [
    "../../../core/vendor/tree-sitter.wasm",
    "../../../core/llm/llamaTokenizerWorkerPool.mjs",
    "../../../core/llm/llamaTokenizer.mjs",
    "../../../core/llm/tiktokenWorkerPool.mjs",
    "../../../core/util/start_ollama.sh",
  ];

  for (const f of filesToCopy) {
    fs.copyFileSync(
      path.join(__dirname, f),
      path.join(__dirname, "..", "out", path.basename(f)),
    );
    console.log(`[info] Copied ${path.basename(f)}`);
  }

  // tree-sitter tag query files
  // ncp(
  //   path.join(
  //     __dirname,
  //     "../../../core/node_modules/llm-code-highlighter/dist/tag-qry",
  //   ),
  //   path.join(__dirname, "../out/tag-qry"),
  //   (error) => {
  //     if (error)
  //       console.warn("Error copying code-highlighter tag-qry files", error);
  //   },
  // );

  // textmate-syntaxes
  await new Promise((resolve, reject) => {
    ncp(
      path.join(__dirname, "../textmate-syntaxes"),
      path.join(__dirname, "../gui/textmate-syntaxes"),
      (error) => {
        if (error) {
          console.warn("[error] Error copying textmate-syntaxes", error);
          reject(error);
        } else {
          resolve();
        }
      },
    );
  });

  // Platform-specific build (VS Code Marketplace standard): only include the
  // LanceDB binary for the target platform. This keeps each VSIX ~90MB.
  const lancedbPackageByTarget = {
    "darwin-arm64": "@lancedb/vectordb-darwin-arm64",
    "darwin-x64": "@lancedb/vectordb-darwin-x64",
    "linux-arm64": "@lancedb/vectordb-linux-arm64-gnu",
    "linux-x64": "@lancedb/vectordb-linux-x64-gnu",
    "win32-x64": "@lancedb/vectordb-win32-x64-msvc",
    "win32-arm64": "@lancedb/vectordb-win32-x64-msvc", // no native win32-arm64 build
  };
  const targetLancedbPackage = lancedbPackageByTarget[target];
  if (!targetLancedbPackage) {
    throw new Error(`No LanceDB binary mapping for target ${target}`);
  }
  const lancedbPackages = [targetLancedbPackage];

  // Install LanceDB binary for the target platform only
  for (const pkg of lancedbPackages) {
    const packageDirName = pkg.split("/").pop();
    const packagePath = path.join(__dirname, "..", "node_modules", "@lancedb", packageDirName);
    if (!fs.existsSync(packagePath)) {
      console.log(`[info] Installing LanceDB binary: ${pkg}`);
      await installAndCopyNodeModules(pkg, "@lancedb");
      if (!fs.existsSync(packagePath)) {
        console.warn(`[warn] Failed to install LanceDB binary at ${packagePath}`);
      }
    } else {
      console.log(`[info] LanceDB binary already present: ${packageDirName}`);
    }
  }

  // Prune any non-target LanceDB binaries left over from previous builds so
  // the VSIX only ships the target platform binary (~90MB).
  const lancedbDir = path.join(__dirname, "..", "node_modules", "@lancedb");
  if (fs.existsSync(lancedbDir)) {
    const keepDirName = targetLancedbPackage.split("/").pop();
    for (const entry of fs.readdirSync(lancedbDir)) {
      if (entry.startsWith("vectordb-") && entry !== keepDirName) {
        rimrafSync(path.join(lancedbDir, entry));
        console.log(`[info] Pruned non-target LanceDB binary: ${entry}`);
      }
    }
  }

  // --- SQLite3 cross-platform binary handling ---
  // Step 1: Download the correct prebuilt sqlite3 binary for the TARGET platform
  // via copySqlite (downloads from GitHub releases into core/node_modules/sqlite3/build/).
  if (!skipInstalls) {
    await copySqlite(target);
  } else {
    console.log("[info] Skipping sqlite download because SKIP_INSTALLS=true");
  }

  // Step 2: Copy the sqlite3 package to out/node_modules/sqlite3.
  // IMPORTANT: We first copy the JS files from the local node_modules/sqlite3,
  // then OVERWRITE the native binary (build/Release/node_sqlite3.node) with the
  // one downloaded by copySqlite for the target platform. This prevents shipping
  // a host-platform binary (e.g. Windows PE) inside a Linux VSIX.
  const sqlite3PkgPath = path.join(__dirname, "../node_modules/sqlite3");
  const sqlite3OutPath = path.join(__dirname, "../out/node_modules/sqlite3");
  // The target-platform binary lives in core/node_modules/sqlite3/build/Release
  // after copySqlite downloads and extracts it.
  const sqlite3CoreBuildPath = path.join(__dirname, "../../../core/node_modules/sqlite3/build");

  if (fs.existsSync(sqlite3PkgPath)) {
    console.log("[info] Copying sqlite3 JS package to out/node_modules");
    fs.mkdirSync(sqlite3OutPath, { recursive: true });
    await new Promise((resolve, reject) => {
      ncp(
        sqlite3PkgPath,
        sqlite3OutPath,
        { dereference: true },
        (error) => {
          if (error) {
            console.warn("[error] Error copying sqlite3 files", error);
            reject(error);
          } else {
            resolve();
          }
        },
      );
    });

    // Step 3: Overwrite the native binary with the target-platform version.
    // copySqlite downloads the correct binary for the target into
    // core/node_modules/sqlite3/build/Release/node_sqlite3.node.
    // We must copy it on top of whatever was in node_modules/sqlite3/build/
    // (which is the HOST platform binary from npm install).
    const targetBinaryPath = path.join(sqlite3CoreBuildPath, "Release", "node_sqlite3.node");
    const outBinaryPath = path.join(sqlite3OutPath, "build", "Release", "node_sqlite3.node");
    if (fs.existsSync(targetBinaryPath)) {
      fs.mkdirSync(path.join(sqlite3OutPath, "build", "Release"), { recursive: true });
      fs.copyFileSync(targetBinaryPath, outBinaryPath);
      console.log(`[info] Overwrote sqlite3 native binary with target-platform (${target}) build`);
    } else {
      console.warn(`[warn] Target-platform sqlite3 binary not found at ${targetBinaryPath}`);
      console.warn("[warn] The VSIX may contain a host-platform binary — this will cause 'invalid ELF header' errors on other platforms!");
    }
  } else {
    console.warn("[warn] sqlite3 not found in node_modules, skipping copy");
  }

  // Copy node_modules for pre-built binaries
  const NODE_MODULES_TO_COPY = [
    "@lancedb",
    "@vscode/ripgrep",
    "workerpool",
    // External modules (see esbuild.js external list) required at runtime by
    // google-auth-library/gaxios/jwa. Must be copied since node_modules/** is
    // excluded from the VSIX (see .vscodeignore).
    "extend",
    "ecdsa-sig-formatter",
    "safe-buffer",
    // Required by sqlite3 (which is external for per-platform prebuilds)
    "bindings",
    "file-uri-to-path",
  ];

  fs.mkdirSync("out/node_modules", { recursive: true });

  await Promise.all(
    NODE_MODULES_TO_COPY.map(
      (mod) =>
        new Promise((resolve, reject) => {
          fs.mkdirSync(`out/node_modules/${mod}`, { recursive: true });
          ncp(
            `node_modules/${mod}`,
            `out/node_modules/${mod}`,
            { dereference: true },
            function (error) {
              if (error) {
                console.error(`[error] Error copying ${mod}`, error);
                reject(error);
              } else {
                console.log(`[info] Copied ${mod}`);
                resolve();
              }
            },
          );
        }),
    ),
  );

  console.log(`[info] Copied ${NODE_MODULES_TO_COPY.join(", ")}`);

  // Remove large unnecessary files to minimize VSIX size
  const guiMap = path.join(__dirname, "..", "gui", "assets", "index.js.map");
  if (fs.existsSync(guiMap)) {
    fs.rmSync(guiMap);
    console.log("[info] Removed gui source map (15MB)");
  }

  // Prune the non-target ripgrep binary so the VSIX only ships one platform's.
  const rgDir = path.join(__dirname, "..", "out", "node_modules", "@vscode", "ripgrep", "bin");
  if (fs.existsSync(rgDir)) {
    const dropRg = isWinTarget ? "rg" : "rg.exe";
    const dropPath = path.join(rgDir, dropRg);
    if (fs.existsSync(dropPath)) {
      fs.rmSync(dropPath);
      console.log(`[info] Pruned non-target ripgrep binary: ${dropRg}`);
    }
  }

  // Copy the target LanceDB platform binary to out/node_modules
  for (const pkg of lancedbPackages) {
    const packageDirName = pkg.split("/").pop();
    const srcPath = path.join(__dirname, "..", "node_modules", "@lancedb", packageDirName);
    const destPath = path.join(__dirname, "..", "out", "node_modules", "@lancedb", packageDirName);
    const indexPath = path.join(destPath, "index.node");
    if (fs.existsSync(srcPath) && !fs.existsSync(indexPath)) {
      rimrafSync(destPath);
      fs.mkdirSync(destPath, { recursive: true });
      fs.cpSync(srcPath, destPath, { recursive: true, dereference: true });
      console.log(`[info] Copied LanceDB binary to ${destPath}`);
    }
  }

  // Copy over any worker files
  fs.cpSync(
    "node_modules/jsdom/lib/jsdom/living/xhr/xhr-sync-worker.js",
    "out/xhr-sync-worker.js",
  );

  // Validate the all of the necessary files are present
  try {
    const onnxExt = isMacTarget
      ? "libonnxruntime.1.14.0.dylib"
      : isLinuxTarget
        ? "libonnxruntime.so.1.14.0"
        : "onnxruntime.dll";
    const platformFiles = [
      `bin/napi-v3/${targetOs}/${targetArch}/onnxruntime_binding.node`,
      `bin/napi-v3/${targetOs}/${targetArch}/${onnxExt}`,
    ];
    const keepLancedbDir = targetLancedbPackage.split("/").pop();

  validateFilesPresent([
    // Queries used to create the index for @code context provider
    "tree-sitter/code-snippet-queries/c_sharp.scm",

    // Queries used for @outline and @highlights context providers
    "tag-qry/tree-sitter-c_sharp-tags.scm",

    // onnx runtime bindings (target platform only)
    ...platformFiles,

    // Code/styling for the sidebar
    "gui/assets/index.js",
    "gui/assets/index.css",

    // Tutorial
    "media/move-chat-panel-right.md",
    "smartai_tutorial.py",
    "config_schema.json",

    // Embeddings model
    "models/all-MiniLM-L6-v2/config.json",
    "models/all-MiniLM-L6-v2/special_tokens_map.json",
    "models/all-MiniLM-L6-v2/tokenizer_config.json",
    "models/all-MiniLM-L6-v2/tokenizer.json",
    "models/all-MiniLM-L6-v2/vocab.txt",
    "models/all-MiniLM-L6-v2/onnx/model_quantized.onnx",

    // node_modules (target platform's ripgrep only)
    `node_modules/@vscode/ripgrep/bin/rg${exe}`,

    // out directory (where the extension.js lives)
    "out/tree-sitter.wasm",
    // Worker required by jsdom
    "out/xhr-sync-worker.js",

    // out/node_modules (to be accessed by extension.js)
    `out/node_modules/@vscode/ripgrep/bin/rg${exe}`,
    // LanceDB (target platform only)
    `out/node_modules/@lancedb/${keepLancedbDir}/index.node`,
    // SQLite3 native binary (must match target platform)
    "out/node_modules/sqlite3/build/Release/node_sqlite3.node",
  ]);
  } catch (e) {
    console.error("[warn] File validation failed (some platform files may be missing):", e.message);
  }

  console.log(
    `[timer] Prepackage completed in ${Date.now() - startTime}ms - finished at ${new Date().toISOString()}`,
  );
  process.exit(0);
})();
