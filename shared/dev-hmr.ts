type DevHmrRuntime = {
  __sandustryDevOnDispose__?: (fn: () => void) => () => void;
  __sandustryDevIsHmrEval__?: () => boolean;
};

const runtime = globalThis as typeof globalThis & DevHmrRuntime;

/** Register cleanup before a development renderer reload. A release bundle is a no-op. */
export function onDispose(fn: () => void): () => void {
  return runtime.__sandustryDevOnDispose__?.(fn) ?? (() => {});
}

/** True when the current mod body was evaluated by the development reload client. */
export function isHotReloadEval(): boolean {
  return runtime.__sandustryDevIsHmrEval__?.() ?? false;
}
