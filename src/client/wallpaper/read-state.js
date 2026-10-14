/** Never combine the current snapshot with history from another revision. */
export async function readConsistentWallpaperState(readCurrent, readHistory) {
	for (let attempt = 0; attempt < 3; attempt++) {
		const current = await readCurrent();
		const history = await readHistory();
		if (Number.isSafeInteger(current?.revision) && current.revision === history?.revision) return { current, history };
	}
	throw Object.assign(new Error("Wallpaper changed in another window; reload to continue"), { code: "revision-conflict" });
}
