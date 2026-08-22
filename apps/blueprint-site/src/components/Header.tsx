import { Link } from "@tanstack/react-router";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-black/85 shadow-lg backdrop-blur-sm">
      <div className="site-shell mx-auto flex w-full items-center justify-between px-6 py-4">
        <Link to="/" className="font-mono text-sm font-bold tracking-[0.2em] text-yellow-300">
          SANDUSTRY / TOOLS
        </Link>
        <nav className="flex gap-4 font-mono text-xs text-slate-400">
          <Link to="/" activeProps={{ className: "text-yellow-300" }}>
            Home
          </Link>
          <Link to="/inspect" activeProps={{ className: "text-yellow-300" }}>
            Blueprint Renderer
          </Link>
          <Link to="/codec" activeProps={{ className: "text-yellow-300" }}>
            Encoder / Decoder
          </Link>
          <Link to="/explorer" activeProps={{ className: "text-yellow-300" }}>
            Explorer
          </Link>
          {import.meta.env.DEV ? (
            <>
              <Link to="/components" activeProps={{ className: "text-yellow-300" }}>
                Components
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
