fluxloaderAPI.events.on("cl:cell-change", (data) => {
	let deleters = fluxloaderAPI.gameInstanceState.store.structures.filter((v) => v.type === corelib.exposed.named.blocks.CreativeDeleter);
	for (const cell of data) {
		if (cell.toCellType === 0) continue;
		for (const deleter of deleters) {
			if (cell.loc.x >= deleter.x && cell.loc.x <= deleter.x + 4 && cell.loc.y >= deleter.y && cell.loc.y <= deleter.y + 4) {
				corelib.simulation.setCell(cell.loc.x, cell.loc.y, 0);
			}
		}
	}
});
