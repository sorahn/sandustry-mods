import type { ComponentType, PropsWithChildren } from "react";

type DebugComponentWrapperProps = PropsWithChildren<{
  component?: ComponentType<any>;
  componentProps?: Record<string, unknown>;
}>;

export function debugComponent(
  Component: ComponentType<any>,
  componentProps?: Record<string, unknown>,
) {
  if (!import.meta.env.DEV) return null;
  return <Component {...componentProps} />;
}

/**
 * Development-only wrapper for temporary test UI and instrumentation.
 * Vite replaces import.meta.env.DEV during builds, so production renders none
 * of the wrapped component tree even if it is accidentally left mounted.
 */
export function DebugComponentWrapper({
  children,
  component: Component,
  componentProps,
}: DebugComponentWrapperProps) {
  if (Component) return debugComponent(Component, componentProps);
  return <>{children}</>;
}
