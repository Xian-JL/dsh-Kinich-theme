/**
 * Translate both the DSH 0.1.5 and 0.1.6 Session snapshots into the small
 * product-state vocabulary used by Ajaw.
 */
export function deriveKinichSessionPhase(snapshot) {
	if (!snapshot) return "idle";
	const failed = snapshot.promptError ?? snapshot.openError ?? snapshot.lastAgentError
		?? snapshot.error ?? snapshot.lastError;
	if (failed) return "error";
	if (snapshot.awaitingFirstTurn === true || (Array.isArray(snapshot.pendingSubmissions) && snapshot.pendingSubmissions.length > 0)) {
		return "sending";
	}
	if (snapshot.running === true) return "running";
	return "idle";
}

/** Resolve the Session identity attached to a strict Session-scoped slot. */
export function resolveSessionId(slotSessionId, snapshot) {
	return slotSessionId ?? snapshot?.sessionId ?? snapshot?.id ?? "legacy-main";
}

/**
 * Resolve the main-view Session across the 0.1.5 single-current model and the
 * 0.1.6 retained multi-instance model.
 */
export function selectMainViewSessionId(snapshot) {
	if (!snapshot) return undefined;
	if (snapshot.current !== undefined && snapshot.current !== null) return snapshot.current;
	const byId = snapshot.byId ?? {};
	for (const id of snapshot.ids ?? []) {
		if ((byId[id]?.retainedBy?.mainView ?? 0) > 0) return id;
	}
	for (const [id, summary] of Object.entries(byId)) {
		if ((summary?.retainedBy?.mainView ?? 0) > 0) return id;
	}
	return undefined;
}
