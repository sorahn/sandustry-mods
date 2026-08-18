import { Link } from "@tanstack/react-router";

export function Header() {
  return (
    <header className="border-b border-slate-800/80 bg-black/50">
      <div className="site-shell mx-auto flex w-full items-center justify-between px-6 py-4">
        <Link to="/" className="font-mono text-sm font-bold tracking-[0.2em] text-yellow-300">
          SANDUSTRY / BLUEPRINT TOOLS
        </Link>
        <nav className="flex gap-4 font-mono text-xs text-slate-400">
          <Link to="/" activeProps={{ className: "text-yellow-300" }}>
            Home
          </Link>
          <Link to="/inspect" activeProps={{ className: "text-yellow-300" }}>
            Inspect
          </Link>
          <Link to="/codec" activeProps={{ className: "text-yellow-300" }}>
            Encode / Decode
          </Link>
        </nav>
      </div>
    </header>
  );
}
