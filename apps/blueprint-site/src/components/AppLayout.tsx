import { Outlet } from "@tanstack/react-router";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function AppLayout() {
  const visualCapture =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("visualCapture") === "1";
  if (visualCapture) return <Outlet />;

  return (
    <div className="flex min-h-screen flex-col bg-sd-950 text-slate-100">
      <Header />
      <main className="site-shell mx-auto w-full flex-1 px-6 py-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
