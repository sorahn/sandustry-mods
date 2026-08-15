globalThis.deepSearchTech = function (object, callback) {
	for (const entry of object) {
		callback(entry);
		if (entry.children) deepSearchTech(entry.children, callback);
	}
};

fluxloaderAPI.events.on("fl:scene-loaded", (scene) => {
	fluxloaderAPI.gameInstance.state.store.options.CreativeSpawnerConfig ??= {
		spawnCount: 1,
		elementType: 1,
	};
	// fluxloaderAPI.gameInstance.state.store.portals ??= {}; // Stores location of portals
	fluxloaderAPI.gameInstance.state.session.windows.building.CreativeSpawnerConfig = false;

	fluxloaderAPI.events.on("corelib:block-CreativeSpawner", (spawner) => {
		let count = 0;
		for (let y = 3; y >= 0; y--) {
			if (count >= spawner.data.spawnCount) break;
			for (let x = 0; x < 4; x++) {
				if (!corelib.simulation.isEmpty(spawner.x + x, spawner.y + y)) continue;
				if (count++ >= spawner.data.spawnCount) break;
				corelib.simulation.spawnElement({ id: spawner.data.elementType, x: spawner.x + x, y: spawner.y + y });
			}
		}
	});
});

globalThis.blockCreativeSpawnerPreConfigUI = function ({ state }) {
	let [val, set] = React.useState(state.store.options.CreativeSpawnerConfig.spawnCount ?? 1);
	return { width: "300px", val, set };
};

globalThis.blockCreativeSpawnerConfigUI = function ({ extra, closeConfig }) {
	// Get list of particle ids, but filter out particles without names
	let particles = Object.values(corelib.exposed.named.particles).filter((v) => corelib.exposed.raw.jh[v]?.name);
	return React.createElement(
		"div",
		{},
		React.createElement(
			"div",
			{ className: "flex items-center space-x-2 mb-2" },
			React.createElement("label", { htmlFor: "spawn_count", className: "text-white text-sm" }, "Spawn Count"),
			React.createElement("input", {
				type: "number",
				id: "spawn_count",
				value: extra.val,
				min: 1,
				max: 16,
				onChange: (e) => {
					const i = parseInt(e.target.value, 10);
					if (!isNaN(i) && i >= 1 && i <= 16) extra.set(i);
				},
				className: "text-center text-black",
			}),
		),
		React.createElement(
			"div",
			{
				className: "grid grid-cols-2 gap-2",
			},
			particles.map((id) => {
				return React.createElement(
					"button",
					{
						key: id,
						className: "px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-200 text-sm",
						onClick: () => {
							closeConfig({
								elementType: id,
								spawnCount: extra.val,
							});
						},
					},
					corelib.exposed.raw.jh[id]?.name ?? "NO NAME", // Shouldn't be undefined, but just in case..
				);
			}),
		),
	);
};
