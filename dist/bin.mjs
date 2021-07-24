#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};

// src/bin.ts
import cp from "child_process";

// src/build.ts
import esbuild from "esbuild";
import path2 from "path";
import util from "util";

// src/error.txt
var error_default = "\n[esbuild-dev] something went wrong on spawn node process\n              but you can try to run the file by hand:\n\n    > node --enable-source-maps {file} {args}\n";

// src/utils.ts
import fs from "fs";
import os from "os";
import path from "path";
function isFile(path3) {
  return fs.existsSync(path3) && fs.statSync(path3).isFile();
}
function lookupFile(filename = "package.json", dir = process.cwd()) {
  const file = path.join(dir, filename);
  if (isFile(file)) {
    return file;
  } else {
    const parent = path.dirname(dir);
    if (parent !== dir) {
      return lookupFile(filename, parent);
    }
  }
}
var currentPackage = lookupFile("package.json");
function lookupExternal(pkgPath = currentPackage, includeDev = true) {
  if (pkgPath) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return Object.keys(__spreadValues(__spreadValues(__spreadValues({}, pkg.dependencies), pkg.peerDependencies), includeDev && pkg.devDependencies));
  }
  return [];
}
function tmpdir(pkgPath = currentPackage) {
  if (pkgPath) {
    const dir = path.join(path.dirname(pkgPath), "node_modules/.esbuild-dev");
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
  return os.tmpdir();
}

// src/build.ts
var nodeVersion = process.versions.node.split(".", 3).slice(0, 2);
var target = `node${nodeVersion.join(".")}`;
var extname = { esm: ".mjs", cjs: ".js" };
async function build(entry2, format2 = "esm", options2) {
  const dirname = path2.dirname(entry2);
  const pkgPath = lookupFile("package.json", dirname);
  const outfile2 = path2.join(tmpdir(), entry2 + extname[format2]);
  const result = await esbuild.build(__spreadValues({
    entryPoints: [entry2],
    external: lookupExternal(pkgPath),
    platform: "node",
    target,
    format: format2,
    bundle: true,
    sourcemap: true,
    outfile: outfile2
  }, options2));
  return { outfile: outfile2, result };
}
function errorMessage(file, args2) {
  const template = { file, args: args2.map((e) => util.inspect(e)).join(" ") };
  return error_default.replace(/{(\w+)}/g, (_, key) => template[key] || "");
}

// src/help.txt
var help_default = "\nUsage:\n  esbuild-dev [--cjs] [--watch] [--plugin:name] main.ts ...\n\nOptions:\n  --cjs                 By default, it compiles your file in ESM format.\n                        This will change it to CJS format. For example,\n                        `__dirname` can only be used in CJS, and\n                        `import.meta` can only be used in ESM.\n\n  --watch               Enable watch mode.\n  alias: -w\n\n  --plugin:name         Load esbuild plugins. For example, `--plugin:style` will\n  alias: -p             try to load `esbuild-plugin-style`, `esbuild-style` and\n                        `style` in your project. This option can not be used\n                        outside of a package.\n";

// src/index.ts
import url from "url";
async function importFile(name, options2) {
  return import(url.pathToFileURL((await build(name, "esm", options2)).outfile).toString());
}

// src/plugin.ts
function unwrap(mod) {
  if (typeof mod === "function") {
    try {
      return mod();
    } catch {
    }
  }
  return mod;
}
function extractModule(mod) {
  if (mod.default) {
    return unwrap(mod.default);
  }
  const names = Object.keys(mod);
  if (names.length) {
    return unwrap(mod[names[0]]);
  }
}
async function loadPlugin(name) {
  if (isFile(name)) {
    return extractModule(await importFile(name));
  }
  if (currentPackage) {
    const installed = lookupExternal(currentPackage);
    for (const packageName of installed) {
      if (packageName.endsWith(name)) {
        return extractModule(await import(packageName));
      }
    }
  }
}

// src/bin.ts
var format = "esm";
var entry = "";
var args = [];
var watch = false;
var plugins = [];
var help = false;
var pluginName;
var plugin;
for (const arg of process.argv.slice(2)) {
  if (arg === "--help") {
    help = true;
    break;
  } else if (arg === "--cjs") {
    format = "cjs";
  } else if (arg === "--watch" || arg === "-w") {
    watch = true;
  } else if (arg.startsWith("--plugin:") || arg.startsWith("-p:")) {
    if (pluginName = arg.slice(arg.indexOf(":") + 1)) {
      if (plugin = await loadPlugin(pluginName)) {
        plugins.push(plugin);
      }
    }
  } else if (!entry && !arg.startsWith("-")) {
    entry = arg;
  } else {
    args.push(arg);
  }
}
if (help || !entry) {
  console.log(help_default);
  process.exit(0);
}
var outfile;
var stop;
var child;
var delay = (ms) => new Promise((r) => setTimeout(r, ms));
var kill = async () => {
  if (child) {
    child.kill("SIGTERM");
    await delay(200);
    if (child && !child.killed) {
      child.kill("SIGKILL");
      await delay(100);
    }
  }
};
var run = async () => {
  try {
    await kill();
    child = cp.spawn(process.argv0, ["--enable-source-maps", outfile, ...args], {
      stdio: "inherit",
      cwd: process.cwd(),
      env: process.env
    });
    child.on("close", (code) => {
      watch && console.log("[esbuild-dev] child process stopped with code", code);
      child = void 0;
    });
    child.on("error", () => {
      console.error(errorMessage(outfile, args));
      kill();
    });
  } catch {
    console.log(errorMessage(outfile, args));
    child = void 0;
  }
};
var options = { plugins };
if (watch) {
  options.watch = {
    onRebuild(_error, result) {
      if (result)
        ({ stop } = result), run();
    }
  };
}
({ outfile, result: { stop } } = await build(entry, format, options));
run();
if (watch) {
  process.stdin.on("data", async (e) => {
    if (e.toString().startsWith("exit")) {
      await kill();
      stop?.();
      process.exit(0);
    }
  });
}
//# sourceMappingURL=bin.mjs.map
