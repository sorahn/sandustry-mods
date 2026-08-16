import {
  DebugContext,
  UnknownRecord,
  LOG_PREFIX,
  logCopyable,
  rawEngine,
  rawState,
  toast,
} from "./common";
import { hotbar, hotbarPath } from "./hotbar";

export function dumpRuntimeSurface(context: DebugContext): void {
  const state = rawState(context);
  const currentHotbar = hotbar(context);
  const surface = {
    sandkitKeys: Object.keys(context.sandkit),
    publicApiNamespaces: Object.keys(context.api),
    engineKeys: Object.keys(rawEngine(context)),
    engineApiNamespaces: Object.keys(rawEngine(context).api ?? {}),
    stateKeys: Object.keys(state),
    playerKeys: Object.keys((state.player as UnknownRecord) ?? {}),
    storeKeys: Object.keys((state.store as UnknownRecord) ?? {}),
    storePlayerKeys: Object.keys(((state.store as UnknownRecord)?.player as UnknownRecord) ?? {}),
    hotbarKeys: Object.keys(currentHotbar ?? {}),
    hotbarPath: hotbarPath(context),
    publicActionApi: Object.keys((context.api.action as UnknownRecord) ?? {}),
    publicInputApi: Object.keys((context.api.input as UnknownRecord) ?? {}),
  };

  console.group(`${LOG_PREFIX} runtime surface`);
  console.log("copy the following line for a portable summary:");
  logCopyable("SURFACE", surface);
  console.log(surface);
  console.log("public action API", context.api.action);
  console.log("public input API", context.api.input);
  console.groupEnd();
  toast(context, "runtime surface dumped to the console");
}
