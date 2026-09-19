import * as react from "react";
import { clearKinichSessionState, setKinichSessionState } from "./status-store.js";
import { deriveKinichSessionPhase, resolveSessionId } from "./compat.js";

/** Invisible session-scoped bridge that turns DSH SessionSnapshot lifecycle into product feedback. */
export function SessionStateBridge({ useSession, sessionId }) {
	const phase = useSession(deriveKinichSessionPhase);
	const snapshotSessionId = useSession(snapshot => snapshot?.sessionId ?? snapshot?.id);
	const resolvedSessionId = resolveSessionId(sessionId, { sessionId: snapshotSessionId });
	const previousActive = (0, react.useRef)(phase === "sending" || phase === "running");
	const previousSessionId = (0, react.useRef)(resolvedSessionId);
	const timerRef = (0, react.useRef)(null);

	(0, react.useEffect)(() => {
		if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
		if (previousSessionId.current !== resolvedSessionId) {
			previousSessionId.current = resolvedSessionId;
			previousActive.current = false;
		}
		const active = phase === "sending" || phase === "running";
		if (phase === "error") {
			setKinichSessionState(resolvedSessionId, "error");
			timerRef.current = setTimeout(() => { setKinichSessionState(resolvedSessionId, "idle"); timerRef.current = null; }, 3200);
		} else if (phase === "sending") {
			setKinichSessionState(resolvedSessionId, "sending");
		} else if (phase === "running") {
			setKinichSessionState(resolvedSessionId, "running");
		} else if (previousActive.current) {
			setKinichSessionState(resolvedSessionId, "complete");
			timerRef.current = setTimeout(() => { setKinichSessionState(resolvedSessionId, "idle"); timerRef.current = null; }, 1800);
		} else {
			setKinichSessionState(resolvedSessionId, "idle");
		}
		previousActive.current = active;
		return () => { if (timerRef.current !== null) clearTimeout(timerRef.current); };
	}, [phase, resolvedSessionId]);

	(0, react.useEffect)(() => () => clearKinichSessionState(resolvedSessionId), [resolvedSessionId]);

	return null;
}
