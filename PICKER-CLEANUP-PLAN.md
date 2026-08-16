# Picker Cleanup Plan

Refactor the Test Blocks Source picker to match the native filter UI more closely while keeping reusable components inside the mod for now.

## 1. Define the reusable UI boundary

- [ ] Keep the implementation inside `mods/test-blocks/src/`.
- [ ] Create a mod-local `ui/picker/` directory.
- [ ] Keep reusable components independent of Source IDs, structure data, and mod storage.
- [ ] Define shared picker types for elements, selections, tabs, modes, and picker state.

Suggested layout:

```text
mods/test-blocks/src/
  entry.tsx
  ui/
    picker/
      PickerModal.tsx
      PickerHeader.tsx
      CompactPicker.tsx
      ElementGrid.tsx
      ElementRow.tsx
      ElementSwatch.tsx
      MatterHeading.tsx
      MatterTabs.tsx
      SearchInput.tsx
      ToggleSwitch.tsx
      ModeToggle.tsx
      pickerState.ts
      pickerTypes.ts
```

## 2. Extract reusable visual primitives

- [ ] Extract a `ToggleSwitch` matching the native `$S` component.
  - [ ] Support checked and unchecked states.
  - [ ] Support the native subtle styling.
  - [ ] Match the 40×22px dimensions, thumb position, colors, and transition.
  - [ ] Support disabled state if needed later.
- [ ] Extract `ElementSwatch`.
  - [ ] Convert `metaColor` consistently.
  - [ ] Add the native glow shadow.
  - [ ] Provide a fallback color for missing metadata.
- [ ] Extract `ElementRow` based on native `VE`.
  - [ ] Support selected state.
  - [ ] Show the native checkmark for selected elements.
  - [ ] Support optional multi-select checkbox mode.
  - [ ] Match the native hover, border, padding, and background styles.
  - [ ] Add the native hover sound.
- [ ] Extract `MatterHeading` based on native `GE`.
- [ ] Extract `SearchInput`.
  - [ ] Match the native input styles.
  - [ ] Enforce the 64-character limit.
  - [ ] Add the native clear button.
- [ ] Extract `ModeToggle` for allow/block filter modes.
- [ ] Extract `PickerButton` or an equivalent shared button-style helper.
  - [ ] Centralize native border, hover, focus, and controller-focused styles.

## 3. Build a reusable element catalog

- [ ] Move element discovery and normalization out of the JSX component.
- [ ] Read both native and mod-registered elements.
- [ ] Resolve element IDs, numeric types, names, matter types, and colors.
- [ ] Respect hidden elements and `showInFilterPicker` where appropriate.
- [ ] Support discovered-only filtering as an optional policy.
- [ ] Support consumer-provided blacklist and allowlist callbacks.
- [ ] Subscribe to element registry and i18n changes so labels refresh correctly.
- [ ] Expose normalized data rather than rendering from the catalog layer.

Suggested interface:

```ts
type ElementCatalog = {
  all: ElementEntry[];
  byMatter: Map<MatterTab, ElementEntry[]>;
  getById(id: string): ElementEntry | null;
  getByType(type: number): ElementEntry | null;
};
```

## 4. Separate picker state from rendering

- [ ] Create a reusable picker state model.
- [ ] Support compact and expanded modes.
- [ ] Support single selection.
- [ ] Support multi-selection for future Filter Mk2-style use.
- [ ] Support search query state.
- [ ] Support matter-tab state.
- [ ] Support optional allow/block mode.
- [ ] Support optional overlay-toggle state.
- [ ] Support promise-based selection completion.
- [ ] Define consistent cancellation behavior.
- [ ] Define Escape/back behavior independently of the Source mod.

## 5. Recreate the native modal structure

- [ ] Extract a reusable `PickerModal` based on native `KE` and `rF`.
- [ ] Add the native 100ms entrance animation.
- [ ] Match the native 640px width and 600px maximum height.
- [ ] Match the native header padding, border, title, and minimize button.
- [ ] Support optional header controls such as the overlay switch.
- [ ] Use the native single-row toolbar layout.
- [ ] Include matter tabs and search in the toolbar.
- [ ] Support grouped matter sections with native indentation.
- [ ] Support the four-column element grid.
- [ ] Add the native empty-results message.
- [ ] Add an optional footer region.
- [ ] Keep Source-specific labels and behavior outside the reusable modal.

## 6. Add a placement and render-host adapter

- [ ] Define an adapter for rendering the picker through a UI host.
- [ ] Prefer the native hotbar overlay host when available.
- [ ] Keep the current injected overlay as a fallback.
- [ ] Use fixed positioning only when no suitable host exists.
- [ ] Remove hardcoded positioning and z-index values from the picker itself.
- [ ] Ensure mount and unmount behavior is handled by the host adapter.

## 7. Add a Source-specific adapter

- [ ] Keep Source selection logic in a thin adapter.
- [ ] Determine the current Source element selection.
- [ ] Open the reusable picker in single-select mode.
- [ ] Persist the selected element through structure data and local storage.
- [ ] Resolve cancellation and selection correctly.
- [ ] Apply the selected element to the Source structure.
- [ ] Show the compact picker only while the Source action is selected.
- [ ] Remove the picker when the player switches away from Source.
- [ ] Ensure the reusable picker never directly references Source IDs or structure APIs.

## 8. Match controller and keyboard behavior

- [ ] Extract the focus-scope setup into reusable picker navigation helpers.
- [ ] Define consistent IDs and directional-neighbor generation.
- [ ] Support search → tabs → grid navigation.
- [ ] Make Back/Escape minimize expanded mode.
- [ ] Make Back from compact mode exit the picker.
- [ ] Preserve controller-focused styling.
- [ ] Ensure mouse and controller activation share the same selection path.
- [ ] Prevent accidental focus loss when clicking checkbox or utility controls.

## 9. Verify visual and runtime parity

- [ ] Compare modal width, padding, opacity, borders, and spacing against the native filter UI.
- [ ] Compare switch dimensions, colors, thumb position, and animation.
- [ ] Compare element-row hover and selected states.
- [ ] Compare color swatch glow and fallback colors.
- [ ] Compare search layout and clear-button behavior.
- [ ] Compare matter grouping and tab behavior.
- [ ] Compare empty-result rendering.
- [ ] Compare controller focus behavior.
- [ ] Compare hover and click sounds.
- [ ] Compare modal placement and entrance animation.
- [ ] Verify existing Source selections remain persisted.
- [ ] Verify a new Source opens correctly.
- [ ] Verify cancel leaves a Source inert.
- [ ] Verify selecting an element closes the picker.
- [ ] Verify switching away from Source removes the compact picker.
- [ ] Verify the Source picker does not modify native filter settings.

## 10. Consider promotion to `shared/`

- [ ] Wait until a second mod needs the picker.
- [ ] Identify which modules are genuinely mod-agnostic.
- [ ] Move only generic components and types into `shared/`.
- [ ] Keep Sandustry API adapters outside `shared/`.
- [ ] Keep mod-specific filtering and persistence outside `shared/`.
- [ ] Update build and type-check coverage after promotion.
