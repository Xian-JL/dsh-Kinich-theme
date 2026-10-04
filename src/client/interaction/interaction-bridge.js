export const KINICH_CLICK_BURST_EVENT = "kinich:click-burst";

const TEXT_INPUT_SELECTOR = "textarea, input[type='text'], input[type='search'], [contenteditable='true'], [role='textbox']";
const ACTION_SELECTOR = "button, [role='button'], a[href], summary";

function elementFrom(target) {
	return target instanceof Element ? target : target?.parentElement ?? null;
}

export function getTextInput(target) {
	return elementFrom(target)?.closest(TEXT_INPUT_SELECTOR) ?? null;
}

export function getAction(target) {
	return elementFrom(target)?.closest(ACTION_SELECTOR) ?? null;
}

export function toOverlayPoint(clientX, clientY, rect) {
	if (!rect || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
	const x = clientX - rect.left;
	const y = clientY - rect.top;
	return x >= 0 && y >= 0 && x <= rect.width && y <= rect.height ? { x, y } : null;
}

export function shouldQueuePointerBurst(pointer, clickDetail) {
	return pointer !== null && clickDetail > 0;
}

export function isSelectedNavigationNode(node) {
	if (node?.getAttribute?.("role") !== "treeitem" || node.getAttribute("aria-selected") !== "true") return false;
	const rowKey = node.getAttribute("data-row-key");
	if (rowKey !== null) return rowKey.startsWith("session:");
	const treeLabel = node.closest?.('[role="tree"]')?.getAttribute("aria-label");
	return treeLabel === "会话" || treeLabel === "Sessions";
}

export function installInteractionBridge() {
	if (typeof document === "undefined") return () => {};
	let focusedInput = null;
	let pendingPointer = null;
	let disposed = false;
	const timers = new Set();
	const pressTimers = new Map();
	const navigationTimers = new Map();
	let navigationPulse = 0;
	const schedule = (callback, delay) => {
		let timer;
		timer = setTimeout(() => {
			timers.delete(timer);
			if (!disposed) callback();
		}, delay);
		timers.add(timer);
		return timer;
	};
	const cancel = timer => {
		clearTimeout(timer);
		timers.delete(timer);
	};
	const setFocused = input => {
		if (focusedInput && focusedInput !== input) delete focusedInput.dataset.kinichFocus;
		focusedInput = input;
		if (input) input.dataset.kinichFocus = "true";
	};
	const focusIn = event => setFocused(getTextInput(event.target));
	const focusOut = event => {
		const input = getTextInput(event.target);
		if (!input) return;
		queueMicrotask(() => { if (!disposed && !getTextInput(document.activeElement)) setFocused(null); });
	};
	const pulseAction = action => {
		if (!action?.isConnected || action.closest(".dsh-kinich-overlay")) return;
		action.dataset.kinichPressed = "true";
		const previous = pressTimers.get(action);
		if (previous) cancel(previous);
		pressTimers.set(action, schedule(() => { delete action.dataset.kinichPressed; pressTimers.delete(action); }, 190));
	};
	const pointerDown = event => {
		pendingPointer = event.button === 0 && event.pointerType !== "touch"
			? { clientX: event.clientX, clientY: event.clientY }
			: null;
	};
	const pointerCancel = () => { pendingPointer = null; };
	const click = event => {
		const action = getAction(event.target);
		const pointer = pendingPointer;
		const queueBurst = Boolean(action) && shouldQueuePointerBurst(pointer, event.detail);
		pendingPointer = null;
		// DSH owns workspace/menu actions. Run decorative mutations only after the
		// Host click has completed so React can switch workspaces or create chats.
		schedule(() => {
			pulseAction(action);
			if (queueBurst) {
				document.dispatchEvent(new CustomEvent(KINICH_CLICK_BURST_EVENT, { detail: pointer }));
			}
		}, 0);
	};
	const selectedNavigation = new MutationObserver(records => {
		if (disposed || document.visibilityState !== "visible" || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
		for (const record of records) {
			const item = record.target;
			if (!isSelectedNavigationNode(item)) continue;
			const generation = String(++navigationPulse);
			item.dataset.kinichNavigationPulse = generation;
			const previous = navigationTimers.get(item);
			if (previous !== undefined) cancel(previous);
			navigationTimers.set(item, schedule(() => {
				if (item.dataset.kinichNavigationPulse === generation) delete item.dataset.kinichNavigationPulse;
				navigationTimers.delete(item);
			}, 280));
		}
	});
	selectedNavigation.observe(document.body, { attributes: true, attributeFilter: ["aria-selected"], subtree: true });
	document.addEventListener("focusin", focusIn, true);
	document.addEventListener("focusout", focusOut, true);
	document.addEventListener("pointerdown", pointerDown, true);
	document.addEventListener("pointercancel", pointerCancel, true);
	document.addEventListener("click", click);
	return () => {
		disposed = true;
		selectedNavigation.disconnect();
		for (const timer of timers) clearTimeout(timer);
		timers.clear();
		for (const [action] of pressTimers) delete action.dataset.kinichPressed;
		pressTimers.clear();
		for (const [item] of navigationTimers) delete item.dataset.kinichNavigationPulse;
		navigationTimers.clear();
		setFocused(null);
		document.removeEventListener("focusin", focusIn, true);
		document.removeEventListener("focusout", focusOut, true);
		document.removeEventListener("pointerdown", pointerDown, true);
		document.removeEventListener("pointercancel", pointerCancel, true);
		document.removeEventListener("click", click);
	};
}
