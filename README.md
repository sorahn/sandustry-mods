# Sandustry Mods

This repository is a Sandustry v1 mods monorepo. The current mod,
`infinite-source-trash`, adds two creative utility structures to the `Misc`
building category:

- **Infinite Source** emits configured gases above itself and other elements
  below it when the output cell is empty. When first placed, it opens a
  configuration prompt where you can enter a registered element ID such as
  `sand` or `copper`.
- **Infinite Trash** removes an element occupying its cell.

The block icons currently reuse the Creative Spawner and Creative Deleter icons
from the demo mod, renamed to `SourceBlock.png` and `Trash.png`.

## Repository layout

Each active mod is isolated under `mods/<name>` with its source, manifest, and
assets. Reusable TypeScript helpers live under `shared/` and are compiled into
each standalone entrypoint. Shared build rules live in `make/mod.mk`; reference
material remains under `resources/`. The Infinite Source/Trash entrypoint is
TypeScript and compiles to the plain JavaScript file Sandustry expects.

## Packaging

The root Makefile builds all active mods. Use a short mod name to target one
mod:

```sh
make build
make build MOD=zoom-hotkeys
make check
make format
```

For development, watch one mod and keep its installed copy up to date with:

```sh
make dev MOD=test-blocks
```

The initial dev workflow targets one mod at a time. Restart-only behavior is
the safe default; renderer hot reload will be enabled explicitly for mods once
they provide disposal for their UI, timers, listeners, and other registrations.
Changes that cannot be safely hot-reloaded will restart only the Sandustry
process launched by that dev session. A pre-existing game process is not taken
over automatically.

The watcher rebuilds on changes under the selected mod's `src/` and `assets/`
directories, reusable `shared/` code, and changes to its manifest, preview, or
root TypeScript configuration. Steam-managed `workshop.json` exists only in the
installed mod directory and is deliberately preserved there, not copied from
source. Its `publishedFileId` is backed up in the tracked root-level
`workshop-published-ids.json` file.
Override the installed-mod destination with
`SANDUSTRY_MODS_DIR=/path/to/sandustry/mods`.

HMR is opt-in per mod. Add a local, un-packaged `mods/<name>/dev-reload.json`
with `{ "mode": "hmr" }` only after the mod registers cleanup for every UI,
timer, listener, and other reloadable registration. Without that file, builds
still install automatically but the dev protocol reports `restart` mode.

The dev runner starts Sandustry when it is not already running and owns that
process. For an already-running game, use `make dev MOD=test-blocks TAKEOVER=1`
to explicitly hand ownership to the dev runner. Restart-mode changes then
restart the owned game automatically.

From the repository root, run `make install` to build the current version and
copy the unzipped mod into an ID-named folder in the default Sandustry mods
directory. Override the destination with
`make install SANDUSTRY_MODS_DIR=/path/to/mods`.

To bump one mod's version and create a commit containing only its manifest:

```sh
make version MOD=zoom-hotkeys patch
make version MOD=zoom-hotkeys minor
make version MOD=zoom-hotkeys major
```

### Make completion

The mod names used by `MOD=` are discovered from `mods/*`. Source the
completion helper for your shell from the repository root:

```sh
source make/completion.zsh   # zsh
source make/completion.bash  # bash
source make/completion.fish  # fish
```

Then `make build MOD=<tab>` (or any other Make target) completes the current
mod names. Set `SANDUSTRY_MODS_ROOT` if sourcing the helper from elsewhere.

The same commands are available from inside a mod directory, without the
`MOD=` argument. The install destination can be overridden with
`SANDUSTRY_MODS_DIR=/path/to/sandustry/mods`.

Generated `build/` directories and the root `artifacts/` archive directory are
ignored. Reference mods in `resources/` are not active mods and are not
packaged.
