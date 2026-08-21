export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-black/30">
      <div className="site-shell mx-auto w-full px-6 py-4 text-center font-mono text-[11px] tracking-[0.12em] text-slate-600">
        SANDUSTRY / TOOLS ·{" "}
        {__GIT_INFO__.commit ? (
          <a
            href="https://github.com/sorahn/sandustry-tools/"
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-yellow-300"
          >
            {__GIT_INFO__.label}
          </a>
        ) : (
          __GIT_INFO__.label
        )}
      </div>
      <div className="w-full px-6 pb-3 text-center font-mono text-[10px] tracking-[0.1em] text-slate-600">
        COMMUNITY PROJECTS ·{" "}
        <a
          href="https://sandustry-skins.online"
          target="_blank"
          rel="noreferrer"
          className="text-yellow-300 hover:underline"
        >
          sandustry-skins.online
        </a>{" "}
        ·{" "}
        <a
          href="https://sandustryvault.com"
          target="_blank"
          rel="noreferrer"
          className="text-yellow-300 hover:underline"
        >
          sandustryvault.com
        </a>
      </div>
      <p className="w-full text-center text-[10px] text-slate-600 mb-4">
        This is a community project and is not affiliated with Lantto Games or Hooded Horse. All
        rights reserved to their respective owners.
      </p>
    </footer>
  );
}
