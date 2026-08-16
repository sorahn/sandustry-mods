# Sandustry-inspired browser UI kit plan

## Goal

Create a standalone, minimal-dependency JavaScript/CSS UI kit for building
whole web applications with a Sandustry-inspired visual language. The game filter
overlay and hotbar are reference examples, not the scope boundary. The kit
should provide application layout, navigation, content surfaces, forms, data
views, feedback, overlays, responsive behavior, and accessibility.

The visual foundation comes from the checked-in game references: dark
translucent panels, slate borders, asymmetric corner treatment, yellow
focus/selection, compact typography, and pixel-art-friendly imagery.

## Constraints and findings

- `resources/filter-html.html` is the clearest visual reference. It shows
  `#ffe700` as the primary accent, black overlays around 75–90% opacity,
  slate-700/800 borders, 4px image corners, and 64px hotbar slots.
- The minified bundle is useful for names and behavioral clues, but does not
  expose a stable public UI API for third-party components.
- Tailwind will be the styling foundation, using a pinned version and a small
  kit-owned configuration/preset rather than depending on the game's generated
  CSS or internal build setup.
- Keep runtime dependencies minimal. Build-time dependencies may include
  Tailwind, a CSS processor, TypeScript, and a small bundler if they improve
  distribution and type safety.
- The component API should remain framework-agnostic. Web Components are the
  leading option, with plain Tailwind classes and composable templates as a
  fallback for consumers who do not want custom elements.
- Components should use light DOM where practical, expose normal DOM events,
  and support direct loading from a static HTML page.
- Dependency decisions should be recorded explicitly, including why a utility
  is needed, whether it ships to runtime, and what browser/platform support it
  adds.

## Repository placement

Keep the kit and site adjacent without mixing them into the mod pipeline:

```text
packages/
  sandustry-ui/          # reusable browser UI kit and its playground
apps/
  blueprint-site/        # static blueprint viewer/converter site
mods/                    # Sandustry game mods; unchanged
resources/               # reverse-engineering material and raw references
```

`packages/sandustry-ui` should own the public component API, Tailwind preset,
tokens, source styles, component tests, and sanitized DOM reference fixtures.
`apps/blueprint-site` should consume the kit as a workspace dependency and own
site composition, blueprint-specific screens, catalog assets, and deployment.
Do not put the UI kit in `shared/`: that directory is currently bundled into
game mods and should not inherit browser/build dependencies.

If the blueprint codec or catalog loader becomes reusable outside the site,
add `packages/blueprint-core` later rather than placing site logic in the UI
kit.

## Hard separation from mods

The browser workspace is a neighboring project, not a new mod target:

- `packages/sandustry-ui` and `apps/blueprint-site` must not import from
  `mods/`, `types/sandustry.d.ts`, or `shared/`.
- Browser packages must not depend on `sandkit`, mod manifests, mod entrypoint
  conventions, game APIs, or game-installed assets at runtime.
- Mod source must not import the browser kit. Any future in-game UI remains a
  separate mod implementation using the game runtime.
- Give the browser workspace its own package manifests, TypeScript config,
  Tailwind config, and build/test configuration rather than extending the mod
  build rules.
- Reference captures and extracted research may inform both sides, but should
  be treated as data/documentation, never as executable cross-project code.
- Add boundary checks or package-manager workspace rules so accidental imports
  across the mod/browser boundary fail early.

## Reference-capture workflow

As more game DOM examples become available, each should be added as a small
reference fixture rather than copied directly into the kit:

- Record the screen/context, interaction state, viewport, and whether the
  example is idle, hovered, focused, selected, disabled, loading, or in error.
- Preserve a sanitized DOM snapshot and any relevant computed-style values;
  remove machine-specific paths, account data, and unrelated game markup.
- Note reusable patterns, state transitions, keyboard behavior, and assets
  separately from one-off game-specific details.
- Map the example to an existing primitive, a composite component, or a new
  proposed component. Keep an evidence note when the implementation is an
  approximation rather than directly observed.
- Add the fixture to the playground as a comparison case so visual tuning is
  regression-friendly.

High-value next examples would be the main game shell, build/category panels,
tooltips, confirmation dialogs, settings controls, notifications, inventories,
menus, and any loading/error states.

## Proposed kit surface

### Foundations

- Design tokens for color roles, surfaces, borders, type, spacing, elevation,
  motion, focus, density, and light/dark variants.
- Layout primitives: app shell, top bar, sidebar, split pane, stack, cluster,
  grid, scroll region, resizable panel, and responsive breakpoints.
- Typography, icon/image treatment, pixel-art rendering helpers, dividers,
  badges, status indicators, and keyboard focus styling.

### Navigation and application chrome

- Sidebar navigation, breadcrumbs, tabs, segmented controls, command palette,
  pagination, stepper, and contextual action bars.
- User/session menu, workspace/project switcher, notifications tray, and
  collapsible/minimizable panels.

### Content and data

- Cards, panels, empty states, skeleton/loading states, lists, trees, tables,
  sortable columns, filters, tags, timelines, stat blocks, and inspector
  panels.
- Optional game-flavored extensions such as element swatches, hotbar slots,
  inventory grids, and build/item cards. These should not leak into the core
  application primitives.

### Forms and feedback

- Text inputs, search, selects, comboboxes, checkboxes, radios, toggles,
  sliders, range controls, file/drop zones, validation messages, and inline
  help.
- Dialogs, drawers, popovers, tooltips, toasts, banners, progress, alerts,
  confirmation flows, and error surfaces.

### Interaction and accessibility

- Keyboard navigation and roving focus where appropriate, Escape/back behavior,
  focus trapping for dialogs, reduced motion, screen-reader labels, contrast,
  and usable narrow viewport behavior.

## Implementation phases

### Phase 1 — visual system and architecture

- [ ] Extract a token sheet from the reference: colors, opacity levels,
  borders, radii, shadows, spacing, type scale, and pixel-art rules.
- [ ] Choose the browser support baseline and module format.
- [ ] Choose the minimal dependency set and pin Tailwind/tool versions;
  distinguish source/build dependencies from shipped runtime code.
- [ ] Define a kit-owned Tailwind preset/theme for tokens, component variants,
  responsive states, and game-inspired utilities.
- [ ] Define naming, slots, CSS parts/custom properties, event conventions,
  controlled/uncontrolled state, and form participation rules.
- [ ] Define component layering: tokens/utilities, layout primitives, accessible
  controls, composite widgets, and optional domain extensions.
- [ ] Establish a reference-fixture format and an evidence matrix linking
  captured game examples to proposed kit components.

### Phase 2 — core application kit

- [ ] Build app shell, navigation, layout, surface, typography, and feedback
  primitives first.
- [ ] Add common controls and form behavior, including validation and keyboard
  interaction.
- [ ] Add data display primitives and responsive states.
- [ ] Build a self-contained playground demonstrating a complete dashboard,
  settings form, table/list view, notification flow, and modal flow.
- [ ] Include the filter overlay and hotbar as one showcase page, not as the
  library's organizing concept.
- [ ] Compare representative surfaces against the reference HTML and tune
  spacing, typography, focus, and density.
- [ ] Add each newly supplied DOM example to the fixture/evidence matrix before
  using it to expand or revise the component inventory.

### Phase 3 — packaging and verification

- [ ] Verify Chromium, Firefox, and Safari at desktop and narrow viewport sizes.
- [ ] Check keyboard navigation, visible focus, screen-reader names, contrast,
  and reduced motion.
- [ ] Document usage, events, slots, theming, composition patterns, and known
  fidelity limits.
- [ ] Add a minimal package/build step only after the browser API is stable;
  keep source usable directly from a static HTML page where practical.
- [ ] Verify generated CSS is tree-shakeable and does not accidentally import
  the game's full stylesheet or unrelated utility classes.

## Suggested implementation order

1. Tokens and layout/application chrome.
2. Accessible controls and form primitives.
3. Content/data views and feedback surfaces.
4. Playground showing a complete app.
5. Game-flavored extensions such as filters and hotbars.
6. Package/build integration only if consumers need it.

## Completion criteria

The standalone browser kit can be installed with a small, documented
dependency set and loaded with generated CSS plus an ES module,
supports building a complete responsive web application, includes a coherent
accessible component inventory, has no runtime dependency on the game or this
mod repository, and documents the gap between inferred styling and verified
game behavior.
