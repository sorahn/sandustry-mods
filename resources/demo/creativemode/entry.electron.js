fluxloaderAPI.setPatch("js/bundle.js", "creativemode:playerSpawned", {
	// Unlocks all tech and enables portal cheats (if installed) when the player lands
	type: "replace",
	from: `Yl(e.session.soundEngine,"cocking");`,
	to: `Yl(e.session.soundEngine,"cocking");globalThis.portalsConfig&&(globalThis.portalsConfig.cheats=true);deepSearchTech($f(),(tech)=>{tech.cost=0;Yf(e,tech)});`,
});

fluxloaderAPI.setPatch("js/bundle.js", "creativemode:fluxite", {
	type: "replace",
	from: `fluxite:e.startingResources,`,
	to: `fluxite:99999999,`,
});

fluxloaderAPI.setPatch("js/bundle.js", "creativemode:unlockUpgrades", {
	type: "replace",
	from: `upgradesUnlocked:!1`,
	to: `upgradesUnlocked:!0`,
});

corelib.blocks.register({
	sourceMod: "creativemode",
	id: "CreativeSpawner",
	name: "Creative Spawner",
	description: "An infinite source of particles.",
	shape: [
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[0, 0, 0, 0],
	],
	imagePath: "CreativeSpawner",
	angles: [0, 90, -90, 180],
	hasConfigMenu: true,
	unlockedByDefault: true,
	tickInterval: 500,
});

corelib.schedules.register("creativemode:spawner", 500);

corelib.blocks.register({
	sourceMod: "creativemode",
	id: "CreativeDeleter",
	name: "Creative Deleter",
	description: "An infinitely deep void for your particle trash.",
	shape: [
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[0, 0, 0, 0],
	],
	imagePath: "CreativeDeleter",
	angles: [0, 90, -90, 180],
	unlockedByDefault: true,
});
