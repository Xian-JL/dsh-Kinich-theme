const states = new Map();
const subscribers = new Set();

export function getKinichSessionState(sessionId) {
	if (sessionId !== undefined) return states.get(sessionId) ?? "idle";
	if (states.size === 1) return states.values().next().value;
	return "idle";
}
export function subscribeKinichSessionState(listener) { subscribers.add(listener); return () => subscribers.delete(listener); }
export function setKinichSessionState(sessionId, next) {
	if (states.get(sessionId) === next) return;
	states.set(sessionId, next);
	for (const listener of subscribers) listener(sessionId, next);
}
export function clearKinichSessionState(sessionId) {
	if (!states.delete(sessionId)) return;
	for (const listener of subscribers) listener(sessionId, "idle");
}
