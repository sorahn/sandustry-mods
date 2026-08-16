import type { PropsWithChildren } from "react";

/**
 * Development-only wrapper for temporary test UI and instrumentation.
 * Vite replaces import.meta.env.DEV during builds, so production renders none
 * of the wrapped component tree even if it is accidentally left mounted.
 */
export function DebugComponentWrapper({ children }: PropsWithChildren) {
  if (!import.meta.env.DEV) return null;
  return <>{children}</>;
}
