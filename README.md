# Infinite Source and Trash

This is a Sandustry v1 mod. It adds two creative utility structures to the
`Misc` building category:

- **Infinite Source** creates `sand` above itself when the output cell is empty.
  When first placed, it opens a configuration prompt where you can enter a
  registered element ID such as `sand` or `copper`.
- **Infinite Trash** removes an element occupying its cell.

The block icons currently reuse the Creative Spawner and Creative Deleter icons
from the demo mod, renamed to `SourceBlock.png` and `Trash.png`.

## Packaging

Install the contents of this directory as a mod, or zip the contents so that
`modinfo.json` is at the root of the archive.

From the repository root, run `make install` to build the current version and
copy the unzipped mod into an ID-named folder in the default Sandustry mods
directory. Override the destination with
`make install SANDUSTRY_MODS_DIR=/path/to/mods`.

To bump the mod version and create a commit containing only `mod/modinfo.json`:

```sh
make version patch
make version minor
make version major
```
