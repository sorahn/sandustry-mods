import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routes";

export const router = createRouter({
  routeTree,
  basepath: import.meta.env.DEV ? "/" : "/sandustry-tools/",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
