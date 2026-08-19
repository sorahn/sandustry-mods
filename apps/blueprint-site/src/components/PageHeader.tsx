import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export function PageHeader({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div>
      <Link to="/" className="font-mono text-xs text-slate-500 hover:text-yellow-300">
        ← Home
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-white">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{children}</p>
    </div>
  );
}
