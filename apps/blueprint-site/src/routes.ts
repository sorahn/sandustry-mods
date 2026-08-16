import { createRootRoute, createRoute } from "@tanstack/react-router";
import { AppLayout, BlueprintCodecPage, HomePage } from "./pages";

const rootRoute = createRootRoute({ component: AppLayout });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: HomePage });
const codecRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/codec",
  component: BlueprintCodecPage,
});

export const routeTree = rootRoute.addChildren([indexRoute, codecRoute]);
