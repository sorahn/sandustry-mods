import { Link } from "@tanstack/react-router";
import { Panel } from "@sandustry/ui/react";

export function HomePage() {
  return (
    <section className="grid min-h-[60vh] place-items-center">
      <Panel className="w-full max-w-2xl p-8">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-yellow-300/80">
          Sandustry blueprint tools
        </p>
        <h1 className="text-3xl font-bold text-white">Read and convert your blueprints.</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">
          Paste a Sandustry blueprint string to inspect its contents, or turn readable JSON back
          into a string. Everything runs locally in your browser.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/codec" className="sd-button sd-button--accent">
            Open the codec
          </Link>
        </div>
        <div className="mt-8 grid gap-3 border-t border-slate-800 pt-5 text-xs text-slate-500 sm:grid-cols-3">
          <span>
            <strong className="text-slate-300">In the browser.</strong>
            <br />
            No upload or account required.
          </span>
          <span>
            <strong className="text-slate-300">Readable data.</strong>
            <br />
            View structures, filters, and links as JSON.
          </span>
          <span>
            <strong className="text-slate-300">Current formats.</strong>
            <br />
            Supports v2 binary, v2 text, and v1 strings.
          </span>
        </div>
      </Panel>
    </section>
  );
}
