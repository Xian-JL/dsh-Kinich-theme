let currentState = "idle";
const subscribers = new Set();

export function getKinichSessionState() { return currentState; }
export function subscribeKinichSessionState(listener) { subscribers.add(listener); return () => subscribers.delete(listener); }
export function setKinichSessionState(next) {
	if (next === currentState) return;
	currentState = next;
	if (typeof document !== "undefined") document.body.dataset.kinichSessionState = next;
	for (const listener of subscribers) listener(next);
}
