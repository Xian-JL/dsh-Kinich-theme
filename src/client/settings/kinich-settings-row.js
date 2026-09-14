import * as react from "react";
import * as react_jsx_runtime from "react/jsx-runtime";
import { AJAW_MARK_DATA_URI } from "../assets.generated.js";
import { DEFAULT_KINICH_SETTINGS, KINICH_VISUAL_PRESETS } from "../../shared/settings.js";
import { useKinichSettings } from "../hooks/use-kinich-settings.js";
import { ActionButton, ChoiceGroup, PresetCards, RangeControl, SectionHeader, Toggle } from "./controls.js";

function matchesPatch(value, patch) {
	return Object.entries(patch).every(([key, expected]) => value[key] === expected);
}

function activePreset(value) {
	for (const [name, patch] of Object.entries(KINICH_VISUAL_PRESETS)) {
		if (matchesPatch(value, patch)) return name;
	}
	return "custom";
}

function ThemePreview({ value, t }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "dsh-kinich-live-preview",
		"data-character": String(value.showCharacter),
		"data-position": value.characterPosition,
		"data-style": value.visualStyle,
		"data-intensity": value.visualIntensity,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-kinich-live-preview__copy",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-live-preview__eyebrow", children: `KINICH // ${value.visualIntensity.toUpperCase()}` }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t(`style.${value.visualStyle}.label`) }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(`style.${value.visualStyle}.tagline`) })
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-kinich-live-preview__stage",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-live-preview__grid" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-live-preview__character" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", { alt: "", className: "dsh-kinich-live-preview__ajaw", src: AJAW_MARK_DATA_URI })
				]
			})
		]
	});
}

function SettingSection({ title, description, children, className = "" }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: ["dsh-kinich-settings__section", className].filter(Boolean).join(" "),
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SectionHeader, { title, description }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsh-kinich-settings__section-body", children })
		]
	});
}

export function KinichSettingsRow({ settings, t }) {
	const snapshot = useKinichSettings(settings);
	const value = snapshot.value ?? DEFAULT_KINICH_SETTINGS;
	const [pending, setPending] = (0, react.useState)(null);
	const [failed, setFailed] = (0, react.useState)(false);

	const updateMany = async (label, patch) => {
		setPending(label);
		setFailed(false);
		try {
			for (const [field, next] of Object.entries(patch)) await settings.set(field, next);
		} catch {
			setFailed(true);
		} finally {
			setPending(null);
		}
	};
	const update = (field, next) => updateMany(field, { [field]: next });
	const disabled = !snapshot.writable || pending !== null;
	const stateLabel = (active) => t(active ? "state.on" : "state.off");
	const preset = activePreset(value);
	const ajawAtDefault = value.ajawPosition.x === DEFAULT_KINICH_SETTINGS.ajawPosition.x &&
		value.ajawPosition.y === DEFAULT_KINICH_SETTINGS.ajawPosition.y &&
		value.ajawRotation === DEFAULT_KINICH_SETTINGS.ajawRotation &&
		value.ajawFlipped === DEFAULT_KINICH_SETTINGS.ajawFlipped;

	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
		className: "dsh-kinich-settings",
		"aria-labelledby": "dsh-kinich-settings-title",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-kinich-settings__hero",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-kinich-settings__heading",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-settings__kicker", children: "NATLAN // UI LAYER" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-kinich-settings__title-row",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsh-kinich-settings__title", id: "dsh-kinich-settings-title", children: t("title") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-settings__version", children: "v0.9.1" })
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsh-kinich-settings__description", children: t("description") })
						]
					}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThemePreview, { value, t })
			]
			}),

			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-kinich-settings__panel dsh-kinich-settings__panel--presets",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SectionHeader, { eyebrow: "01", title: t("preset.label"), description: t("preset.description") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetCards, {
						disabled,
						onChange: (next) => updateMany(`preset:${next}`, KINICH_VISUAL_PRESETS[next]),
						options: [
							{ value: "jungle", label: t("preset.jungle"), description: t("preset.jungle.description") },
							{ value: "phlogiston", label: t("preset.phlogiston"), description: t("preset.phlogiston.description") },
							{ value: "sunlit", label: t("preset.sunlit"), description: t("preset.sunlit.description") }
						],
						value: preset
					}),
					preset === "custom" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsh-kinich-settings__hint", children: t("preset.custom") })
				]
			}),

			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingSection, {
				title: t("visualIntensity.section"),
				description: t("visualIntensity.description"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChoiceGroup, {
					disabled, label: t("visualIntensity.label"),
					onChange: (next) => update("visualIntensity", next),
					options: [
						{ value: "minimal", label: t("visualIntensity.minimal") },
						{ value: "balanced", label: t("visualIntensity.balanced") },
						{ value: "immersive", label: t("visualIntensity.immersive") }
					],
					value: value.visualIntensity
				})
			}),

			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingSection, {
				title: t("character.section"),
				description: t("character.section.description"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, {
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, {
							checked: value.showCharacter,
							description: t("character.description"),
							disabled,
							label: t("character.label"),
							onChange: () => update("showCharacter", !value.showCharacter),
							stateLabel: stateLabel(value.showCharacter)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-kinich-settings__subgroup",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChoiceGroup, {
									disabled: disabled || !value.showCharacter,
									label: t("character.position"),
									onChange: (next) => update("characterPosition", next),
									options: [
										{ value: "corner", label: t("character.position.corner"), preview: "corner" },
										{ value: "edge", label: t("character.position.edge"), preview: "edge" }
									],
									value: value.characterPosition
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChoiceGroup, {
									disabled: disabled || !value.showCharacter,
									label: t("character.opacity"),
									onChange: (next) => update("characterOpacity", next),
									options: [
										{ value: "low", label: t("character.opacity.low") },
										{ value: "medium", label: t("character.opacity.medium") },
										{ value: "high", label: t("character.opacity.high") }
									],
									value: value.characterOpacity
								})
							]
						})
					]
				})
			}),

			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingSection, {
				title: t("ajaw.section"),
				description: t("ajaw.section.description"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, {
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, {
							checked: value.animateAjaw,
							description: t("ajaw.description"),
							disabled,
							label: t("ajaw.label"),
							onChange: () => update("animateAjaw", !value.animateAjaw),
							stateLabel: stateLabel(value.animateAjaw)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-kinich-settings__subgroup",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RangeControl, {
									disabled: disabled || !value.animateAjaw,
									label: t("ajaw.rotation"), max: 360, min: 0,
									onCommit: (next) => update("ajawRotation", next), suffix: "°", value: value.ajawRotation
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChoiceGroup, {
									disabled: disabled || !value.animateAjaw,
									label: t("ajaw.flip"),
									onChange: (next) => update("ajawFlipped", next === "flipped"),
									options: [
										{ value: "normal", label: t("ajaw.flip.normal") },
										{ value: "flipped", label: t("ajaw.flip.flipped") }
									],
									value: value.ajawFlipped ? "flipped" : "normal"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-kinich-settings__actions",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-settings__microcopy", children: t("ajaw.interaction") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
									disabled: disabled || ajawAtDefault,
									label: t("ajaw.reset"),
									onClick: () => updateMany("ajaw-reset", {
										ajawPosition: DEFAULT_KINICH_SETTINGS.ajawPosition,
										ajawRotation: DEFAULT_KINICH_SETTINGS.ajawRotation,
										ajawFlipped: DEFAULT_KINICH_SETTINGS.ajawFlipped
									})
								})
							]
						})
					]
				})
			}),

			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingSection, {
				title: t("environment.section"),
				description: t("environment.section.description"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, {
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, {
							checked: value.ambientMotion, description: t("ambientMotion.description"), disabled,
							label: t("ambientMotion.label"), onChange: () => update("ambientMotion", !value.ambientMotion), stateLabel: stateLabel(value.ambientMotion)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, {
							checked: value.showOrnament, description: t("ornament.description"), disabled,
							label: t("ornament.label"), onChange: () => update("showOrnament", !value.showOrnament), stateLabel: stateLabel(value.showOrnament)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-kinich-settings__subgroup dsh-kinich-settings__subgroup--single",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChoiceGroup, {
								disabled: disabled || !value.showOrnament, label: t("ornament.intensity"),
								onChange: (next) => update("ornamentIntensity", next),
								options: [{ value: "soft", label: t("intensity.soft") }, { value: "standard", label: t("intensity.standard") }],
								value: value.ornamentIntensity
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, {
							checked: value.showTexture, description: t("texture.description"), disabled,
							label: t("texture.label"), onChange: () => update("showTexture", !value.showTexture), stateLabel: stateLabel(value.showTexture)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dsh-kinich-settings__subgroup dsh-kinich-settings__subgroup--single",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChoiceGroup, {
								disabled: disabled || !value.showTexture, label: t("texture.intensity"),
								onChange: (next) => update("textureIntensity", next),
								options: [{ value: "soft", label: t("intensity.soft") }, { value: "standard", label: t("intensity.standard") }],
								value: value.textureIntensity
							})
						})
					]
				})
			}),

			!snapshot.writable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsh-kinich-settings__hint", children: t("state.unavailable") }),
			failed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { "aria-live": "polite", className: "dsh-kinich-settings__error", children: t("state.error") })
		]
	});
}
