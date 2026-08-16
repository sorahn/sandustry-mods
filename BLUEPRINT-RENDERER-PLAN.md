# Universal Blueprint Renderer Plan

This plan covers a static web site that can be deployed to GitHub Pages and can
open and display any supported Sandustry blueprint, rather than only a known
example or a fixed list of structures.

The renderer should remain useful when a blueprint contains structures from a
mod, a newer game version, or a catalog that has not yet been installed. Known
content should be rendered accurately; unknown content should be preserved and
shown with an informative fallback.

The page layout and visual design are intentionally undecided. This plan
specifies behavior and boundaries, not the final navigation, panel arrangement,
branding, or visual style.

## 1. Define the supported blueprint contract

- [ ] Document the currently observed `SAND:BP:v2:` format.
- [ ] Document the internal binary version values currently accepted by the
      game.
- [ ] Document blueprint names, type dictionaries, structure records, filters,
      structure data, and signal links.
- [ ] Define behavior for malformed input, truncated data, invalid base64, and
      unsupported format versions.
- [ ] Define a normalized in-memory blueprint model independent of the wire
      format.
- [ ] Preserve unknown fields and records so importing and exporting does not
      discard information.
- [ ] Decide whether legacy `SAND:BACKUP:v1:` strings are supported in the
      first release or reported as unsupported.

## 2. Implement the generic blueprint codec

- [ ] Implement a standalone TypeScript decoder for `SAND:BP:v2:` strings.
- [ ] Implement the matching encoder for normalized blueprint data.
- [ ] Decode both numeric native structure IDs and string mod structure IDs.
- [ ] Decode filter mode, density, element type, and arbitrary filter JSON.
- [ ] Decode v4 signal links and retain them in the normalized model.
- [ ] Add round-trip tests using known blueprint strings.
- [ ] Add fixtures for empty blueprints, duplicate structures, custom string
      IDs, filters, structure data, and signal links.
- [ ] Verify that unknown structure IDs survive decode and re-encode unchanged.

The codec should power both the renderer and public conversion tools. The
browser-facing tools must not use a separate or simplified format-specific
implementation.

## 3. Add public encode/decode tools

- [ ] Add a `blueprint → JSON` conversion workflow.
- [ ] Add a `JSON → blueprint` conversion workflow.
- [ ] Use the same normalized blueprint model for decoding, rendering, and
      re-encoding.
- [ ] Provide a readable JSON representation with stable field names and clear
      numeric-versus-string type values.
- [ ] Include blueprint name, format version, structures, filters, structure
      data, and signal links in the JSON output.
- [ ] Preserve unknown structure IDs, unknown fields, and custom data where the
      format permits it.
- [ ] Validate user-supplied JSON before attempting to encode it.
- [ ] Report the exact field and reason for invalid JSON or unsupported values.
- [ ] Provide copy-to-clipboard actions for both JSON and blueprint strings.
- [ ] Provide download actions for JSON and blueprint text files where useful.
- [ ] Allow users to paste a blueprint string directly into the decoder.
- [ ] Allow users to paste or load JSON directly into the encoder.
- [ ] Add a compact machine-readable JSON option in addition to readable
      formatted JSON if both are useful.
- [ ] Make clear whether the encoder emits the canonical `SAND:BP:v2:` format
      or another explicitly selected format.
- [ ] Add a warning before encoding when information cannot be represented in
      the selected blueprint version.
- [ ] Keep conversion local in the browser; do not send blueprint or JSON data
      to a server.
- [ ] Add example input for both directions so the tools are understandable
      before a user has a blueprint ready.

## 4. Create the universal content registry

- [ ] Define a registry schema for structures, elements, rotations, shapes,
      footprints, display names, and render assets.
- [ ] Support numeric native IDs and string mod IDs in the same registry.
- [ ] Allow multiple catalog versions to coexist, keyed by game or catalog
      version where necessary.
- [ ] Add explicit metadata for unknown-content fallbacks.
- [ ] Define catalog precedence when a mod overrides or extends a native entry.
- [ ] Keep rendering metadata separate from blueprint codec logic.
- [ ] Make catalog loading asynchronous so the web app can load only the
      catalogs it needs.

## 5. Extract the native game catalog

- [ ] Extract native structure IDs and names from the game bundle.
- [ ] Extract structure image names, shapes, footprints, rotations, and
      variants.
- [ ] Extract native element IDs/types, names, colors, and matter categories.
- [ ] Extract English localization strings first.
- [ ] Record the game/build version associated with each extracted catalog.
- [ ] Build a repeatable extraction script rather than manually copying bundle
      data.
- [ ] Emit catalog files that can be checked into the renderer project or
      generated during a local build.
- [ ] Add a validation report for missing IDs, duplicate IDs, malformed shapes,
      and image references.

## 6. Extract and normalize native visual assets

- [ ] Identify the relevant sprite and texture files inside `app.asar`.
- [ ] Extract structure sprites, overlays, filter visuals, and element swatches
      needed by the renderer.
- [ ] Preserve the original asset names used by the structure catalog.
- [ ] Convert assets only when necessary for browser delivery.
- [ ] Generate an asset manifest containing dimensions, paths, and hashes.
- [ ] Add a placeholder or procedural fallback when an asset is missing.
- [ ] Keep extraction separate from the browser bundle so the web app does not
      ship unrelated game resources.
- [ ] Review redistribution and licensing constraints before publishing
      extracted game assets.

For the deployed site, all permitted catalogs and assets must be prepared at
build time. The browser must not depend on a local Sandustry installation,
Electron APIs, a server-side extractor, or a runtime filesystem.

## 7. Support mod content without hardcoding individual mods

- [ ] Define a small mod catalog format containing structure IDs, names, shapes,
      rotations, render assets, and element metadata.
- [ ] Support catalogs loaded from local files, URLs, or bundled packages.
- [ ] Add a catalog format version and compatibility metadata.
- [ ] Provide a way for a mod to declare its manifest ID and structure namespace.
- [ ] Add catalog support for the repository's own mods as a reference
      implementation.
- [ ] Ensure a missing mod catalog does not prevent the rest of a blueprint from
      rendering.
- [ ] Display unknown string IDs and stored structure data in the fallback UI.
- [ ] Detect catalog conflicts and report which catalog supplied the winning
      definition.

## 8. Build the renderer

- [ ] Choose a rendering surface, preferably SVG or canvas with a consistent
      world-to-screen coordinate model.
- [ ] Render the blueprint footprint and calculate bounds automatically.
- [ ] Render known structures using catalog shapes and sprites.
- [ ] Render rotations and directional variants correctly.
- [ ] Render unknown structures as labeled fallback tiles with their IDs.
- [ ] Render filters, allowed/blocked state, density, and element references.
- [ ] Render structure-specific data in an inspectable details panel.
- [ ] Render signal links when present.
- [ ] Add pan, zoom, fit-to-content, and reset-view controls.
- [ ] Add optional grid lines, coordinates, structure bounds, and IDs.
- [ ] Add a structure-selection inspector.
- [ ] Make large blueprints render without blocking the browser UI.
- [ ] Add viewport virtualization or layered rendering if large layouts require
      it.

## 9. Handle unknown and future content gracefully

- [ ] Treat unknown numeric IDs as valid records rather than decoder errors.
- [ ] Treat unknown string IDs as valid mod records rather than decoder errors.
- [ ] Show the raw type, position, rotation, filter, and data for unknown items.
- [ ] Warn about unsupported format versions while attempting safe parsing when
      possible.
- [ ] Keep the original decoded record available for export.
- [ ] Avoid silently changing or dropping fields from newer blueprints.
- [ ] Add a catalog refresh path so new game/mod definitions can be added
      without changing the renderer core.

## 10. Add import, export, and sharing workflows

- [ ] Add a text box for pasting blueprint strings.
- [ ] Add drag-and-drop support for text files or saved blueprint files if the
      game format exposes them.
- [ ] Add copy-to-clipboard for the encoded blueprint string.
- [ ] Add JSON export for debugging and integrations.
- [ ] Add an optional rendered PNG/SVG export.
- [ ] Preserve the blueprint name and metadata during export.
- [ ] Show clear errors without replacing the last successfully loaded blueprint.

All of these workflows should run entirely in the browser. Blueprint text and
decoded data should remain local by default; no upload endpoint is required.

## 11. Test against real-world blueprint variants

- [ ] Create a fixture corpus of native-only blueprints.
- [ ] Create fixtures containing mod structure string IDs.
- [ ] Create fixtures containing filters and custom structure data.
- [ ] Create fixtures containing signal links.
- [ ] Create fixtures with unknown numeric and string IDs.
- [ ] Test blueprints from multiple game/catalog versions.
- [ ] Test decoder/encoder round trips byte-for-byte where canonical encoding
      allows it.
- [ ] Test blueprint-to-JSON output against expected normalized fixtures.
- [ ] Test JSON-to-blueprint output and then decode it again to verify semantic
      equivalence.
- [ ] Test invalid JSON types, missing fields, invalid coordinates, bad filters,
      and unsupported versions.
- [ ] Test copy and download actions in the deployed static site.
- [ ] Test visual rendering against screenshots or reference layouts.
- [ ] Test very large blueprints for memory use and interaction performance.
- [ ] Test malformed and adversarial input so pasted strings cannot crash the
      page.

## 12. Build a GitHub Pages static site

- [ ] Choose a static site toolchain that produces plain HTML, CSS, JavaScript,
      and assets.
- [ ] Keep the blueprint codec usable without a server or API route.
- [ ] Bundle the default native catalog and permitted assets into the static
      build, or load them from versioned static JSON and asset files.
- [ ] Configure the production base path for a GitHub Pages project site, such
      as `/repository-name/`.
- [ ] Ensure asset URLs work when the site is served from a repository subpath,
      not only from `/`.
- [ ] Avoid absolute filesystem paths, server-relative asset paths, and runtime
      requests to the game installation.
- [ ] Add a local production-preview command that serves the built files from a
      subdirectory so GitHub Pages path issues are caught before deployment.
- [ ] Add a GitHub Actions workflow that installs dependencies, runs checks,
      builds the site, and publishes the build directory to GitHub Pages.
- [ ] Configure the workflow for the repository's chosen branch and Pages
      deployment environment.
- [ ] Include a custom `404.html` or client-side fallback only if the selected
      routing approach requires it.
- [ ] Prefer a single-page interface with hash routes or no client-side routes
      unless clean URL routing is specifically needed.
- [ ] Add a README section documenting local development, production preview,
      deployment, and the expected GitHub Pages URL.
- [ ] Confirm that the site works with JavaScript enabled and gives a useful
      message when scripts are unavailable.

## 13. Package the project for use

- [ ] Separate the codec, catalog loader, extraction tools, and renderer into
      independently testable packages.
- [ ] Add documentation for installing or selecting mod catalogs.
- [ ] Add a command-line extraction workflow for updating catalogs locally; the
      generated output should be committed or supplied as a build artifact,
      depending on licensing and repository policy.
- [ ] Add a sample catalog package and sample unknown-content behavior.
- [ ] Document asset licensing and the distinction between private extraction and
      public redistribution.
- [ ] Keep the final deployment artifact limited to files required by the static
      site.

## Suggested implementation order

1. [ ] Define the normalized model and implement the decoder.
2. [ ] Add fixtures and round-trip tests.
3. [ ] Build the blueprint-to-JSON and JSON-to-blueprint tools using the codec.
4. [ ] Build a text-only inspector that lists every decoded structure.
5. [ ] Extract a minimal native structure catalog.
6. [ ] Render rectangles, shapes, IDs, filters, and unknown structures.
7. [ ] Add native sprites and accurate rotations.
8. [ ] Add mod catalog loading and fallback handling.
9. [ ] Add pan, zoom, inspection, and export features.
10. [ ] Make the production build work from a GitHub Pages subpath.
11. [ ] Add GitHub Actions deployment and production-preview checks.
12. [ ] Expand extraction to the complete native catalog and asset set.
13. [ ] Validate against blueprints from multiple versions and mods.

## Completion criteria

- [ ] A user can paste any supported blueprint string and see its complete
      layout.
- [ ] A user can convert a supported blueprint string to readable JSON.
- [ ] A user can convert valid normalized JSON back into a supported blueprint
      string.
- [ ] Conversion tools preserve supported filters, custom data, rotations, and
      signal links.
- [ ] Native structures render with accurate shapes, names, and sprites when
      the matching catalog is available.
- [ ] Mod structures render accurately when a mod catalog is installed.
- [ ] Unknown structures remain visible, inspectable, and exportable.
- [ ] Filters, custom data, rotations, and signal links are not lost.
- [ ] The renderer can be updated with new catalogs without rewriting the codec
      or renderer core.
- [ ] The site can be deployed to GitHub Pages as static files with no backend.
- [ ] The deployed site works from the repository subpath and does not require
      access to the user's local game installation.
