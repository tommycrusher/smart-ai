const fs = require("fs");
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

let os;
let arch;
if (target) {
  [os, arch] = target.split("-");
} else {
  [os, arch] = autodetectPlatformAndArch();
}

if (os === "alpine") {
  os = "linux";
}
if (arch === "armhf") {
  arch = "arm64";
}
target = `${os}-${arch}`;
console.log("[info] Using target: ", target);

const exe = os === "win32" ? ".exe" : "";

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
  // Universal VSIX: keep all platform binaries
  console.log("[info] Copied onnxruntime-node (all platforms)");

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

  const lancedbPackages = [
    "@lancedb/vectordb-darwin-arm64",
    "@lancedb/vectordb-darwin-x64",
    "@lancedb/vectordb-linux-arm64-gnu",
    "@lancedb/vectordb-linux-x64-gnu",
    "@lancedb/vectordb-win32-x64-msvc",
  ];

  // Install all LanceDB platform packages for universal VSIX
  for (const pkg of lancedbPackages) {
    const packageDirName = pkg.split("/").pop();
    const packagePath = path.join(
      __dirname,
      "..",
      "node_modules",
      "@lancedb",
      packageDirName,
    );

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

  if (!skipInstalls) {
    await copySqlite(target);
  } else {
    console.log("[info] Skipping sqlite download because SKIP_INSTALLS=true");
  }

  console.log("[info] Copying sqlite node binding from core");
  await new Promise((resolve, reject) => {
    ncp(
      path.join(__dirname, "../node_modules/sqlite3/build"),
      path.join(__dirname, "../out/build"),
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

  // Copied here as well for the VS Code test suite
  await new Promise((resolve, reject) => {
    ncp(
      path.join(__dirname, "../node_modules/sqlite3/build"),
      path.join(__dirname, "../out"),
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

  // Copy all LanceDB platform binaries to out/node_modules for universal VSIX
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
    const platforms = [
    { os: "darwin", arch: "arm64", ext: "libonnxruntime.1.14.0.dylib" },
    { os: "darwin", arch: "x64", ext: "libonnxruntime.1.14.0.dylib" },
    { os: "linux", arch: "arm64", ext: "libonnxruntime.so.1.14.0" },
    { os: "linux", arch: "x64", ext: "libonnxruntime.so.1.14.0" },
    { os: "win32", arch: "x64", ext: "onnxruntime.dll" },
  ];

  const platformFiles = platforms.flatMap((p) => [
    `bin/napi-v3/${p.os}/${p.arch}/onnxruntime_binding.node`,
    `bin/napi-v3/${p.os}/${p.arch}/${p.ext}`,
  ]);

  validateFilesPresent([
    // Queries used to create the index for @code context provider
    "tree-sitter/code-snippet-queries/c_sharp.scm",

    // Queries used for @outline and @highlights context providers
    "tag-qry/tree-sitter-c_sharp-tags.scm",

    // onnx runtime bindings (all platforms for universal VSIX)
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

    // node_modules
    "node_modules/@vscode/ripgrep/bin/rg",
    "node_modules/@vscode/ripgrep/bin/rg.exe",

    // out directory (where the extension.js lives)
    "out/tree-sitter.wasm",
    // Worker required by jsdom
    "out/xhr-sync-worker.js",
    // SQLite3 Node native module
    "out/build/Release/node_sqlite3.node",

    // out/node_modules (to be accessed by extension.js)
    "out/node_modules/@vscode/ripgrep/bin/rg",
    "out/node_modules/@vscode/ripgrep/bin/rg.exe",
    // LanceDB (all platforms for universal VSIX)
    "out/node_modules/@lancedb/vectordb-darwin-arm64/index.node",
    "out/node_modules/@lancedb/vectordb-darwin-x64/index.node",
    "out/node_modules/@lancedb/vectordb-linux-arm64-gnu/index.node",
    "out/node_modules/@lancedb/vectordb-linux-x64-gnu/index.node",
    "out/node_modules/@lancedb/vectordb-win32-x64-msvc/index.node",
  ]);
  } catch (e) {
    console.error("[warn] File validation failed (some platform files may be missing):", e.message);
  }

  console.log(
    `[timer] Prepackage completed in ${Date.now() - startTime}ms - finished at ${new Date().toISOString()}`,
  );
  process.exit(0);
})();
