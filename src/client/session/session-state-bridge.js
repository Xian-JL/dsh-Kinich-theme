import * as react from "react";
import { setKinichSessionState } from "./status-store.js";

/** Invisible session-scoped bridge that turns DSH SessionSnapshot.running into product feedback. */
export function SessionStateBridge({ useSession }) {
	const running = useSession(snapshot => Boolean(snapshot?.running));
	const failed = useSession(snapshot => Boolean(snapshot?.error ?? snapshot?.lastError));
	const previous = (0, react.useRef)(running);
	const timerRef = (0, react.useRef)(null);

	(0, react.useEffect)(() => {
		if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
		if (failed) {
			setKinichSessionState("error");
			timerRef.current = setTimeout(() => { setKinichSessionState("idle"); timerRef.current = null; }, 3200);
		} else if (running) {
			setKinichSessionState("running");
		} else if (previous.current) {
			setKinichSessionState("complete");
			timerRef.current = setTimeout(() => { setKinichSessionState("idle"); timerRef.current = null; }, 1800);
		} else {
			setKinichSessionState("idle");
		}
		previous.current = running;
		return () => { if (timerRef.current !== null) clearTimeout(timerRef.current); };
	}, [running, failed]);

	return null;
}
