/** Commit one Kinich patch. Current DSH forms accept an atomic mutation. */
export async function writeKinichSettings(settings, patch, previous = {}) {
	const entries = Object.entries(patch);
	if (entries.length === 0) return;
	if (typeof settings.mutate === "function") {
		const accepted = await settings.mutate(entries.map(([field, value]) => ({ op: "set", path: [field], value })));
		if (accepted === false) throw new Error("Kinich settings mutation refused by DSH");
		return;
	}

	// Earlier DSH scopes expose only field writes. Undo accepted fields if a later
	// write fails, and report explicitly when even the undo cannot be completed.
	const applied = [];
	try {
		for (const [field, value] of entries) {
			if (await settings.set(field, value) === false) throw new Error("Kinich setting write refused by DSH");
			applied.push(field);
		}
	} catch (cause) {
		let partial = false;
		for (const field of applied.reverse()) {
			if (!Object.hasOwn(previous, field)) { partial = true; continue; }
			try {
				if (await settings.set(field, previous[field]) === false) partial = true;
			} catch { partial = true; }
		}
		throw Object.assign(new Error("Kinich settings write failed", { cause }), { partial });
	}
}
