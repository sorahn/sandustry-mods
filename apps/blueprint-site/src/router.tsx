import { createRootRoute, createRoute, createRouter, Link, Outlet } from "@tanstack/react-router";
import { Button, Panel } from "@sandustry/ui/react";

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-sd-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-black/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-mono text-sm font-bold tracking-[0.2em] text-yellow-300">
            SANDUSTRY / BLUEPRINTS
          </Link>
          <nav className="flex gap-4 font-mono text-xs text-slate-400">
            <Link to="/" activeProps={{ className: "text-yellow-300" }}>
              Home
            </Link>
            <span>Viewer coming soon</span>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <section className="grid min-h-[60vh] place-items-center">
      <Panel className="w-full max-w-2xl p-8">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-slate-500">
          Universal blueprint renderer
        </p>
        <h1 className="font-mono text-3xl font-bold text-white">Blueprint tools are loading in.</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">
          This is the standalone browser workspace. Blueprint decoding, catalogs, rendering, and
          import/export will be added here without depending on the Sandustry mod runtime.
        </p>
        <div className="mt-8 flex gap-3">
          <Button accent>Open blueprint</Button>
          <Button>Documentation</Button>
        </div>
      </Panel>
    </section>
  ),
});

const routeTree = rootRoute.addChildren([indexRoute]);
export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
