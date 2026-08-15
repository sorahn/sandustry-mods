# Agent Notes

## Project goal

This repository contains a Sandustry v1 mod that adds two creative utility
structures:

- **Infinite Source**: emits a configurable element continuously.
- **Infinite Trash**: removes elements in its footprint.

The blocks belong in the `misc` building category and currently reuse the two
icons from the demo Creative Mode mod.

## Important version distinction

The original Creative Mode resources are for a demo/older modding environment.
They are useful as behavioral and visual references, but their APIs must not be
copied into the real v1 mod.

Do not use these demo APIs in the v1 implementation:

- `fluxloaderAPI`
- `corelib.blocks.register`
- `corelib.simulation.spawnElement`
- `entry.electron.js`, `entry.game.js`, and `entry.worker.js` as v1 entrypoint
  conventions

The real v1 mods use a single plain script declared by `entry` in `modinfo.json`.
The script is compiled with `sandkit` already in scope, so it uses:

```js
const api = sandkit.api;
```

There must be no `import` or `export` statements. Top-level `await` is allowed.

## Useful v1 API patterns discovered

The supplied real v1 mods established the following patterns:

- Manifest fields include `manifestVersion`, `id`, `name`, `version`,
  `apiVersion`, `entry`, `dependencies`, and `loadOrder`.
- Register localized text with `api.i18n.register("en", translations)`.
- Load mod assets with `await api.sprites.loadFromMod(spriteId, relativePath)`.
- Register structures with `api.structures.register(...)`.
- Structure definitions can use `categoryKey`, `order`, `buildModes`, `shape`,
  and `render.imageName`.
- Unlock structures directly with
  `api.player.buildings.unlockByType(structureId)`.
- Register recurring behavior with `api.triggers.register(triggerId, {
  interval, callback
})`.
- Iterate placed structures with `api.structures.forEachOfType`.
- Register deferred behavior after native content is ready with
  `api.events.on("game:ready", callback)`.
- Store per-structure data with `api.structures.setData`.
- Read and write elements through `api.elements`.
- Use `api.world.isCellEmptyAtCell` before creating output.
- Use `api.elements.createAtCellWhenIdle` and
  `api.elements.removeAtCellWhenIdle` for main-thread deferred mutations.
- Use `api.grid.forEachCellInRect` for rectangular footprints.
- Use `api.ui.prompt` and `api.ui.toast` for the current Source configuration
  UI.

## Settings and configuration findings

The Mods tab appears only for mods with a non-empty `configSchema` in
`modinfo.json`. Settings use fields such as `boolean`, `number`, and `choice`,
with required `labelKey` values. Runtime values are available through
`api.settings.get`, `api.settings.getAll`, and `api.settings.onChange`.

The project currently uses a placement-time prompt instead of an undocumented
native structure configuration panel. On first placement, Source opens a custom
element picker modeled on the game's filter picker: searchable element grid,
matter-type filters, color swatches, and cancel behavior. A valid ID is stored
in structure data as `elementId`. Canceling or entering an invalid ID disables
that Source rather than silently emitting Sand. If the runtime does not expose
React or the expected modal overlay slot, the code falls back to the text
prompt.

## Current implementation behavior

The implementation lives in `mod/entry.js` and `mod/modinfo.json`.

- Mod ID: `sorahn.sandustry-test-blocks`
- Current version: `0.1.0`
- Entrypoint: `entry.js`
- Structures: `sandustryTestBlocksSource` and
  `sandustryTestBlocksTrash`
- Category: `misc`
- Both structures use a 4×4 footprint and the demo icons:
  - `mod/assets/SourceBlock.png`
  - `mod/assets/Trash.png`
- The structure shape is intentionally four rows of zeroes, matching the demo
  blocks. This makes the structures non-blocking overlays and avoids the red
  occupied-footprint rendering caused by an all-ones shape.
- Source output is a 4×4 area directly below the structure, for up to 16
  particles per trigger.
- Source only fills empty output cells and does not overwrite existing material.
- Source trigger interval is 500 ms, matching the demo Creative Spawner's
  `tickInterval: 500`. The earlier 100 ms interval produced material too
  quickly.
- Trash scans and removes elements throughout its 4×4 footprint every trigger.
- The picker uses the proven Steam-mod pattern `const React = sandkit.react`
  with `api.ui.inject`. It reads registered element definitions for names, IDs,
  matter types, and colors. If injection or the React runtime is unavailable,
  it falls back to the text prompt.
- `BLACKLISTED_ELEMENT_IDS` in `mod/entry.js` is the explicit blacklist for
  unfinished or unwanted elements. The same check is applied to picker entries,
  manual ID input, and runtime spawning. Definitions with `hidden: true` are
  also excluded automatically.

The source tracks three states by structure position:

- `configuredSources`: structures already initialized.
- `configuringSources`: structures whose prompt is open; these must not spawn.
- `disabledSources`: structures canceled or given an invalid element ID.

This state is session-local. The selected `elementId` is persisted through the
structure data, so existing configured Sources do not reopen the prompt after a
reload.

## Assets and packaging

The source files are under `mod/`. The distributable archive is generated as
`infinite-source-trash-0.1.0.zip` or the current Makefile-derived archive name.
Generated zip files are ignored by `.gitignore`.

The Makefile provides:

```sh
make build
make install
```

`make build` packages the contents of `mod/` with `modinfo.json` at the archive
root. `make install` installs the unzipped mod contents into a directory named
exactly after the manifest ID under:

```text
/Users/daryl/Library/Application Support/sandustry/mods
```

The destination can be overridden:

```sh
make install SANDUSTRY_MODS_DIR=/path/to/mods
```

After making mod changes, run `make install` so the unzipped current version is
updated in the local Sandustry mods directory. This is the standard handoff
step for local runtime testing.

## Verification and limitations

Checks performed during development:

- `node --check mod/entry.js`
- JSON parsing of `mod/modinfo.json`
- Makefile dry runs with `make -n install`
- Archive content inspection with `unzip -l`

No in-game runtime test is available in this environment. If behavior needs
further debugging, test these cases in Sandustry:

1. Place Source and confirm no particle appears before choosing an element.
2. Cancel Source configuration and confirm the Source remains inert.
3. Choose Sand and confirm a 4×4 batch appears below the Source every 500 ms.
4. Remove output material and confirm the Source refills empty cells.
5. Place Trash over falling material and confirm its full 4×4 footprint clears it.
6. Confirm the red footprint overlay is gone with the all-zero shape.
7. Reload a world with a configured Source and confirm it does not prompt again.

If the game does not accept the all-zero structure shape or the `single` build
mode, compare against the supplied v1 Rocket Dispenser and adjust the structure
registration while preserving the 4×4 geometry and `misc` category.
