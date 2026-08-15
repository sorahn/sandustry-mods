# Sandustry Mods Monorepo Migration Plan

## Goal

Convert this repository from a single-mod project into a monorepo containing
multiple Sandustry v1 mods. Each mod will own its source code, manifest, and
assets. Mod source will be written in TypeScript and compiled to the plain
`entry.js` file expected by Sandustry.

The migration should preserve the current mod's behavior and local install
workflow throughout the transition.

## Decisions before implementation

- Use npm as the package manager. This project has one shared development
  toolchain rather than independently published npm packages, so npm's root
  install and `package-lock.json` workflow are a good fit. Mod directories
  remain Makefile-driven targets rather than npm workspaces.
- Pin TypeScript 7, Oxlint, Oxfmt, Husky, and staged-file tooling in the root
  development dependencies and lockfile.
- Compile TypeScript and TSX into a temporary build/staging directory. The
  package output will contain `entry.js` at its root, but generated files will
  not be treated as hand-edited source.
- Remove comments from emitted JavaScript, but do not minify it.
- Target Sandustry's React runtime directly through `sandkit.react`.
- The bundled game runtime uses React 18.3.1 and ReactDOM 18.3.1, with a
  matching React reconciler build. Use the React 18.3-compatible type
  packages for editor and compiler support, such as `@types/react` and
  `@types/react-dom` from the React 18 line. These are development-only types;
  no React runtime package should be bundled into a mod.
- Use TypeScript's built-in classic JSX transform with a custom JSX factory,
  rather than maintaining a separate JSX parser unless runtime behavior proves
  that insufficient. The intended configuration is:

  ```json
  {
    "jsx": "react",
    "jsxFactory": "sandkit.react.createElement"
  }
  ```

  This lets authors write `.tsx` normally while emitting calls to
  `sandkit.react.createElement`. Fragment support should use
  `sandkit.react.Fragment` only if that runtime value is confirmed to exist.
- Version commands are targeted commits. They may run with unrelated dirty or
  staged files, but must commit only the selected mod's manifest using an
  explicit path-limited commit. They must not reset, stash, or alter unrelated
  work.
- Install cleanup is intentionally deferred. Keep a future note/test for stale
  files, but do not introduce destructive cleanup during the initial migration.

## Target repository layout

```text
.
├── mods/
│   └── infinite-source-trash/
│       ├── src/
│       │   └── entry.ts
│       ├── assets/
│       │   ├── SourceBlock.png
│       │   └── Trash.png
│       ├── modinfo.json
│       ├── preview.png
│       └── workshop.json       # optional
├── resources/                  # API and reference material
├── types/
│   └── sandustry.d.ts          # shared ambient API declarations
├── make/
│   └── mod.mk                   # shared per-mod build rules
├── .vscode/
│   └── settings.json             # Oxfmt format-on-save configuration
├── .husky/
│   └── pre-commit                 # staged-file formatting hook
├── package.json
├── tsconfig.json
├── Makefile
├── README.md
└── agents.md
```

Each mod should also contain its own thin Makefile:

```text
mods/infinite-source-trash/Makefile
```

Generated files should not be committed:

```text
mods/*/build/
*.zip
node_modules/
```

## Build and package model

Each mod should have TypeScript sources under `src/`. The TypeScript compiler
will emit JavaScript into that mod's ignored `build/` directory:

```text
mods/infinite-source-trash/src/entry.ts
        │
        ▼
mods/infinite-source-trash/build/entry.js
```

The package step will create a temporary staging directory with `entry.js` at
the archive root, copy in the mod manifest and assets, and produce an archive
that Sandustry can load. The installed form should remain unzipped in a folder
named exactly after the manifest ID:

```text
$SANDUSTRY_MODS_DIR/<manifest-id>/
├── entry.js
├── modinfo.json
└── assets/
```

The generated JavaScript must remain a plain Sandustry v1 entry script:

- no `import` or `export` statements;
- `sandkit` remains available as the runtime global;
- top-level `await` remains allowed;
- comments are removed from emitted JavaScript;
- code is not minified;
- the manifest continues to declare `entry: "entry.js"`.

## Planned commands

The root Makefile should support building one mod or all mods:

```sh
make build
make build MOD=infinite-source-trash

make install
make install MOD=infinite-source-trash

make check
make format

make version MOD=infinite-source-trash patch
make version MOD=infinite-source-trash minor
make version MOD=infinite-source-trash major
```

The Makefile inside an individual mod should support the same relevant
commands while automatically targeting that mod:

```sh
cd mods/infinite-source-trash
make build
make install
make check
make format
make version patch
```

The per-mod Makefile should be a small configuration wrapper, not a second
copy of the build system. It should define the mod directory and include the
shared rules from the repository, for example:

```make
MOD_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
REPO_ROOT := $(abspath $(MOD_DIR)/../..)
include $(REPO_ROOT)/make/mod.mk
```

The shared include should provide the compile, JSX transform, lint, package,
install, clean, and version targets. The root Makefile should call those same
rules with `MOD_DIR` set for each discovered mod. This keeps behavior
consistent between root-level and mod-level commands.

Per-mod commands should interpret version arguments naturally:

```sh
make version major
make version minor
make version patch
```

They should retain the existing version-commit behavior: stage and commit only
that mod's `modinfo.json`, use a message such as
`version incremented: v0.2.0`, and install the mod after the commit succeeds.

The per-mod Makefile must work regardless of the caller's current directory
inside the mod folder. Paths should be derived from the Makefile location, not
from the shell's working directory. The root Makefile should remain the
preferred interface for building or installing all mods.

Expected behavior:

- `make build` compiles and packages every mod.
- `make build MOD=...` operates only on the requested mod.
- `make install` installs every built mod into the Sandustry mods directory.
- `make install MOD=...` installs only the requested mod.
- `make check` runs TypeScript checking, Oxlint, Oxfmt validation, JavaScript
  syntax checks, JSX-transform fixtures, manifest validation, and
  archive-content checks.
- `make format` formats supported TypeScript, TSX, JavaScript, JSON, and other
  configured files with Oxfmt.
- `make version` changes and commits only the selected mod's `modinfo.json`,
  using a message such as `version incremented: v0.2.0`, then installs that mod.

The existing `SANDUSTRY_MODS_DIR` override must remain supported:

```sh
make install SANDUSTRY_MODS_DIR=/path/to/sandustry/mods
```

## TypeScript setup

Add a root `package.json` with development tools for:

- TypeScript 7 compilation;
- TypeScript JSX factory configuration;
- Oxlint linting;
- Oxfmt formatting;
- Husky and staged-file formatting hooks;
- JSON or manifest validation if needed.

Add a root `tsconfig.json` with strict checking enabled where practical. The
initial configuration should compile each mod entrypoint without bundling it
or rewriting the Sandustry runtime global. Set `removeComments: true`, disable
minification, and emit into a temporary mod build/staging directory.

The TypeScript version should be pinned to TypeScript 7 rather than accepting
an unconstrained latest version. The exact compiler options should be checked
against the TypeScript 7 release available when implementation begins.

### JSX transformation

The source should support writing JSX directly in `.tsx` files, including UI
components such as the element picker. Configure TypeScript's JSX transform to
emit the form Sandustry can execute. For example:

```tsx
<button className="picker-button">Sand</button>
```

should become equivalent to:

```js
sandkit.react.createElement(
  "button",
  { className: "picker-button" },
  "Sand",
)
```

The JSX factory must use the React implementation supplied by Sandustry at
runtime. It must not bundle React or add a browser/runtime dependency to the
mod archive. TypeScript should handle the JSX lowering; a separate custom
transform is only needed if TypeScript's classic factory output cannot express
the runtime contract. The source should support the JSX features needed by the
picker first:
intrinsic elements, component elements, attributes, spread attributes,
expressions, fragments if needed, and nested children.

The preferred implementation order is:

1. configure TypeScript's classic JSX mode with
   `sandkit.react.createElement` as the factory;
2. add a tiny custom post-transform only if the emitted calls need adjustment;
3. emit a plain `entry.js` with no JSX and no module syntax;
4. run syntax checks and package validation on the emitted file.

The transform should have fixture tests before the current picker is converted
to JSX. Fixtures should cover strings, expressions, boolean attributes, spread
attributes, nested components, arrays of children, and event handlers.

### Oxlint

Add Oxlint as the primary fast linting pass for TypeScript, TSX, and generated
build-adjacent source files. Pin its version in the root development
dependencies or package manager lockfile.

The initial lint configuration should catch unused values, invalid imports,
unsafe obvious patterns, and accidental module syntax, while allowing
Sandustry's global runtime APIs. Add global declarations for `sandkit`, `React`
if needed by generated code, and other game-provided values rather than
suppressing those errors throughout the code.

Oxlint should run before packaging. Generated files should either be excluded
from linting or checked separately with `node --check`; TypeScript and TSX
source should be the primary lint targets.

### Oxfmt and editor integration

Use Oxfmt as the repository formatter instead of Prettier. Pin the Oxfmt
version and configure its supported file extensions explicitly. The formatter
configuration should cover TypeScript, TSX, JavaScript, JSON, and any other
formats supported by the selected Oxfmt version; unsupported files should not
be passed to it.

Add a checked-in `.vscode/settings.json` that makes Oxfmt the default formatter
for supported source files and enables format-on-save. The configuration should
ensure generated `build/` output is not formatted by the editor. If Oxfmt
requires a VS Code extension or executable path, document that setup and keep
the project configuration compatible with both the extension and the
command-line formatter.

### Husky pre-commit formatting

Set up Husky with a `pre-commit` hook and a staged-file runner such as
`lint-staged`. The hook should format only staged files that Oxfmt can handle,
then re-stage any changes made by formatting.

The staged-file configuration should include TypeScript, TSX, JavaScript, JSON,
and other explicitly supported source/configuration files, while excluding at
least:

```text
package-lock.json
```

It should also exclude generated build directories, archives, images, files
under `resources/` unless deliberately included later, and unrelated binary
assets. The hook should leave non-formatable staged files untouched and should
fail clearly if Oxfmt reports a formatting error.

Add shared declarations under `types/` for the API surface currently used by
the mod. Begin with declarations for:

- `sandkit.api`;
- structures and structure data;
- elements and world/grid operations;
- triggers and events;
- settings and storage;
- UI injection and prompts;
- action selection;
- navigation hooks;
- React values exposed through `sandkit.react`.

Install React 18.3-compatible type definitions for JSX authoring and type
checking. The local Sandustry declarations should augment those types to
describe the actual `sandkit.react` runtime surface, rather than importing a
second React runtime or assuming browser package resolution at game runtime.

The declarations should be expanded as new mods need more API surface. They do
not need to describe the entire Sandustry runtime in the first migration.

## Migration phases

### Phase 1: Establish the monorepo layout

- Create `mods/infinite-source-trash`.
- Move the current mod's manifest, assets, preview, and source into that
  directory.
- Preserve the manifest ID and all runtime behavior.
- Decide whether `workshop.json` belongs with the mod if one is added later.
- Update `.gitignore` for all generated output.

Validation:

- The repository contains one active mod under `mods/`.
- Reference material remains under `resources/`.
- No generated archive or build directory is required to be committed.

### Phase 2: Add the TypeScript toolchain

- Add `package.json`, `tsconfig.json`, and the shared API declarations.
- Pin TypeScript 7 and add the initial Oxlint configuration.
- Configure the TypeScript JSX factory and add a small TSX fixture test suite.
- Add Oxfmt, Husky, and staged-file configuration.
- Add formatting, linting, and type-checking scripts.
- Confirm the local environment can run the compiler and formatter.
- Confirm VS Code formats supported files with Oxfmt on save.
- Confirm the pre-commit hook formats staged files but skips
  `package-lock.json`.
- Keep the existing JavaScript entrypoint available until TypeScript output is
  proven equivalent.

Validation:

- A minimal TypeScript file compiles to a plain JavaScript entrypoint.
- A minimal TSX file transforms into runtime-compatible
  `sandkit.react.createElement` calls.
- Oxlint runs successfully against TypeScript and TSX sources.
- Oxfmt can format and check supported source files.
- VS Code uses Oxfmt on save for supported files.
- The Husky pre-commit hook formats staged files and excludes
  `package-lock.json`.
- The generated output contains no module syntax.
- The existing mod can still be installed locally.

### Phase 3: Convert the existing mod

- Rename or copy `entry.js` into `src/entry.ts`.
- Move UI components into `.tsx` files where JSX improves readability.
- Use the configured JSX factory in the real picker only after its fixtures
  pass.
- Add explicit types where they improve safety and leave complex runtime
  values typed as `unknown` or narrow local interfaces initially.
- Preserve the custom picker, blacklist, source persistence, line building,
  structure variants, and navigation behavior.
- Remove the old hand-maintained source entrypoint once the generated output
  is verified.

Validation:

- TypeScript compilation succeeds.
- `node --check` succeeds against generated `entry.js`.
- The archive contains `entry.js` at its root.
- `make install` updates the unzipped mod directory.

### Phase 4: Generalize the Makefile

- Discover active mods under `mods/*`.
- Add shared rules under `make/mod.mk`.
- Add a thin Makefile to every active mod directory.
- Read each mod's ID, name, and version from its manifest.
- Compile and package mods independently.
- Support `MOD=...` filtering.
- Make root-level and per-mod commands use the same shared rules.
- Keep build artifacts separated per mod.
- Make failures identify the specific mod that failed.

Validation:

- Building all mods and building the selected mod produce equivalent output.
- Running `make build`, `make install`, and `make check` from a mod directory
  targets only that mod.
- Per-mod commands work when invoked from the mod directory or its children.
- An invalid `MOD` value fails with a useful message.
- Install destinations use manifest IDs rather than folder names.

### Phase 5: Standardize the developer workflow

- Replace all remaining Prettier references with Oxfmt.
- Add `.vscode/settings.json` and document the required Oxfmt editor support.
- Add Husky's pre-commit hook and the staged-file configuration.
- Verify formatting only touches eligible staged files.
- Verify `package-lock.json` is never modified by the formatting hook.

Validation:

- Oxfmt produces the same result from the command line and VS Code.
- Saving a supported source file in VS Code formats it automatically.
- A commit with eligible staged files formats and re-stages them.
- A commit containing only `package-lock.json` does not run Oxfmt on it.

### Phase 6: Generalize versioning and documentation

- Move version increment logic to operate on a selected mod.
- Stage only that mod's manifest for the version commit.
- Keep the commit message format:
  `version incremented: vXXX`.
- Install the selected mod after a successful version increment.
- Document how to add a new mod.
- Update `agents.md` with the monorepo layout and build rules.

### Phase 7: Add future mods safely

Every new mod should be added as an isolated directory containing:

- its own `src/entry.ts`;
- its own `modinfo.json`;
- its own assets;
- optional preview and workshop metadata;
- no dependency on another mod's generated build directory.

Shared code can be added later under a clearly defined root library, but a
shared library should not be introduced until at least two mods genuinely need
the same behavior. Sandustry entrypoints must still be emitted as standalone
plain scripts unless the game is verified to support another format.

## Compatibility and risk notes

### Sandustry entrypoint constraints

The game expects one plain `entry.js` per mod. TypeScript compilation must not
emit ES module imports, CommonJS wrappers, or a runtime dependency on Node.js.

### Runtime globals

The compiler needs declarations for `sandkit`, but the generated script must
continue to use the runtime-provided global. The build must not bundle or
replace it.

### React and UI hooks

The custom picker relies on the game-provided React runtime and UI injection
surface. Type declarations should describe these APIs without adding a React
runtime dependency to the mod archive.

### Assets and packaging

Assets must be copied relative to the package root. Packaging should be tested
with `unzip -l` to catch incorrect nesting such as `mod/entry.js` instead of
`entry.js`.

### Reference mods

The files under `resources/v1` and `resources/demo` are reference material,
not active monorepo mods. They should remain available for API and behavior
comparison unless deliberately promoted into `mods/` later.

### Version commits

Versioning is intentionally a repository mutation: it edits and commits only a
manifest, then installs the selected mod. Normal builds and installs must not
create commits.

## Definition of done

The migration is complete when:

- all active mods live under `mods/`;
- TypeScript 7 is pinned and each active mod has TypeScript source plus a
  generated `entry.js` package output;
- TSX source is transformed into Sandustry-compatible
  `sandkit.react.createElement` calls without bundling React;
- Oxlint runs successfully as part of validation;
- `make build` and `make install` work for all mods;
- `MOD=...` targeting works;
- version increments affect only the selected mod's manifest and install it;
- the current Infinite Source/Trash mod behaves the same in-game;
- generated files are ignored;
- the README and `agents.md` explain the workflow for adding another mod.
