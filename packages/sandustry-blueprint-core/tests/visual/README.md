# Blueprint visual regression tests

The catalog fixture and every `.txt` file in `blueprints/` render through the
actual blueprint site and capture a PNG with headless Chrome. The current
images are trimmed to the rendered map bounds, without the site navigation,
test controls, or viewport chrome. Current images and ImageMagick diffs are
written under `artifacts/visual/`.

Put one encoded blueprint per file in `packages/sandustry-blueprint-core/tests/visual/blueprints/`, for example
`packages/sandustry-blueprint-core/tests/visual/blueprints/thermal-line.txt`. Both v2 binary strings and v2 text
strings are accepted.

Create or replace the checked-in baseline with:

```sh
npm run visual:render -- --update
```

Update one snapshot by its fixture name or blueprint filename without the
`.txt` extension:

```sh
npm run visual:render -- --update --only thermal-line
```

Render without changing the baseline with:

```sh
npm run visual:render
```

Compare the current image with the baseline with:

```sh
npm run visual:diff
```

SVG output snapshots for the catalog and every blueprint fixture are checked
with:

```sh
npm run test:blueprint-svg
```

Refresh them after an intentional SVG renderer change with:

```sh
npm run test:blueprint-svg -- --update
```

PNG output snapshots are checked as individual Bun tests with:

```sh
npm run test:blueprint-png
```

Refresh the PNG baselines after an intentional renderer change with:

```sh
npm run test:blueprint-png -- --update
```

The same selector can limit comparisons:

```sh
npm run visual:diff -- --only thermal-line
```

The built-in catalog fixture is in
`apps/blueprint-site/src/visual-fixtures/catalog.ts`. It intentionally covers
the sprite families currently being corrected, including belts, pyros, and
directional fans.
