```text
mods/
  example-mod/
    modinfo.json
    main.js
    worker.js
    patches.json
    config/
    assets/
    map/
    preview.png
    workshop.json
```
modinfo.json
```json
{
  "manifestVersion": 1,
  "id": "author.example-mod",
  "name": "Example Mod",
  "version": "1.0.0",
  "apiVersion": 1,
  "entry": "main.js",
  "workerEntry": "worker.js",
  "description": "An example Sandustry mod.",
  "author": "Your name",
  "dependencies": [],
  "loadOrder": 0
}
```
- `main.js` - Runs on main thread.
- `worker.js` - Runs on manager and simulation worker threads.
- `patches.json` - Patches the bundles.
- `config/` - Overrides native JSON configs.
- `assets/` - Overrides textures.
- `map/` - Blueprints and configs for custom maps.
