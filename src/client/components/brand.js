import * as react_jsx_runtime from "react/jsx-runtime";
import { AJAW_MARK_DATA_URI } from "../assets.generated.js";

function BrandShell({ size, className = "", hero = false }) {
	const resolvedSize = Number.isFinite(size) ? size : hero ? 92 : 28;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
		"aria-hidden": "true",
		className: ["dsh-kinich-brand-shell", hero ? "dsh-kinich-brand-shell--hero" : "", className].filter(Boolean).join(" "),
		style: { width: resolvedSize, height: resolvedSize },
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-brand-shell__orbit" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-brand-shell__pulse" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-brand-shell__spark" }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", { alt: "", className: "dsh-kinich-brand-mark", src: AJAW_MARK_DATA_URI,
				width: Math.round(resolvedSize * (hero ? 0.7 : 0.78)), height: Math.round(resolvedSize * (hero ? 0.7 : 0.78)) })
		]
	});
}

export function SidebarBrandMark({ size }) { return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrandShell, { size }); }
export function HeroBrandMark({ size, className }) { return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrandShell, { size, className, hero: true }); }
export function SidebarBrandName() {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { className: "dsh-kinich-sidebar-brand-name", children: [
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "KINICH" }),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "NATLAN INTERFACE" })
	] });
}
