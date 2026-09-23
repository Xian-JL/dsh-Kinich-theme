import assert from "node:assert/strict";
import { isSendAction, shouldQueuePointerBurst, toOverlayPoint } from "../src/client/interaction/interaction-bridge.js";
import { nudgeAjawPosition } from "../src/client/overlay/position.js";

function action({ type = "button", aria = "", title = "", testId = "", text = "" } = {}) {
	return {
		textContent: text,
		matches: selector => selector === "button[type='submit']" && type === "submit",
		getAttribute: name => ({ "aria-label": aria, title, "data-testid": testId })[name] ?? null
	};
}

assert.equal(isSendAction(action({ type: "submit" })), true);
assert.equal(isSendAction(action({ aria: "发送消息" })), true);
assert.equal(isSendAction(action({ title: "Send message" })), true);
assert.equal(isSendAction(action({ testId: "composer-send" })), true);
assert.equal(isSendAction(action({ text: "设置" })), false);
assert.equal(isSendAction(null), false);
assert.deepEqual(toOverlayPoint(140, 90, { left: 100, top: 50, width: 200, height: 100 }), { x: 40, y: 40 });
assert.equal(toOverlayPoint(50, 90, { left: 100, top: 50, width: 200, height: 100 }), null);
assert.equal(toOverlayPoint(Number.NaN, 90, { left: 100, top: 50, width: 200, height: 100 }), null);
assert.equal(shouldQueuePointerBurst({ clientX: 140, clientY: 90 }, 1), true);
assert.equal(shouldQueuePointerBurst(null, 1), false);
assert.equal(shouldQueuePointerBurst({ clientX: 140, clientY: 90 }, 0), false);

const overlayRect = { width: 800, height: 600 };
const buttonRect = { width: 80, height: 60 };
assert.deepEqual(nudgeAjawPosition({ x: 50, y: 50 }, "ArrowRight", overlayRect, buttonRect), { x: 51, y: 50 });
assert.deepEqual(nudgeAjawPosition({ x: 50, y: 50 }, "ArrowUp", overlayRect, buttonRect), { x: 50, y: 48.667 });
assert.deepEqual(nudgeAjawPosition({ x: 50, y: 50 }, "ArrowRight", overlayRect, buttonRect, true), { x: 54, y: 50 });
assert.deepEqual(nudgeAjawPosition({ x: 5, y: 5 }, "ArrowLeft", overlayRect, buttonRect), { x: 5, y: 5 });
assert.equal(nudgeAjawPosition({ x: 50, y: 50 }, "Enter", overlayRect, buttonRect), null);

console.log("Kinich interaction feedback tests passed.");
