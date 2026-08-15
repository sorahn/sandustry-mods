patches.json
```json
[
  {
    "id": "bundle-log-prefix",
    "file": "js/bundle.js",
    "find": "initializing workers",
    "operation": "insertBefore",
    "code": "[patched] ",
    "expectedMatches": 1
  },
  {
    "id": "manager-log",
    "atomicGroup": "worker-logs",
    "file": "js/manager-worker.js",
    "regex": {
      "pattern": "Manager (thread initializing)",
      "flags": "i"
    },
    "operation": "replace",
    "code": "Manager patched $1",
    "expectedMatches": 1
  },
  {
    "id": "simulation-log",
    "atomicGroup": "worker-logs",
    "file": "js/simulation-worker.js",
    "find": "initializing worker",
    "operation": "wrap",
    "before": "[patched] ",
    "after": " [done]",
    "expectedMatches": 1
  }
]
```
