# Save visual regression tests

Save fixtures live in `saves/` and their expected minimap images live in
`baselines/`, using the same filename stem. Add future save comparisons by
placing the `.save` input and reference `.png` in those directories. The visual
test discovers every `.save` file automatically and matches it by filename
stem.

Rendered images and ImageMagick diffs are written under
`artifacts/visual/save-explorer/` and are not committed.
