/* Development-only renderer reload client. Prepended to watched mod bundles. */
(function installSandustryDevHmr() {
  const config = globalThis.__sandustryDevHmrConfig__;
  if (!config || !config.url || !config.modId) return;

  const hosts = globalThis.__sandustryDevHmrHosts__ || (globalThis.__sandustryDevHmrHosts__ = {});
  const host =
    hosts[config.modId] ||
    (hosts[config.modId] = {
      eventSource: null,
      reconnectTimer: null,
      disposers: [],
      reloading: false,
      installed: false,
      source: null,
    });
  const hotReloadEval = host.installed;

  globalThis.__sandustryDevHmrActive__ = config.modId;
  globalThis.__sandustryDevOnDispose__ = (fn) => {
    if (typeof fn !== "function") return () => {};
    host.disposers.push(fn);
    return () => {
      const index = host.disposers.indexOf(fn);
      if (index >= 0) host.disposers.splice(index, 1);
    };
  };
  globalThis.__sandustryDevIsHmrEval__ = () => hotReloadEval;

  function readEntry() {
    try {
      const api = sandkit.api;
      const url = api.assets.getUrl("entry.js");
      const busted = `${url}${url.includes("?") ? "&" : "?"}hot=${Date.now()}`;
      return fetch(busted, { cache: "no-store" })
        .then((response) => (response.ok ? response.text() : null))
        .catch(() => readEntryXhr(busted));
    } catch {
      return Promise.resolve(null);
    }
  }

  function readEntryXhr(url) {
    return new Promise((resolve) => {
      try {
        const request = new XMLHttpRequest();
        request.open("GET", url);
        request.onload = () =>
          resolve(
            request.status === 0 || (request.status >= 200 && request.status < 300)
              ? request.responseText
              : null,
          );
        request.onerror = () => resolve(null);
        request.send();
      } catch {
        resolve(null);
      }
    });
  }

  function dispose() {
    for (let index = host.disposers.length - 1; index >= 0; index--) {
      try {
        host.disposers[index]();
      } catch (error) {
        console.error("[sandustry dev] dispose failed", error);
      }
    }
    host.disposers.length = 0;
  }

  function evaluate(source) {
    if (host.reloading) return;
    host.reloading = true;
    dispose();
    try {
      new Function("sandkit", source)(sandkit);
      host.source = source;
      console.log(`[${config.modId}] hot reloaded`);
    } catch (error) {
      console.error(`[${config.modId}] hot reload failed`, error);
    } finally {
      host.reloading = false;
    }
  }

  function connect() {
    if (host.eventSource) return;
    try {
      const source = new EventSource(config.url);
      host.eventSource = source;
      source.onmessage = (event) => {
        let payload;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
        if (payload.modId !== config.modId || payload.mode !== "hmr") return;
        void readEntry().then((next) => {
          if (next && (payload.force || next !== host.source)) evaluate(next);
        });
      };
      source.onerror = () => {
        source.close();
        if (host.eventSource === source) host.eventSource = null;
        if (!host.reconnectTimer) {
          host.reconnectTimer = setTimeout(() => {
            host.reconnectTimer = null;
            connect();
          }, 1000);
        }
      };
    } catch {
      if (!host.reconnectTimer) {
        host.reconnectTimer = setTimeout(() => {
          host.reconnectTimer = null;
          connect();
        }, 1000);
      }
    }
  }

  host.installed = true;
  connect();
})();
