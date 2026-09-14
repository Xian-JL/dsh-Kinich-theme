import * as react from "react";
import * as react_jsx_runtime from "react/jsx-runtime";

export function Toggle({ checked, description, disabled, label, onChange, stateLabel }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
		"aria-checked": checked,
		"aria-label": `${label}：${stateLabel}`,
		className: "dsh-kinich-toggle",
		disabled,
		onClick: onChange,
		role: "switch",
		type: "button",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
			className: "dsh-kinich-toggle__copy",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dsh-kinich-toggle__label",
				children: label
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dsh-kinich-toggle__description",
				children: description
			})]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			"aria-hidden": "true",
			className: "dsh-kinich-toggle__track"
		})]
	});
}

function ChoicePreview({ kind }) {
	if (!kind) return null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
		"aria-hidden": "true",
		className: "dsh-kinich-position-preview",
		"data-position": kind,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-position-preview__figure" })
	});
}

export function ChoiceGroup({ disabled, label, onChange, options, value }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "dsh-kinich-choice",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "dsh-kinich-choice__label",
			children: label
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			"aria-label": label,
			className: "dsh-kinich-choice__options",
			role: "group",
			children: options.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				"aria-pressed": option.value === value,
				className: `dsh-kinich-choice__button${option.preview ? " dsh-kinich-choice__button--preview" : ""}`,
				disabled,
				onClick: () => onChange(option.value),
				type: "button",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChoicePreview, { kind: option.preview }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: option.label })]
			}, option.value))
		})]
	});
}

export function PresetCards({ disabled, onChange, options, value }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: "dsh-kinich-preset-grid",
		role: "group",
		children: options.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
			"aria-pressed": option.value === value,
			className: "dsh-kinich-preset-card",
			"data-preset": option.value,
			disabled,
			onClick: () => onChange(option.value),
			type: "button",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dsh-kinich-preset-card__art",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-preset-card__sun" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-preset-card__grid" })
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-preset-card__title", children: option.label }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-preset-card__description", children: option.description })
			]
		}, option.value))
	});
}

export function SectionHeader({ eyebrow, title, description }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "dsh-kinich-section-heading",
		children: [
			eyebrow && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-section-heading__eyebrow", children: eyebrow }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-section-heading__title", children: title }),
			description && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-section-heading__description", children: description })
		]
	});
}

export function ActionButton({ disabled, label, onClick, tone = "neutral" }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
		className: "dsh-kinich-action",
		"data-tone": tone,
		disabled,
		onClick,
		type: "button",
		children: label
	});
}

export function RangeControl({ disabled, label, max, min, onCommit, suffix, value }) {
	const [draft, setDraft] = (0, react.useState)(value);
	const committedRef = (0, react.useRef)(value);
	(0, react.useEffect)(() => {
		setDraft(value);
		committedRef.current = value;
	}, [value]);
	const commit = () => {
		if (draft === committedRef.current) return;
		committedRef.current = draft;
		onCommit(draft);
	};
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
		className: "dsh-kinich-range",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
			className: "dsh-kinich-range__heading",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("output", { children: [draft, suffix] })]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
			disabled,
			max,
			min,
			onBlur: commit,
			onChange: (event) => setDraft(Number(event.currentTarget.value)),
			onKeyUp: commit,
			onPointerUp: commit,
			step: 1,
			type: "range",
			value: draft
		})]
	});
}
