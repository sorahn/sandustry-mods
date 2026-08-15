# Shared mod code

Place reusable TypeScript modules directly in this directory and import them
from mod sources with the `~shared` alias, for example
`import { helper } from "~shared/helper"`. The build bundles those imports
into every mod's generated `entry.js`.

The generated Sandustry entrypoint remains a single plain script with no
imports or exports. Keep shared helpers free of mod-specific initialization and
runtime side effects.
