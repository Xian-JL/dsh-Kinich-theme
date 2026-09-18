export const KINICH_INTERACTION_EVENT = "kinich:interaction-feedback";
export const KINICH_CLICK_BURST_EVENT = "kinich:click-burst";

const TEXT_INPUT_SELECTOR = "textarea, input[type='text'], input[type='search'], [contenteditable='true'], [role='textbox']";
const ACTION_SELECTOR = "button, [role='button'], a[href], summary";
const SEND_PATTERN = /(?:send|submit|发送|提交|运行|执行)/i;

function elementFrom(target) {
	return target instanceof Element ? target : target?.parentElement ?? null;
}

export function getTextInput(target) {
	return elementFrom(target)?.closest(TEXT_INPUT_SELECTOR) ?? null;
}

export function getAction(target) {
	return elementFrom(target)?.closest(ACTION_SELECTOR) ?? null;
}

export function isSendAction(action) {
	if (!action) return false;
	if (action.matches("button[type='submit']")) return true;
	const label = [action.getAttribute("aria-label"), action.getAttribute("title"), action.getAttribute("data-testid"), action.textContent]
		.filter(Boolean).join(" ").trim();
	return SEND_PATTERN.test(label);
}

export function toOverlayPoint(clientX, clientY, rect) {
	if (!rect || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
	const x = clientX - rect.left;
	const y = clientY - rect.top;
	return x >= 0 && y >= 0 && x <= rect.width && y <= rect.height ? { x, y } : null;
}

export function announceKinichInteraction(state, source = "host") {
	if (typeof document === "undefined") return;
	document.dispatchEvent(new CustomEvent(KINICH_INTERACTION_EVENT, { detail: { state, source } }));
}

export function installInteractionBridge() {
	if (typeof document === "undefined") return () => {};
	let focusedInput = null;
	const pressTimers = new WeakMap();
	const setFocused = input => {
		if (focusedInput && focusedInput !== input) delete focusedInput.dataset.kinichFocus;
		focusedInput = input;
		if (input) input.dataset.kinichFocus = "true";
		document.body.dataset.kinichComposerFocus = String(Boolean(input));
	};
	const focusIn = event => setFocused(getTextInput(event.target));
	const focusOut = event => {
		const input = getTextInput(event.target);
		if (!input) return;
		queueMicrotask(() => { if (!getTextInput(document.activeElement)) setFocused(null); });
	};
	const pointerDown = event => {
		if (event.button === 0 && event.pointerType !== "touch") {
			document.dispatchEvent(new CustomEvent(KINICH_CLICK_BURST_EVENT, { detail: { clientX: event.clientX, clientY: event.clientY } }));
		}
		const action = getAction(event.target);
		if (!action || action.closest(".dsh-kinich-overlay")) return;
		action.dataset.kinichPressed = "true";
		const previous = pressTimers.get(action);
		if (previous) clearTimeout(previous);
		pressTimers.set(action, setTimeout(() => { delete action.dataset.kinichPressed; pressTimers.delete(action); }, 190));
	};
	const click = event => {
		const action = getAction(event.target);
		if (isSendAction(action)) announceKinichInteraction("sending", "pointer");
	};
	const keyDown = event => {
		if (event.key !== "Enter" || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
		if (getTextInput(event.target)) announceKinichInteraction("sending", "keyboard");
	};
	document.addEventListener("focusin", focusIn, true);
	document.addEventListener("focusout", focusOut, true);
	document.addEventListener("pointerdown", pointerDown, true);
	document.addEventListener("click", click, true);
	document.addEventListener("keydown", keyDown, true);
	return () => {
		setFocused(null);
		document.removeEventListener("focusin", focusIn, true);
		document.removeEventListener("focusout", focusOut, true);
		document.removeEventListener("pointerdown", pointerDown, true);
		document.removeEventListener("click", click, true);
		document.removeEventListener("keydown", keyDown, true);
	};
}
