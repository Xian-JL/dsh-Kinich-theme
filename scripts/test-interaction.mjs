import assert from "node:assert/strict";
import { installInteractionBridge, isSelectedNavigationNode, shouldQueuePointerBurst, toOverlayPoint } from "../src/client/interaction/interaction-bridge.js";
import { nudgeAjawPosition } from "../src/client/overlay/position.js";

assert.deepEqual(toOverlayPoint(140, 90, { left: 100, top: 50, width: 200, height: 100 }), { x: 40, y: 40 });
assert.equal(toOverlayPoint(50, 90, { left: 100, top: 50, width: 200, height: 100 }), null);
assert.equal(toOverlayPoint(Number.NaN, 90, { left: 100, top: 50, width: 200, height: 100 }), null);
assert.equal(shouldQueuePointerBurst({ clientX: 140, clientY: 90 }, 1), true);
assert.equal(shouldQueuePointerBurst(null, 1), false);
assert.equal(shouldQueuePointerBurst({ clientX: 140, clientY: 90 }, 0), false);
const navigationNode = (role, selected, rowKey, treeLabel = "会话") => ({
	getAttribute: key => ({ role, "aria-selected": selected, "data-row-key": rowKey })[key] ?? null,
	closest: () => ({ getAttribute: () => treeLabel })
});
assert.equal(isSelectedNavigationNode(navigationNode("treeitem", "true", "session:abc")), true);
assert.equal(isSelectedNavigationNode(navigationNode("treeitem", "false", "session:abc")), false);
assert.equal(isSelectedNavigationNode(navigationNode("button", "true", "session:abc")), false);
assert.equal(isSelectedNavigationNode(navigationNode("treeitem", "true", "file:abc")), false);
assert.equal(isSelectedNavigationNode(navigationNode("treeitem", "true", null, "Sessions")), true);
assert.equal(isSelectedNavigationNode(navigationNode("treeitem", "true", null, "Files")), false);

const overlayRect = { width: 800, height: 600 };
const buttonRect = { width: 80, height: 60 };
assert.deepEqual(nudgeAjawPosition({ x: 50, y: 50 }, "ArrowRight", overlayRect, buttonRect), { x: 51, y: 50 });
assert.deepEqual(nudgeAjawPosition({ x: 50, y: 50 }, "ArrowUp", overlayRect, buttonRect), { x: 50, y: 48.667 });
assert.deepEqual(nudgeAjawPosition({ x: 50, y: 50 }, "ArrowRight", overlayRect, buttonRect, true), { x: 54, y: 50 });
assert.deepEqual(nudgeAjawPosition({ x: 5, y: 5 }, "ArrowLeft", overlayRect, buttonRect), { x: 5, y: 5 });
assert.equal(nudgeAjawPosition({ x: 50, y: 50 }, "Enter", overlayRect, buttonRect), null);

const globalDescriptors = Object.fromEntries(["document", "Element", "MutationObserver", "window"]
	.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const eventListeners = new Map();
let burstEvents = 0;
class TestElement {
	constructor() { this.dataset = {}; this.isConnected = true; this.parentElement = null; }
	closest(selector) { return selector.startsWith("button") ? this : null; }
}
class TestMutationObserver { observe() {} disconnect() {} }
const fakeDocument = {
	visibilityState: "visible",
	body: {},
	activeElement: null,
	addEventListener: (type, listener) => eventListeners.set(type, listener),
	removeEventListener: type => eventListeners.delete(type),
	dispatchEvent: event => { if (event.type === "kinich:click-burst") burstEvents += 1; }
};
Object.defineProperties(globalThis, {
	document: { configurable: true, value: fakeDocument },
	Element: { configurable: true, value: TestElement },
	MutationObserver: { configurable: true, value: TestMutationObserver },
	window: { configurable: true, value: { matchMedia: () => ({ matches: false }) } }
});
try {
	const action = new TestElement();
	const dispose = installInteractionBridge();
	eventListeners.get("pointerdown")({ button: 0, pointerType: "mouse", clientX: 10, clientY: 20 });
	eventListeners.get("click")({ target: action, detail: 1 });
	dispose();
	await new Promise(resolve => setTimeout(resolve, 10));
	assert.equal(action.dataset.kinichPressed, undefined, "Unmount must cancel a queued post-click style mutation");
	assert.equal(burstEvents, 0, "Unmount must cancel a queued click-burst event");
} finally {
	for (const [key, descriptor] of Object.entries(globalDescriptors)) {
		if (descriptor) Object.defineProperty(globalThis, key, descriptor);
		else delete globalThis[key];
	}
}

console.log("Kinich interaction feedback tests passed.");
