import { Link, Outlet } from "@tanstack/react-router";
import { debugComponent } from "../components/DebugComponentWrapper";

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-sd-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-black/50">
        <div className="site-shell mx-auto flex w-full items-center justify-between px-6 py-4">
          <Link to="/" className="font-mono text-sm font-bold tracking-[0.2em] text-yellow-300">
            SANDUSTRY / BLUEPRINT TOOLS
          </Link>
          <nav className="flex gap-4 font-mono text-xs text-slate-400">
            <Link to="/" activeProps={{ className: "text-yellow-300" }}>
              Home
            </Link>
            {debugComponent(Link, {
              to: "/inspect",
              activeProps: { className: "text-yellow-300" },
              children: "Inspect",
            })}
            <Link to="/codec" activeProps={{ className: "text-yellow-300" }}>
              Encode / Decode
            </Link>
          </nav>
        </div>
      </header>
      <main className="site-shell mx-auto w-full flex-1 px-6 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-slate-800/80 bg-black/30">
        <div className="site-shell mx-auto w-full px-6 py-4 text-center font-mono text-[11px] tracking-[0.12em] text-slate-600">
          SANDUSTRY / BLUEPRINT TOOLS
        </div>
      </footer>
    </div>
  );
}
