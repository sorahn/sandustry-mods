## `modinfo.json`

```json
{
  "manifestVersion": 1,
  "id": "author.example-overrides",
  "name": "Example Overrides",
  "version": "1.0.0",
  "apiVersion": 1,
  "dependencies": [],
  "loadOrder": 0,
  "configOverrides": {
    "drill": "config/drill.json"
  },
  "textureOverrides": {
    "conveyor_left": "assets/conveyor_left.png",
    "conveyor_right": "assets/conveyor_right.png",
    "cursor_default": "assets/cursor_default.png",
    "shaker_left": {
      "path": "assets/shaker_left_sheet.png",
      "frameWidth": 18,
      "frames": 6,
      "intervalMs": 166
    }
  },
}
```
