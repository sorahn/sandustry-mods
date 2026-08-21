# Sandustry color catalog

This is a working catalog of colors found in the available Sandustry v1
bundle, DOM captures, surface-map data, and repository code that mirrors game
behavior. It focuses on colors with an identifiable game meaning. Generic
Tailwind/CSS framework output, image pixels, and every incidental renderer
constant are not treated as palette entries.

Color values are shown as six-digit hex where the source stores an integer.
For an element or terrain, `metaColor` is the game's catalog/label/swatch
color; it is not necessarily the exact color of every rendered pixel. Terrain
`colorHSL` values are included when the renderer defines them separately.

## Core elements

Source: `resources/bundle.0.5.4.js:59600-59775`.

| Color | Game content | Matter / role |
| --- | --- | --- |
| `#f4a460` | Sand | Solid; base terrain output and starter material |
| `#cd853f` | Wet Sand | Slushy; refined/intermediate material |
| `#cccccc` | Residue | Slushy; leftover material |
| `#ffd700` | Gold | Solid; collectible/resource material |
| `#1e90ff` | Water | Liquid; fluid and rain-related material |
| `#aaaaaa` | Particle | Particle marker/fallback catalog color |
| `#f7f7f7` | Steam | Gas; hot fluid / sky-rain interaction |
| `#7fff00` | Seed | Solid; plant input |
| `#cc5cdb` | Petalium | Wisp; plant/product material |
| `#66cc66` | Wet Seed | Slushy; growing material |
| `#1b5e20` | Seedling | Static; growing plant |
| `#808080` | Burnt Residue | Solid; fire residue |
| `#ff4500` | Fire | Gas; burning hazard |
| `#e0ffff` | Freezing Ice | Powder; cold material |
| `#ffa500` | Flame | Solid; short-lived fire state |
| `#ff3300` | Lava | Liquid; hot fluid |
| `#a04040` | Sandium | Solid; red resource material |
| `#7a00a8` | Gloom | Slushy; gloom-emitter material |
| `#8b0000` | Basalt | Solid; terrain/mineral output |

## Additional element and mod-content colors

Source: `resources/bundle.0.5.4.js:93650-118620`. These entries are spread
across the base game and registered mod content in the captured bundle.

| Color | Game content | Notes |
| --- | --- | --- |
| `#ff8c00` | Caulk | Additional solid element |
| `#de9d10` | Solidite | Terrain/material metadata color |
| `#9b5fcf` | Voidjuice | Additional element |
| `#c9a0ff` | Florin | Gas element |
| `#9b4fe0` | Florinol | Liquid element |
| `#ffb3d9` | Dry Petalium | Wisp element |
| `#ffd700` | Liquid Gold | Liquid element; shares Gold's catalog color |
| `#b87333` | Liquid Copper / Copper | Copper material family |
| `#ff66b3` | Auralite | Powder/crystal material |
| `#ff66cc` | Prismite | Slushy/crystal material |
| `#ff99cc` | Prismaline | Gas/crystal material |
| `#b14be5` | Voidhusk | Slushy/void material |
| `#8b82e0` | Aurixite | Additional mineral |
| `#3050c8` | Pyronol | Additional material |
| `#9932cc` | Void Seeds | Liquid/void material |
| `#5b2c8c` | Growing Void Seed | Static/void material |
| `#00ced1` | Void Petal | Wisp/void material |
| `#0033aa` | Coolant | Liquid |
| `#ff69b4` | Irradiated Crystal | Solid; shares the Petal color family |
| `#e0b8e8` | Moonhop | Solid |
| `#1a1410` | Oil | Liquid |

## Terrain metadata colors

Source: `resources/bundle.0.5.4.js:11370-11575` and additional terrain
registrations around `resources/bundle.0.5.4.js:97790-118620`. The HSL column is
the terrain renderer's explicit `colorHSL`, where present; otherwise the hex is
the metadata color only.

| Color | Terrain | Renderer HSL | Purpose |
| --- | --- | --- | --- |
| `#808080` | Stone | `0, 0, 66` | Base stone terrain |
| `#8b5a2b` | Divider | `30, 100, 50` | Breakable divider |
| `#926426` | Dirt | — | Diggable terrain; can output Sand |
| `#228b22` | Grass | `94, 45, 48` | Diggable terrain; can output Sand |
| `#1dae1d` | Moss | `100, 72, 47` | Flammable terrain |
| `#daa520` | Gold Soil | `60, 100, 50` | Gold-bearing terrain |
| `#ff69b4` | Petal | — | Petalium-bearing terrain |
| `#556b2f` | Spore Soil | — | Seed-bearing terrain |
| `#708090` | Fog | — | Fog terrain |
| `#5dcfd6` | Jetpack Fog | — | Fog variant with patterned backdrop |
| `#4682b4` | Water Fog | — | Water-fog terrain |
| `#b22222` | Lava Fog | — | Lava-fog terrain |
| `#add8e6` | Freezing Ice Soil | `180, 100, 90` | Freezing-ice-bearing terrain |
| `#8a2be2` | Fluxite | `287, 100, 44` | Fluxite terrain |
| `#afeeee` | Ice | `199, 99, 90` | Ice terrain |
| `#8b0000` | Sandium Soil | `0, 100, 32` | Sandium-bearing terrain |
| `#2b2b2b` | Obsidian / Scoria | `0, 100, 15` | Dense dark terrain |
| `#fffab3` | Crackstone | `52, 100, 85` | Explosive/dynamite terrain |
| `#4a3728` | Dissolving Terrain | — | Terrain variant |
| `#8b7355` | Puff Mushroom | — | Terrain variant |
| `#0094b3` | Crystal | — | Crystal terrain |
| `#eed975` | Dune | `50, 80, 70` | Sand-colored terrain |
| `#222222` | Bedrock | `0, 0, 0` | Immutable deep terrain |
| `#181c20` | Blackrock | `210, 14, 11` | Dark rock terrain |
| `#141414` | Blackrock variant | — | Dark-rock fallback/variant |
| `#19e680` | Glass Terrain | `150, 80, 50` | Glass terrain |
| `#339999` | Florinol Soil | `270, 50, 40` | Florinol-bearing terrain |
| `#4a40b0` | Auralite Crystal | `250, 60, 50` | Auralite-bearing terrain |
| `#b6bcc1` | Shatterstone | `207, 8, 73` | Breakable pale stone |

The mod picker also carries a small readable fallback map for terrain swatches
in `mods/filtered-lenses/src/entry.tsx:129-151`; those values agree with the
metadata colors above for the named terrain entries. `#9aa7b5` is the picker
fallback for an unknown terrain, and `#6b8e23` is the synthetic Earth filter
entry rather than a terrain definition.

## Named UI and status palette

Source: `resources/bundle.0.5.4.js:51619-51710`. These are explicit semantic
colors from the game's debug/color showcase and are useful candidates for
shared UI tokens.

| Color | Name in game code | Likely use |
| --- | --- | --- |
| `#22c55e` | Primary | Positive/primary action state |
| `#ef4444` | Danger | Error/destructive state |
| `#ffaa44` | Warning | Warning/attention state |
| `#00ffff` | Info | Informational/cyan state |
| `#9966ff` | Purple | Secondary/status accent |
| `#cc99ff` | Petalium | Material-themed accent |
| `#ffff00` | Gold | Gold/material accent |
| `#d4a574` | Sand | Sand/material accent |
| `#66ccff` | Water | Water/material accent |
| `#fbeb33` | Fire | Fire/material accent |
| `#ffbd0b` | Lava | Lava/material accent |
| `#ffffcc` | Steam | Steam/material accent |
| `#ffffff` | Text | Primary text |
| `#888888` | Muted | Secondary text |
| `#1a1a2e` | BG Dark | Dark application background |
| `#2d2d44` | BG Panel | Panel background |
| `#ff1493` | Hot Pink | Showcase/effect accent |
| `#39ff14` | Neon Green | Showcase/effect accent |
| `#663399` | Deep Purple | Showcase/effect accent |
| `#ee82ee` | Violet | Showcase/effect accent |
| `#ff00ff` | Magenta | Showcase/effect accent |

## Confirmed UI states and tutorial colors

These are hard-coded semantic uses in the production UI rather than entries in
the named palette.

| Color | Use | Source |
| --- | --- | --- |
| `#ffe700` | Primary game accent: selected, focused, active, attention, tutorial action | `bundle.0.5.4.js:27450`, `47145`, `52849-53235` |
| `#ffd700` | Energy icon, gold tutorial text, gold progress | `bundle.0.5.4.js:52969-52997` and `resources/building-menu.html` |
| `#e5b471` | Wet-sand tutorial text | `bundle.0.5.4.js:52916` |
| `#4fc3f7` | Water tutorial text | `bundle.0.5.4.js:52920` |
| `#b87e2e` | Refined wet-sand tutorial text | `bundle.0.5.4.js:52940`, `53063` |
| `#a78bfa` | Tech/unlock tutorial text | `bundle.0.5.4.js:53026` |
| `#60a5fa` | Logistics unlock tutorial text | `bundle.0.5.4.js:53082` |
| `#4ade80` | Completed tutorial checklist items / success | `bundle.0.5.4.js:53108-53117` |
| `#8aff4b` | Finished tutorial title | `bundle.0.5.4.js:53214` |
| `#ff0aff → #ff55ff` | Character-themed gradient text | `bundle.0.5.4.js:31168` |
| `#ff6600 → #ff9933` | Strataform-themed gradient text | `bundle.0.5.4.js:31168` |
| `#b9fffc → #00ffff` | Prophecy-themed gradient text | `bundle.0.5.4.js:31168` |
| `#ffe700 → #ffcc00` | Heliodyne-themed gradient text | `bundle.0.5.4.js:31168` |

## Effects, lights, and world-item particles

These values color transient particles or lights, not catalog swatches.

| Color | Effect / source |
| --- | --- |
| `#c6f3ff` | Aerokinetic fan particles (`bundle.0.5.4.js:14399`) |
| `#7838ca` | Artifact pickup particles (`bundle.0.5.4.js:26781`; numeric `7878858`) |
| `#00ff00` | Glyph-key pickup particles (`bundle.0.5.4.js:26786`; numeric `65280`) |
| `#00ff47` and `#ff0000` | Stratacore pickup particle pair (`bundle.0.5.4.js:26790`; numeric `65351`, `16711680`) |
| `#0000ff` | Orb retrieval light (`bundle.0.5.4.js:26808`) |
| `#ffffff` | Generic/default particle color and Steam-to-water process particles |
| `#89b8d9` | Freezing-ice conversion particle (`bundle.0.5.4.js:94919`; numeric `9025753`) |
| `#3b3b3b` | Burnt-residue background particles (`bundle.0.5.4.js:95130`; numeric `3881787`) |

## Renderer and capture-only colors

These are useful when reproducing the game's look, but they are not game
content colors.

| Color | Use | Source |
| --- | --- | --- |
| `#000000` | Black outlines, scrims, and foundation linework | Bundle and DOM captures |
| `rgba(0,0,0,0.9)` | Building-menu item radial background | `resources/building-menu.html` |
| `rgba(100,100,100,0.9)` | Building-menu item radial highlight | `resources/building-menu.html` |
| `rgba(255,231,0,0.15)` | Selected/attention yellow surface | `resources/building-menu.html` |
| `#33a8ff` | Blueprint/map water background in this repository's renderer | `packages/sandustry-blueprint-core/src/svg-renderer.ts:58` |
| `#718096` | Blueprint block grid | `packages/sandustry-blueprint-core/src/svg-renderer.ts:57` |
| `#17202c` | Blueprint cell grid | `packages/sandustry-blueprint-core/src/svg-renderer.ts:57` |
| `#ff0000` / `#00ff99` | Blueprint blocked / active connection lines | `packages/sandustry-blueprint-core/src/svg-renderer.ts:75` |

## Notes and gaps

- The bundle contains many additional numeric `metaColor` values in optional
  mod registrations. They should be added here with their `id` and
  `matterType` after a current F8 export or a clean mod catalog capture makes
  the registration boundaries unambiguous.
- `metaColor` is the best stable color token exposed by the game for element
  and terrain identity. Rendered sprites, lighting, translucency, and terrain
  shaders can differ from it.
- The game also stores RGBA variant arrays for some elements (for example
  Caulk and Auralite). Those are material variants rather than one catalog
  color and should become a separate variant table if exact sprite rendering
  is needed.
- The `resources/sandkit-surface-map/data/gameconfig.json` capture confirms
  runtime color-related settings such as `debug.defaultBaseHue` and flashlight
  color, but its redacted values do not provide additional usable hex colors.
