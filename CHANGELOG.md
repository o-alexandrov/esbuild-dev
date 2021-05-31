# Changelog

## [Unreleased]

### Changed

- **[Breaking]** The outfile format is changed to `esm`.
  - `__filename` replacement is preserved for compatibility.
  - `require()` will throw error, use `import` instead.
- Deps are discovered through esbuild metafile instead of scanning `import` by hand.
- Export names are changed: `esbuildRun` &rarr; `runFile`, `esbuildDev` &rarr; `watchFile`.

## [0.2.8] - 2021-05-18

### Added

- Bundle entry point to `node_modules/.esbuild-dev/file.js` and run it.
- Watch and rebuild incrementally and rerun.
- Shortcut to call `esbuild --bundle`.
- Plugins support (since [0.2.0]).

[unreleased]: https://github.com/hyrious/esbuild-dev/compare/v0.2.8...HEAD
[0.2.8]: https://github.com/hyrious/esbuild-dev/releases/tag/v0.2.8
[0.2.0]: https://github.com/hyrious/esbuild-dev/releases/tag/v0.2.0