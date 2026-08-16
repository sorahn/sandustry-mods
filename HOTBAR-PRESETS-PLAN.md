# Hotbar Presets and Import/Export Plan

This plan turns the debug discovery into a reusable hotbar preset capability.
The initial implementation should remain conservative: it uses the discovered
internal store path and UI refresh hooks behind a small adapter, rather than
spreading bundle-specific access throughout a mod.

## Discovered runtime contract

The current game exposes the hotbar internally at:

```js
sandkit.engine.state.store.player.hotbar
```

The observed shape is:

```js
{
  activeSlotIndex: number | null,
  hotbarIndex: number,
  bars: Array<Array<{ id: number | string, type: number } | null>>
}
```

The visible UI refreshes through the discovered calls:

```js
api.ui.update(1)
api.ui.update(19)
engine.api.ui.overlays.update("hotbar")
```

These are internal escape hatches and may change with a game update.

## 1. Isolate the internal hotbar adapter

- [ ] Create a small adapter with methods for reading the hotbar, replacing the
      hotbar, refreshing the UI, and checking runtime compatibility.
- [ ] Prefer `sandkit.enums.ComponentId.Hotbar` and
      `sandkit.enums.ComponentId.HotbarOverlays` for refresh IDs when available.
- [ ] Keep compatibility fallbacks for runtimes that do not expose
      `sandkit.enums`.
- [ ] Keep all `sandkit.engine.state.store.player.hotbar` access inside the
      adapter.
- [ ] Keep all numeric UI component IDs and the `"hotbar"` overlay key inside
      the adapter.
- [ ] Return a clear unavailable result when the expected internal path is not
      present.
- [ ] Log the detected game/runtime shape in debug mode.
- [ ] Avoid depending on minified function names or private bundle module IDs.
- [ ] Add a compatibility version or feature flag so the adapter can be
      disabled after a game update.

## 2. Define the preset data format

- [ ] Define a versioned JSON format for a hotbar preset.
- [ ] Store `activeSlotIndex`, `hotbarIndex`, and `bars`.
- [ ] Preserve numeric and string item IDs without coercion.
- [ ] Preserve item `type` values exactly.
- [ ] Preserve empty slots as `null`.
- [ ] Decide whether presets should include the active bar and selected slot or
      only the bar contents.
- [ ] Validate bar and slot arrays before applying them.
- [ ] Reject malformed entries instead of partially applying corrupt data.
- [ ] Reject or warn about unknown item IDs while allowing them to be preserved
      for mod compatibility.
- [ ] Add a format version and optional source game/mod metadata.
- [ ] Keep the format independent from the game's blueprint format.

## 3. Implement export and import

- [ ] Export the current hotbar to compact JSON.
- [ ] Export readable formatted JSON for manual editing.
- [ ] Import a complete preset from clipboard text.
- [ ] Import a preset from a local JSON file.
- [ ] Copy a preset to the system clipboard.
- [ ] Download a preset as a `.json` file.
- [ ] Validate imported JSON before touching the live hotbar.
- [ ] Apply imported bars using controlled array replacement rather than
      retaining references to clipboard-parsed objects unnecessarily.
- [ ] Restore `activeSlotIndex` and `hotbarIndex` only when the preset includes
      valid values.
- [ ] Provide a contents-only import option that leaves the current selection
      unchanged.
- [ ] Refresh the visible hotbar after a successful import.
- [ ] Report which parts of a preset were applied or skipped.

## 4. Add preset storage

- [ ] Store named presets separately from the live game hotbar.
- [ ] Use mod-local storage or another scoped persistence mechanism.
- [ ] Add create, rename, overwrite, duplicate, and delete operations.
- [ ] Keep a last-known-good preset so a failed import can be reverted.
- [ ] Avoid overwriting the live hotbar automatically when a preset is saved.
- [ ] Add an explicit restore-default or restore-backup action.
- [ ] Define behavior when stored presets contain entries from an uninstalled
      mod.

## 5. Build the user-facing controls

- [ ] Decide where the controls belong: injected panel, pause/settings panel,
      hotbar overlay, or a dedicated mod UI.
- [ ] Keep the initial design small and functional; visual layout can evolve.
- [ ] Add actions for export, import, save preset, load preset, and delete
      preset.
- [ ] Show the current bar count and slot count.
- [ ] Show the active bar and active slot.
- [ ] Show unknown or unavailable item IDs clearly.
- [ ] Provide confirmation before replacing the live hotbar.
- [ ] Provide a visible success/failure result after refresh.
- [ ] Support controller navigation if the UI is injected into a controller-aware
      game surface.
- [ ] Ensure clipboard failures have a file/text fallback.

## 6. Preserve game behavior

- [ ] Refresh the main hotbar component after replacing state.
- [ ] Refresh hotbar overlays after replacing state.
- [ ] Test switching bars after import.
- [ ] Test selecting an imported building after import.
- [ ] Test tools, weapons, native buildings, mod buildings, and empty slots.
- [ ] Test importing while the inventory or build menu is open.
- [ ] Test importing while a structure is selected.
- [ ] Test importing while `activeSlotIndex` is `null`.
- [ ] Confirm that importing a preset does not accidentally trigger an action.
- [ ] Confirm that importing a preset does not place or remove structures.
- [ ] Confirm that the current world and player position are unaffected.

## 7. Add safety and recovery behavior

- [ ] Take an automatic in-memory snapshot before every replacement.
- [ ] Offer one-click undo for the last replacement.
- [ ] Never apply data until the entire preset has passed validation.
- [ ] Limit imported bar and slot sizes to safe bounds.
- [ ] Avoid invoking game actions while merely reading or importing data.
- [ ] Warn when a preset contains unknown item types or IDs.
- [ ] Make failures non-destructive and leave the existing hotbar intact.
- [ ] Log enough information to reproduce a failed import without logging
      unrelated player data.

## 8. Test and verify

- [ ] Test round trips: live hotbar → JSON → live hotbar.
- [ ] Test round trips with custom mod structures.
- [ ] Test empty bars and partially filled bars.
- [ ] Test five-bar layouts and alternative bar counts.
- [ ] Test `activeSlotIndex: null`.
- [ ] Test unknown string IDs and numeric IDs.
- [ ] Test malformed JSON, missing fields, invalid types, and oversized arrays.
- [ ] Test clipboard permission denial.
- [ ] Test file import and download.
- [ ] Test visible UI refresh after import.
- [ ] Test persistence across world save/reload where applicable.
- [ ] Test behavior when the internal hotbar path is unavailable.
- [ ] Test against at least one updated game bundle before release.

## Suggested implementation order

1. [ ] Extract the current debug behavior into a hotbar adapter.
2. [ ] Define and validate the versioned preset JSON format.
3. [ ] Implement safe export, clipboard copy, clipboard import, and UI refresh.
4. [ ] Add automatic backup and undo.
5. [ ] Add named preset storage.
6. [ ] Add the smallest usable user interface.
7. [ ] Test native, modded, empty, and unknown-item layouts.

## Completion criteria

- [ ] A user can export the current hotbar to JSON.
- [ ] A user can import that JSON and see the hotbar update immediately.
- [ ] Presets preserve native and mod-defined entries.
- [ ] Import failures leave the current hotbar unchanged.
- [ ] The last hotbar state can be restored after an accidental replacement.
- [ ] All unstable engine access is isolated in one adapter.
- [ ] Compatibility checks detect when the internal hotbar path or UI refresh
      hooks change after a game update.
