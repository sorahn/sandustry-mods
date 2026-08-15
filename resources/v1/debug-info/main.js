// Debug Toggle - switches the game's built-in debug tools from the settings UI.
//
// Runs inside `new Function("__sandkit", ...)` wrapped in an async IIFE, so this
// file is a plain script: no import/export, but top-level await is available and
// `sandkit` is already in scope.

const api = sandkit.api;
const MOD_ID = "uolkx.debug-toggle";

function safe(fn, fallback = null) {
	try {
		return fn();
	} catch (e) {
		return fallback;
	}
}

function setting(name, fallback = false) {
	const value = safe(() => api.settings.get(name));
	return typeof value === "boolean" ? value : fallback;
}

function isEnabled() {
	return setting("enabled", true);
}

// =================== FLAGS ===================

// Two of these are read from localStorage while the game boots, so they persist
// but only take hold on the next launch. The rest are read out of the live
// config object every frame, so writing them applies immediately - if the config
// object we can reach is the real one rather than a copy.
const BOOT_FLAGS = ["active", "drawChunks"];

const FLAGS = [
	{ setting: "debugActive", flag: "active" },
	{ setting: "drawChunks", flag: "drawChunks" },
	{ setting: "cellInspector", flag: "cellInspector" },
	{ setting: "showLights", flag: "showLights" },
	{ setting: "showAuthorizationZones", flag: "showAuthorizationZones" },
	{ setting: "showFilters", flag: "showFilters" },
	{ setting: "doNotDrawStructures", flag: "doNotDrawStructures" },
];

function configRoot() {
	const all = safe(() => api.gameConfig.getAll());
	if (!all || typeof all !== "object") return null;
	if (!all.debug || typeof all.debug !== "object") return null;
	return all;
}

// Returns true when the value actually took effect in the live config.
function writeLiveFlag(flag, value) {
	const config = configRoot();
	if (!config) return false;

	const applied = safe(() => {
		config.debug[flag] = value;
		return true;
	});
	if (!applied) return false;

	// getAll may hand back a copy - in that case the write silently does nothing,
	// so read it back instead of assuming.
	const check = configRoot();
	return !!check && check.debug[flag] === value;
}

function writeBootFlag(flag, value) {
	return !!safe(() => {
		localStorage.setItem(`debug.${flag}`, String(value));
		return true;
	});
}

let liveWritesWork = null;

// Boot flag values as they were when the game started. Debug mode wires itself
// up during init - the debug item goes into the inventory, shortcuts get bound -
// and none of that can be undone by flipping the flag later. So a boot flag that
// differs from its startup value needs a restart in BOTH directions, not just
// when switching it on.
const bootSnapshot = {};

function applyAll(announce) {
	if (!isEnabled()) return;

	let restartFlags = 0;
	let appliedLive = 0;

	for (const entry of FLAGS) {
		const value = setting(entry.setting, false);
		const isBootFlag = BOOT_FLAGS.includes(entry.flag);

		if (isBootFlag) {
			writeBootFlag(entry.flag, value);
			if (!(entry.flag in bootSnapshot)) bootSnapshot[entry.flag] = value;
			else if (bootSnapshot[entry.flag] !== value) restartFlags++;
		}

		const live = writeLiveFlag(entry.flag, value);
		if (live) appliedLive++;
	}

	liveWritesWork = appliedLive > 0;

	if (!announce) return;

	if (restartFlags > 0) {
		safe(() => api.ui.toast("Saved - restart the game for debug mode to change"));
	} else {
		safe(() => api.ui.toast("Debug settings applied"));
	}
}

// =================== SETUP ===================

safe(() => api.settings.onChange(() => applyAll(true)));

applyAll(false);

console.log(`[${MOD_ID}] loaded, live config writes: ${liveWritesWork === null ? "unknown" : liveWritesWork}`);
