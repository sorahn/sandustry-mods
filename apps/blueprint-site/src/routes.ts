import { createRootRoute, createRoute } from "@tanstack/react-router";
import { AppLayout } from "./components/AppLayout";
import { BlueprintCodecPage } from "./pages/Codec";
import { BlueprintInspectorPage } from "./pages/Inspector";
import { BlueprintVisualFixturePage } from "./pages/VisualFixture";
import { ComponentsPage } from "./pages/Components";
import { HomePage } from "./pages/HomePage";
import { SaveExplorerPage } from "./pages/Explorer";

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
const componentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/components",
  component: ComponentsPage,
});
const explorerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explorer",
  component: SaveExplorerPage,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  codecRoute,
  inspectorRoute,
  visualFixtureRoute,
  componentsRoute,
  explorerRoute,
]);
