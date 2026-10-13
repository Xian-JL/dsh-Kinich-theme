import * as react from "react";
import * as react_jsx_runtime from "react/jsx-runtime";
import { clearKinichSessionState, setKinichSessionState } from "./status-store.js";
import { deriveKinichSessionPhase, resolveSessionId, selectKinichPendingInteraction, shouldAnnounceKinichCompletion } from "./compat.js";

function SessionStateBridgeCore({ useSession, sessionId, pendingInteraction }) {
	const phase = useSession(snapshot => deriveKinichSessionPhase(snapshot, pendingInteraction));
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
		} else if (phase === "waiting") {
			setKinichSessionState(resolvedSessionId, "waiting");
			previousActive.current = false;
		} else if (phase === "sending") {
			setKinichSessionState(resolvedSessionId, "sending");
		} else if (phase === "running") {
			setKinichSessionState(resolvedSessionId, "running");
		} else if (shouldAnnounceKinichCompletion(previousActive.current, phase)) {
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

function SessionStateBridgeLegacy({ useSession, sessionId }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionStateBridgeCore, { useSession, sessionId, pendingInteraction: undefined });
}

function SessionStateBridgeWithPendingInteraction({ useSession, useSessionStatus, sessionId }) {
	const snapshotSessionId = useSession(snapshot => snapshot?.sessionId ?? snapshot?.id);
	const resolvedSessionId = resolveSessionId(sessionId, { sessionId: snapshotSessionId });
	const pendingInteraction = useSessionStatus(snapshot => selectKinichPendingInteraction(snapshot, resolvedSessionId));
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionStateBridgeCore, {
		useSession, sessionId, pendingInteraction
	});
}

/** Session lifecycle plus DSH's optional UI-owned pending-interaction projection. */
export function SessionStateBridge(props) {
	const Bridge = typeof props.useSessionStatus === "function"
		? SessionStateBridgeWithPendingInteraction
		: SessionStateBridgeLegacy;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Bridge, props);
}
