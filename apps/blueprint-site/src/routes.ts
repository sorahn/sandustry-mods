import { createRootRoute, createRoute } from "@tanstack/react-router";
import { AppLayout } from "./components/AppLayout";
import { BlueprintCodecPage } from "./pages/Codec";
import { BlueprintInspectorPage } from "./pages/Inspector";
import { BlueprintVisualFixturePage } from "./pages/VisualFixture";
import { HomePage } from "./pages/HomePage";

const rootRoute = createRootRoute({ component: AppLayout });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: HomePage });
const codecRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/codec",
  component: BlueprintCodecPage,
});
const inspectorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inspect",
  component: BlueprintInspectorPage,
});
const visualFixtureRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inspect/fixture",
  component: BlueprintVisualFixturePage,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  codecRoute,
  inspectorRoute,
  visualFixtureRoute,
]);
