# Getting your mod into the in-game Mods tab (and a proposal for enable/disable)

Two things here: how to make your mod show up in the game's own settings UI, and a
convention I'd like to suggest for turning mods off without unsubscribing.

## 1. The Mods tab is automatic — but only if you declare settings

There is a **Mods** tab in Options. No debug mode needed. It appears on its own,
but only when at least one installed mod declares settings. From the bundle:

```js
const tabs = ["general", "video", "audio", "controls"];
if (modsWithSettings.length > 0) tabs.push("mods");
```

and the list it checks is built like this:

```js
const mods = state.session.externalMods?.orderedMods;
for (const mod of mods) {
  const manifest = mod?.manifest;
  if (manifest?.configSchema && Object.keys(manifest.configSchema).length > 0)
    result.push(manifest);
}
```

So: **no `configSchema` in your `modinfo.json` → your mod is invisible in that tab.**
That's it. Add one field and the game renders the controls for you.

## 2. configSchema format

Field types are `number`, `boolean` and `choice`. `labelKey` is **required** on
every field; `descriptionKey` is optional. `min` / `max` / `step` are allowed on
number fields only — declaring them on anything else is a validation error.

```json
{
  "configSchema": {
    "enabled": {
      "type": "boolean",
      "default": true,
      "labelKey": "Mod enabled",
      "descriptionKey": "Turn the mod off without unsubscribing."
    },
    "strength": {
      "type": "number",
      "default": 60,
      "min": 0,
      "max": 1000,
      "step": 10,
      "labelKey": "Effect strength"
    },
    "mode": {
      "type": "choice",
      "default": "balanced",
      "labelKey": "Mode",
      "options": [
        { "value": "balanced", "labelKey": "Balanced" },
        { "value": "aggressive", "labelKey": "Aggressive" }
      ]
    }
  }
}
```

Limits: 64 fields per mod, 64 options per choice, option values up to 128 chars.

**On `labelKey`:** it's a localization key. If no translation is registered the
game shows the key itself, so plain readable English works as a fallback. The
tidy way is to register translations with `api.i18n.register(locale, {...})`.

## 3. Reading the values

```js
const value = api.settings.get("strength");   // single field
const all   = api.settings.getAll();          // everything
const off   = api.settings.onChange((values) => { /* re-apply */ });
```

Values are stored in the player's settings under
`session.settings.externalModSettings[yourModId]`, so they persist across saves
and worlds rather than living in the world file.

## 4. Proposal: a shared `enabled` convention

The game has **no way to disable a mod** — Workshop gives you Subscribe and
Unsubscribe and nothing in between. And a mod can't disable another mod either:
`executeExternalMainMods` runs everything at world load, so by the time any of our
code runs, every other mod has already registered its structures, hooks and
listeners. There's no unload API.

The only thing that can switch a mod off is **the mod itself**. So I'd suggest we
standardise on it:

- make the **first** field of your `configSchema` a boolean called `enabled`,
  defaulting to `true`
- gate every behaviour behind it — ticks, hotkeys, overlays, UI

```js
function isEnabled() {
  const value = api.settings.get("enabled");
  return typeof value === "boolean" ? value : true;
}

// in your loop / handler / render
if (!isEnabled()) return;
```

If every mod does this, players get one predictable switch per mod in a place the
game already provides, and nobody has to unsubscribe to test whether a mod is
causing a problem.

### The part worth being honest about

Some things **cannot** be undone at runtime. `energy.registerType`,
`structures.register`, `addProcessor`, event subscriptions — once they've run,
they've run. Two options:

- skip the registration entirely when the mod starts disabled, and state in the
  `descriptionKey` that re-enabling needs a world reload
- or keep the registration and make sure the behaviour behind it is inert

Whichever you pick, say so in the field description. A player toggling a switch
that silently does nothing until reload is worse than one that tells them.

---

Written while building a few mods for the game. If any of this is wrong or
changes in a patch, correct me — it's all read out of the shipped bundle, not
from any official docs.
