# Game UI component catalog

This is a working catalog of UI components found in the checked-in Sandustry
references. It is intended to guide `packages/sandustry-ui`, not to reproduce
the game's private React implementation.

## Evidence levels

- **DOM** — directly visible in `resources/filter-html.html`.
- **Bundle** — component names, labels, Tailwind class strings, or interaction
  hooks found in `resources/bundle.js`.
- **Surface map** — API/documentation evidence in
  `resources/sandkit-surface-map/` and the repository's exploration notes.
- **Inferred** — a reusable component hypothesis based on the evidence above;
  it needs a future DOM capture before being treated as visually authoritative.

The bundle is minified and contains both game UI and renderer/debug tooling.
Where there is no captured DOM, this catalog records the likely purpose rather
than claiming an exact visual implementation.

## Visual foundation

| Component/pattern      | Evidence    | What it appears to be for                                                                                               |
| ---------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| `ui-box` surface       | DOM, Bundle | Shared dark translucent surface with slate border and small radius. The reference uses black at roughly 75–90% opacity. |
| `card-2` surface       | Bundle      | A heavier modal/card variant with padding, shadow, and an opaque black surface.                                         |
| Asymmetric item button | DOM, Bundle | Compact game button using `rounded-tr-lg rounded-bl-lg`; likely the standard action/control shape.                      |
| Compact label          | DOM, Bundle | Small muted monospace label used in panel headers and metadata.                                                         |
| Accent state           | DOM, Bundle | Yellow `#ffe700` for selected, focused, active, and attention states.                                                   |
| Slate border           | DOM, Bundle | Low-contrast `slate-700/800` separators and control borders.                                                            |
| Black scrim            | Bundle      | Full-screen or modal backdrop, usually black with high opacity.                                                         |
| Pixel-art image        | DOM         | Pixelated image rendering, fixed source dimensions, optional scale/offset, and drop shadow.                             |
| Status color           | Bundle      | Green success, cyan information, amber/yellow attention, orange warning, red error, pink/purple secondary data.         |
| Focus ring             | DOM, Bundle | Yellow ring/inset border or high-contrast border around controller/mouse focus.                                         |

## Application chrome and navigation

| Component                  | Evidence                 | Likely purpose                                                                                   |
| -------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------ |
| Main menu shell            | Bundle                   | Top-level application/menu surface surrounding save, settings, workshop, and start-game actions. |
| Top navigation/header      | Bundle                   | Global menu and status area; exact DOM still needed.                                             |
| Sidebar/index navigation   | Bundle, Surface map site | Grouped navigation for tool/reference pages; likely useful for the blueprint site.               |
| Tab bar                    | Bundle, settings guide   | Settings are grouped into `general`, `video`, `audio`, `controls`, and conditional `mods` tabs.  |
| Selected tab               | Bundle                   | Tab state likely uses active text/border/accent and `aria-selected`.                             |
| Category selector          | Bundle                   | Build/inventory category navigation, including `By Category` and structure categories.           |
| Breadcrumb/section heading | Inferred                 | Needed for nested blueprint/catalog/detail pages; no direct game DOM capture yet.                |
| Build mode selector        | Bundle                   | Chooses `single`, directional, rectangle, launcher rectangle, or line building modes.            |
| Shortcut helper            | Bundle                   | Small key/action hint associated with a selected tool or build mode.                             |
| Contextual action bar      | Bundle                   | Actions that appear around an active building, selection, blueprint, or tool.                    |
| Pause/menu overlay         | Inferred                 | Likely full-screen menu surface; requires capture.                                               |
| Workspace/project switcher | Inferred                 | A useful browser-kit extension, not yet evidenced in the game.                                   |

## Controls and forms

| Component                   | Evidence               | Likely purpose                                                                                   |
| --------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| Primary action button       | DOM, Bundle            | Confirm, open, build, save, or select action. Compact padding and asymmetric corners are common. |
| Secondary/quiet button      | DOM, Bundle            | Low-emphasis action with slate border and muted text.                                            |
| Disabled button             | DOM, Bundle            | Same control with reduced opacity, darker surface, and `cursor-not-allowed`.                     |
| Toggle switch               | DOM, Bundle            | Boolean setting. Reference is 40×22px with a circular thumb and yellow or slate track.           |
| Segmented control           | DOM                    | Allow/block and solid/liquid/gas choices in the filter panel.                                    |
| Text input                  | DOM, Bundle            | Search, names, debug values, and blueprint input. Dark field, slate border, compact type.        |
| Search field                | DOM, Bundle            | Element/filter search and likely blueprint/catalog search.                                       |
| Select/dropdown             | Bundle, Inferred       | Settings choices and build/category selection; needs DOM capture.                                |
| Checkbox/radio              | Bundle, Inferred       | Settings, debug flags, filter modes, and optional display controls.                              |
| Slider/range control        | Bundle                 | Numeric settings and progress-like controls; exact shape needs capture.                          |
| File picker/drop zone       | Bundle                 | Blueprint import and map/file workflows.                                                         |
| Inline validation message   | Bundle                 | Invalid load/decode/configuration feedback.                                                      |
| Form help/description       | Bundle, settings guide | `descriptionKey` text below mod settings fields.                                                 |
| Confirm/cancel pair         | DOM, Bundle            | Dialog footers and save/delete flows.                                                            |
| Increment/decrement stepper | DOM                    | Narrow vertical up/down control beside hotbar/action values.                                     |
| Keycap/action hint          | DOM, Bundle            | Number keys, controller actions, or keyboard shortcuts rendered as compact chips.                |

## Panels, overlays, and popovers

| Component                       | Evidence            | Likely purpose                                                                                           |
| ------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| Standard panel                  | DOM, Bundle         | Flexible content container with header/body/footer regions.                                              |
| Modal dialog                    | Bundle              | Centered dialog with black scrim, title, body, and action footer.                                        |
| Destructive confirmation dialog | Bundle              | Delete blueprint and other irreversible actions; explicit confirm/cancel.                                |
| Full-screen diagnostic modal    | Bundle              | Debug panel uses a fixed `inset-0` backdrop and large scrollable content area.                           |
| Drawer/popout                   | Inferred            | Side or anchored detail surface; game has several absolute popover patterns but no confirmed drawer DOM. |
| Anchored popover                | Bundle              | Absolute black panel with border, shadow, and high z-index near a control.                               |
| Tooltip                         | Bundle, Surface map | Hover/interaction detail for structures, elements, shortcuts, and controls.                              |
| Structure tooltip               | Bundle              | Specialized tooltip with filter/building/structure information.                                          |
| Element tooltip                 | Bundle, Inferred    | Element name, description, properties, and interactions.                                                 |
| Toast notification              | Bundle, Surface map | Short-lived success/error/info message through the UI toast surface.                                     |
| Notification stack              | Bundle              | Multiple notifications with delay/dismiss state.                                                         |
| Banner/attention notice         | Bundle              | Persistent or semi-persistent warning such as element limits or upload status.                           |
| Loading overlay                 | Bundle              | Full-screen or panel-level loading state with text, steps, and cancellation.                             |
| Loading spinner                 | Bundle              | `menuSpinner` and `shaderSpin` indicate animated progress indicators.                                    |
| Error surface                   | Bundle              | Red bordered error card with message and recovery action.                                                |
| Empty state                     | Bundle, Inferred    | No blueprint, no structures, empty inventory, or no search results.                                      |

## Build, inventory, and game-tool components

| Component                     | Evidence         | Likely purpose                                                                                                      |
| ----------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| Hotbar                        | DOM, Bundle      | Horizontal action/build slot strip, typically ten slots numbered 1–0.                                               |
| Hotbar slot                   | DOM              | 64×64 slot with radial dark background, icon, key label, selection ring, and active brightness.                     |
| Hotbar index stepper          | DOM              | Narrow up/down control to change the active hotbar row/page.                                                        |
| Hotbar overlay                | Bundle           | Auxiliary tool actions adjacent to the hotbar, including marquee/demolisher tools.                                  |
| Inventory grid                | Bundle           | Collection of available structures/items/tools, likely categorized.                                                 |
| Inventory item                | Bundle           | Individual icon/count/selection cell in the inventory.                                                              |
| Building tile                 | Bundle           | Structure choice with icon, name, availability, and placement mode.                                                 |
| Building selector             | Bundle           | The control that chooses the currently held structure/tool.                                                         |
| Build preview                 | Bundle           | Ghost/shape visualization during placement, including blocked state.                                                |
| Placement status              | Bundle           | Feedback for blocked, invalid, limited, or successful placement.                                                    |
| Build mode toolbar            | Bundle           | Mode-specific actions and shortcut hints for single/line/rectangle placement.                                       |
| Rotation control              | Bundle           | Direction/rotation action for directional structures and sprites.                                                   |
| Demolisher tool               | DOM, Bundle      | Hotbar tool for removing structures.                                                                                |
| Marquee tool                  | DOM, Bundle      | Hotbar tool for moving/copying structures.                                                                          |
| Filter wall panel             | Bundle, DOM      | Configure allow/block mode, matter type, element filter, and selected result.                                       |
| Filter element picker         | DOM              | Searchable four-column element grid with color swatches and selected state.                                         |
| Filter mode tabs              | DOM              | Allow/block and solid/liquid/gas controls.                                                                          |
| Structure configuration panel | Bundle, Inferred | Native panels exist for some structures, including Filter and Sound Box; exact API is hardcoded and needs captures. |
| Machine status card           | Bundle, Inferred | Structure operation, capacity, recipe, energy, or signal state.                                                     |
| Progress bar                  | Bundle           | Horizontal fill bar for loading, crafting, production, or upload progress.                                          |
| Capacity meter                | Bundle           | Current/max resource or element capacity.                                                                           |
| Resource counter              | Bundle           | Compact numeric amount, abbreviations, and resource icon.                                                           |
| Signal/connection indicator   | Bundle, Inferred | State of signal links, wires, or connected machines.                                                                |

## Blueprint, map, and workshop components

| Component                     | Evidence                      | Likely purpose                                                                     |
| ----------------------------- | ----------------------------- | ---------------------------------------------------------------------------------- |
| Blueprint browser             | Bundle                        | List or panel for saved blueprints.                                                |
| Blueprint name field          | Bundle                        | Naming a blueprint before save/export.                                             |
| Blueprint save dialog         | Bundle                        | Name, confirm, cancel, and save-success feedback.                                  |
| Blueprint delete confirmation | Bundle                        | Explicit irreversible delete flow.                                                 |
| Blueprint import action       | Bundle                        | Paste/load a blueprint string or file.                                             |
| Blueprint export action       | Bundle                        | Export one or all blueprints.                                                      |
| Blueprint history selector    | Bundle                        | Choose a prior saved/loaded blueprint.                                             |
| Blueprint detail/inspector    | Inferred                      | Structure count, name, metadata, and actions.                                      |
| Blueprint canvas              | Inferred                      | Pan/zoom structure layout viewer; the planned site needs a browser-native version. |
| Structure inspector           | Bundle, Inferred              | Details for a selected structure, filters, data, and unknown IDs.                  |
| Catalog picker                | Inferred                      | Select native/mod catalog or content source for rendering.                         |
| Unknown-content fallback card | Inferred                      | Preserve and explain unknown numeric/string structure IDs.                         |
| Workshop upload panel         | Bundle                        | Upload progress, name/description, cancellation, and error handling.               |
| Workshop result/status        | Bundle                        | Success/failure state after upload or download.                                    |
| Map import/export panel       | Bundle, custom maps reference | Map file selection, preview, metadata, and validation.                             |
| Map preview                   | Bundle, custom maps reference | Canvas/image preview with dimensions and overlays.                                 |

## Debug, inspection, and developer tools

| Component                        | Evidence               | Likely purpose                                                                                          |
| -------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| Debug panel                      | Bundle, debug-info mod | Fixed modal for developer controls and inspection.                                                      |
| Debug category tabs              | Bundle                 | Switch between element, soil, structure, render, and other debug categories.                            |
| Debug controls                   | Bundle, debug-info mod | Toggle draw chunks, show filters, show authorization zones, and structure rendering.                    |
| Element inspector                | Bundle                 | Selected element details including type, position, velocity, duration, linked element, and data fields. |
| Structure inspector              | Bundle                 | Selected structure position/type/filter/data and raw values.                                            |
| Canvas selection overlay         | Bundle                 | Click/drag selection feedback on lights, structures, or debug entities.                                 |
| Coordinate readout               | Bundle                 | Monospace x/y and position values.                                                                      |
| Key/value inspector row          | Bundle                 | Repeated label/value layout with typed color states.                                                    |
| Expandable detail group          | Bundle                 | Collapsible sections for nested element/structure/debug data.                                           |
| Raw JSON/text block              | Bundle                 | Break-word monospace block for arbitrary data and unknown fields.                                       |
| Pagination/previous-next control | Bundle                 | Navigate selected items or inspector records.                                                           |
| Runtime error panel              | Bundle                 | Display decoder/runtime errors with retry or dismiss.                                                   |

## Tutorial, mission, and progression surfaces

| Component                      | Evidence | Likely purpose                                                         |
| ------------------------------ | -------- | ---------------------------------------------------------------------- |
| Tutorial prompt                | Bundle   | Centered instruction with explanatory copy and confirm action.         |
| Tutorial confirmation button   | Bundle   | Large affirmative action with highlighted treatment.                   |
| Mission confirmation dialog    | Bundle   | `CONFIRM MISSION` flow before starting or completing a mission.        |
| Mission objective/status panel | Inferred | Objective text, progress, rewards, or completion state.                |
| Tech/progression card          | Bundle   | Structure/technology unlock information and requirements.              |
| Unlock/availability badge      | Bundle   | Indicates whether a building or feature is unlocked/available.         |
| Resource requirement row       | Bundle   | Amount, icon, satisfied/unsatisfied color, and missing-resource state. |
| Achievement/reward toast       | Inferred | Short-lived progression feedback; capture needed.                      |

## Loading and system states

| Component                    | Evidence | Likely purpose                                                           |
| ---------------------------- | -------- | ------------------------------------------------------------------------ |
| Boot/loading screen          | Bundle   | Animated loading container, letter animation, spinner, and loading copy. |
| Loading step list            | Bundle   | Current step plus substeps for long startup/import operations.           |
| Cancelable loading task      | Bundle   | Loading overlay with a cancel button and progress percentage.            |
| Download progress            | Bundle   | Percentage/status during asset or workshop download.                     |
| Chunk-load error             | Bundle   | Recovery surface for failed lazy-loaded UI code.                         |
| Save/load error              | Bundle   | Invalid, missing, or incompatible blueprint/save feedback.               |
| Resource limit alert         | Bundle   | `Element Limit Reached` and slab exhaustion states.                      |
| Connection/link cancellation | Bundle   | Status after canceling a signal/link operation.                          |

## Likely reusable React kit mapping

The first version of `packages/sandustry-ui` should not expose every game name
as a component. A smaller reusable vocabulary can cover most of the observed
surface:

```text
AppShell
TopBar / Sidebar / NavigationTabs
Panel / Card / Section / Inspector
Button / IconButton / ButtonGroup / SegmentedControl
Input / SearchInput / Select / Checkbox / Radio / Switch / Slider
Badge / Chip / StatusDot / Keycap / ResourceAmount
Dialog / Drawer / Popover / Tooltip / Toast / Alert
ProgressBar / Meter / Spinner / Skeleton / EmptyState / ErrorState
List / Tree / Table / DataGrid / Pagination
Tabs / Breadcrumbs / Stepper / CommandPalette
Hotbar / HotbarSlot / InventoryGrid / ItemCard
ElementPicker / FilterPanel / BuildModeToolbar
BlueprintBrowser / BlueprintInspector / BlueprintCanvas
DebugInspector / KeyValueList / CollapsibleGroup
```

The game-specific controls should be layered on top of the general controls.
For example, `ElementPicker` can compose `SearchInput`, `SegmentedControl`,
`ItemCard`, `StatusDot`, and `EmptyState` rather than introducing a separate
styling system.

## Reference gaps to fill with future DOM captures

The highest-value captures would be:

1. Main menu and in-world application shell.
2. Settings tabs and each control type.
3. Build/inventory panel in open, selected, unavailable, and search states.
4. Structure tooltip and native Filter/Sound Box configuration panels.
5. Blueprint browser, save dialog, import/export, and workshop upload states.
6. Notifications, errors, loading, and cancelable progress states.
7. Debug inspector open, collapsed, selected, and empty states.
8. Controller-focused states and directional navigation behavior.

## Sources inspected

- `resources/filter-html.html` — direct DOM snapshot of filter and hotbar UI.
- `resources/bundle.js` — minified production bundle with UI strings, Tailwind
  class names, overlay names, and interaction identifiers.
- `resources/sandustry-mod-settings-guide.md` — settings tab and schema
  behavior inferred from the bundle.
- `resources/sandkit-surface-map/` — exposed UI/overlay/toast/tooltip surface
  and limitations.
- `resources/v1/debug-info/` — debug settings and developer-tool context.
- `resources/custom-maps.md` — map-related manifest and file concepts.

This catalog should be updated when new DOM examples arrive. New observations
should be labeled with their source and interaction state before they influence
the shared component API.
