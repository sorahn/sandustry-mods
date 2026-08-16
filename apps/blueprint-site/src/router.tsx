import { createRootRoute, createRoute, createRouter, Link, Outlet } from "@tanstack/react-router";

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
      <div className="w-full max-w-2xl border border-slate-700 bg-black/70 p-8 shadow-2xl shadow-black/40 [border-radius:4px_0_4px_0]">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-slate-500">
          Universal blueprint renderer
        </p>
        <h1 className="font-mono text-3xl font-bold text-white">Blueprint tools are loading in.</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">
          This is the standalone browser workspace. Blueprint decoding, catalogs, rendering, and
          import/export will be added here without depending on the Sandustry mod runtime.
        </p>
        <div className="mt-8 flex gap-3">
          <button className="border border-yellow-300/60 bg-yellow-300/10 px-4 py-2 font-mono text-xs text-yellow-300 transition hover:bg-yellow-300/20">
            Open blueprint
          </button>
          <button className="border border-slate-700 bg-black/50 px-4 py-2 font-mono text-xs text-slate-300 transition hover:border-slate-500 hover:text-white">
            Documentation
          </button>
        </div>
      </div>
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
