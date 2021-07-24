var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
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
var __markAsModule = (target2) => __defProp(target2, "__esModule", { value: true });
var __export = (target2, all) => {
  __markAsModule(target2);
  for (var name in all)
    __defProp(target2, name, { get: all[name], enumerable: true });
};
var __reExport = (target2, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target2, key) && key !== "default")
        __defProp(target2, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target2;
};
var __toModule = (module2) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};

// src/index.ts
__export(exports, {
  argsToBuildOptions: () => argsToBuildOptions,
  buildOptionsToArgs: () => buildOptionsToArgs,
  external: () => external,
  importFile: () => importFile,
  platform: () => platform,
  requireFile: () => requireFile
});
var import_url = __toModule(require("url"));

// src/build.ts
var import_esbuild = __toModule(require("esbuild"));
var import_path2 = __toModule(require("path"));
var import_util = __toModule(require("util"));

// src/utils.ts
var import_fs = __toModule(require("fs"));
var import_os = __toModule(require("os"));
var import_path = __toModule(require("path"));
function isFile(path3) {
  return import_fs.default.existsSync(path3) && import_fs.default.statSync(path3).isFile();
}
function lookupFile(filename = "package.json", dir = process.cwd()) {
  const file = import_path.default.join(dir, filename);
  if (isFile(file)) {
    return file;
  } else {
    const parent = import_path.default.dirname(dir);
    if (parent !== dir) {
      return lookupFile(filename, parent);
    }
  }
}
var currentPackage = lookupFile("package.json");
function lookupExternal(pkgPath = currentPackage, includeDev = true) {
  if (pkgPath) {
    const pkg = JSON.parse(import_fs.default.readFileSync(pkgPath, "utf-8"));
    return Object.keys(__spreadValues(__spreadValues(__spreadValues({}, pkg.dependencies), pkg.peerDependencies), includeDev && pkg.devDependencies));
  }
  return [];
}
function tmpdir(pkgPath = currentPackage) {
  if (pkgPath) {
    const dir = import_path.default.join(import_path.default.dirname(pkgPath), "node_modules/.esbuild-dev");
    import_fs.default.mkdirSync(dir, { recursive: true });
    return dir;
  }
  return import_os.default.tmpdir();
}

// src/build.ts
var nodeVersion = process.versions.node.split(".", 3).slice(0, 2);
var target = `node${nodeVersion.join(".")}`;
var extname = { esm: ".mjs", cjs: ".js" };
async function build(entry, format = "esm", options) {
  const dirname = import_path2.default.dirname(entry);
  const pkgPath = lookupFile("package.json", dirname);
  const outfile = import_path2.default.join(tmpdir(), entry + extname[format]);
  const result = await import_esbuild.default.build(__spreadValues({
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
var import_esbuild2 = __toModule(require("esbuild"));
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
  await import_esbuild2.default.build(options);
  return [...libraries];
}

// src/functions/platform.ts
var import_esbuild3 = __toModule(require("esbuild"));
async function platform(entry, options) {
  options = __spreadProps(__spreadValues({ entryPoints: [entry] }, options), { bundle: true, write: false, logLevel: "silent" });
  delete options.format;
  try {
    await import_esbuild3.default.build(options);
    return "browser";
  } catch {
    options.platform = "node";
    await import_esbuild3.default.build(options);
    return "node";
  }
}

// src/index.ts
async function importFile(name, options) {
  return import(import_url.default.pathToFileURL((await build(name, "esm", options)).outfile).toString());
}
async function requireFile(name, options) {
  return require((await build(name, "cjs", options)).outfile);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  argsToBuildOptions,
  buildOptionsToArgs,
  external,
  importFile,
  platform,
  requireFile
});
//# sourceMappingURL=index.js.map
