## `modinfo.json`

```json
{
  "manifestVersion": 1,
  "id": "author.example-map",
  "name": "Example Map",
  "version": "1.0.0",
  "apiVersion": 1,
  "map": {
    "blueprints": {
      "terrain": "map/terrain.png",
      "lights": "map/lights.png",
      "sensors": "map/sensors.png",
      "authorization": "map/authorization.png",
      "wall": "map/wall.png",
      "lightsMeta": "map/lights_meta.png",
      "decor": "map/decor.png",
      "config": "map/config.json"
    },
    "width": 1920,
    "height": 1920,
    "spawn": {
      "x": 243,
      "y": 50
    },
    "unstuck": {
      "x": 243,
      "y": 50
    },
    "deployment": "skip",
    "topBounds": {
      "hard": 100,
      "soft": 275
    },
    "depthLight": {
      "startY": 6500,
      "endY": 10070,
      "maxSize": 700,
      "minSize": 200
    },
    "parallax": {
      "widthScale": 1.5,
      "offsetY": -2600
    },
    "colorMappings": {
      "4, 5, 6": "GoldSoil"
    }
  }
}
```
