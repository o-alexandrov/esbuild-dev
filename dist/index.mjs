var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
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
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __require = (x) => {
  if (typeof require !== "undefined")
    return require(x);
  throw new Error('Dynamic require of "' + x + '" is not supported');
};

// src/index.ts
import url from "url";

// src/build.ts
import esbuild from "esbuild";
import path2 from "path";
import util from "util";

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
async function build(entry, format = "esm", options) {
  const dirname = path2.dirname(entry);
  const pkgPath = lookupFile("package.json", dirname);
  const outfile = path2.join(tmpdir(), entry + extname[format]);
  const result = await esbuild.build(__spreadValues({
    entryPoints: [entry],
    external: lookupExternal(pkgPath),
    platform: "node",
    target,
    format,
    bundle: true,
    sourcemap: true,
    outfile
  }, options));
  return { outfile, result };
}

// src/functions/args.ts
var cliRE = /^--([-a-z]+)(?::([^=]+))?(?:=(.+))?$/;
var booleans = { true: true, false: false };
function argsToBuildOptions(args) {
  const buildOptions = {};
  for (const arg of args) {
    const m = cliRE.exec(arg);
    if (m) {
      const [, slashKey, subKey, value] = m;
      const key = camelize(slashKey);
      if (subKey && value) {
        (buildOptions[key] || (buildOptions[key] = {}))[subKey] = value;
      } else if (subKey) {
        (buildOptions[key] || (buildOptions[key] = [])).push(subKey);
      } else if (value) {
        const bool = booleans[value];
        if (bool !== void 0) {
          buildOptions[key] = bool;
        } else if (value.includes(",")) {
          buildOptions[key] = value.split(",");
        } else {
          buildOptions[key] = value;
        }
      } else {
        buildOptions[key] = true;
      }
    } else {
      throw new Error(`unknown arg: ${arg}`);
    }
  }
  return buildOptions;
}
function camelize(s) {
  return s.split("-").reduce((a, b) => a + capitalize(b));
}
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function buildOptionsToArgs(options) {
  const args = [];
  if (Array.isArray(options.entryPoints)) {
    args.push(...options.entryPoints);
  } else if (options.entryPoints) {
    args.push(...Object.entries(options.entryPoints).map(([k, v]) => `${k}=${v}`));
  }
  delete options.entryPoints;
  delete options.plugins;
  for (const [k, v] of Object.entries(options)) {
    const key = dashize(k);
    if (Array.isArray(v)) {
      if (["resolveExtensions", "mainFields", "conditions", "target"].includes(k)) {
        args.push(`--${key}=${v.join(",")}`);
      } else {
        args.push(...v.map((value) => `--${key}:${value}`));
      }
    } else if (typeof v === "object" && v !== null) {
      args.push(...Object.entries(v).map(([sub, val]) => `--${key}:${sub}=${JSON.stringify(val)}`));
    } else {
      args.push(`--${key}=${v}`);
    }
  }
  return args;
}
function dashize(s) {
  return s.replace(/([A-Z])/g, (x) => "-" + x.toLowerCase());
}

// src/functions/external.ts
import esbuild2 from "esbuild";
var packageNameRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*/;
var plugin = (external2) => ({
  name: "external",
  setup({ onResolve }) {
    onResolve({ filter: packageNameRegex, namespace: "file" }, (args) => {
      external2.add(packageNameRegex.exec(args.path)[0]);
      return { path: args.path, external: true };
    });
  }
});
async function external(entry, options) {
  options = __spreadValues({ entryPoints: [entry], bundle: true, format: "esm", write: false }, options);
  const libraries = new Set();
  (options.plugins ?? (options.plugins = [])).push(plugin(libraries));
  await esbuild2.build(options);
  return [...libraries];
}

// src/functions/platform.ts
import esbuild3 from "esbuild";
async function platform(entry, options) {
  options = __spreadProps(__spreadValues({ entryPoints: [entry] }, options), { bundle: true, write: false, logLevel: "silent" });
  delete options.format;
  try {
    await esbuild3.build(options);
    return "browser";
  } catch {
    options.platform = "node";
    await esbuild3.build(options);
    return "node";
  }
}

// src/index.ts
async function importFile(name, options) {
  return import(url.pathToFileURL((await build(name, "esm", options)).outfile).toString());
}
async function requireFile(name, options) {
  return __require((await build(name, "cjs", options)).outfile);
}
export {
  argsToBuildOptions,
  buildOptionsToArgs,
  external,
  importFile,
  platform,
  requireFile
};
//# sourceMappingURL=index.mjs.map
