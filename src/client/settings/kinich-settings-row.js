import * as react from "react";
import * as react_jsx_runtime from "react/jsx-runtime";
import { AJAW_MARK_DATA_URI, KINICH_CHARACTER_DATA_URI } from "../assets.generated.js";
import { PLUGIN_VERSION } from "../version.generated.js";
import { DEFAULT_KINICH_SETTINGS } from "../../shared/settings.js";
import { useKinichSettings } from "../hooks/use-kinich-settings.js";
import { writeKinichSettings } from "./write.js";
import { ActionButton, ChoiceGroup, RangeControl, SectionHeader, Toggle } from "./controls.js";
import { useBalance } from "../balance/use-balance.js";
import { getBalanceRetryMinutes } from "../balance/policy.js";
import { normalizeKinichBackgroundFile, KinichBackgroundError } from "../background/image.js";
import { useKinichWallpaper } from "../wallpaper/use-wallpaper.js";
import { wallpaperAssetUrl } from "../../shared/wallpaper.js";
import { WallpaperBundleBuilder } from "../wallpaper/bundle-builder.js";
import { wallpaperElementCount } from "../../shared/wallpaper.js";
import { normalizeKinichStaticWallpaperImage } from "../wallpaper/image.js";

const SETTING_LABEL_KEYS = {
	visualStyle: "style.jungle.label", visualIntensity: "visualIntensity.label",
	animateAjaw: "ajaw.label", ajawPosition: "ajaw.position", ajawRotation: "ajaw.rotation",
	ajawFlipped: "ajaw.flip", "ajaw-reset": "ajaw.reset", showCharacter: "character.label",
	"custom-background": "background.section",
	backgroundAutoPalette: "background.autoPalette.label",
	dynamicWallpaperEnabled: "wallpaper.enabled",
	backgroundVisibility: "background.visibility.label",
	characterPosition: "character.position", characterOpacity: "character.opacity",
	ambientMotion: "ambientMotion.label", showOrnament: "ornament.label",
	ornamentIntensity: "ornament.intensity", showTexture: "texture.label",
	textureIntensity: "texture.intensity"
};

function settingBalanceAmount(balance) {
	if (typeof balance.totalBalance !== "string") return "—";
	return `${balance.currency === "CNY" ? "¥" : balance.currency === "USD" ? "$" : `${balance.currency ?? ""} `}${balance.totalBalance}`;
}

function ThemePreview({ value, t }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "dsh-kinich-live-preview",
		"data-character": String(value.showCharacter),
		"data-intensity": value.visualIntensity,
		"data-position": value.characterPosition,
		"data-custom-background": String(Boolean(value.customBackgroundImage)),
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-kinich-live-preview__copy",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-live-preview__eyebrow", children: t("preview.eyebrow") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t(`style.${value.visualStyle}.label`) }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(`style.${value.visualStyle}.tagline`) })
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-kinich-live-preview__stage",
				children: [
					value.customBackgroundImage && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						alt: "",
						className: "dsh-kinich-live-preview__background",
						src: value.customBackgroundImage
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-live-preview__grid" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", { alt: "", className: "dsh-kinich-live-preview__character-image", src: KINICH_CHARACTER_DATA_URI }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", { alt: "", className: "dsh-kinich-live-preview__ajaw", src: AJAW_MARK_DATA_URI })
				]
			})
		]
	});
}

function SettingSection({ eyebrow, title, description, children, className = "" }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
		className: ["dsh-kinich-settings__section", className].filter(Boolean).join(" "),
		id: eyebrow ? `dsh-kinich-settings-section-${eyebrow}` : undefined,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SectionHeader, { eyebrow, title, description }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsh-kinich-settings__section-body", children })
		]
	});
}

function MoreControls({ label, children }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
		className: "dsh-kinich-settings__details",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: label }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsh-kinich-settings__details-body", children })
		]
	});
}

function BalanceMonitorPreview({ t }) {
	const balance = useBalance();
	const statusKey = `balance.status.${balance.status ?? "unavailable"}`;
	const retryMinutes = getBalanceRetryMinutes(balance);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "dsh-kinich-balance-setting",
		"data-overheated": String(balance.overheated === true),
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { className: "dsh-kinich-balance-setting__heading", children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { className: "dsh-kinich-balance-setting__provider", children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { "aria-hidden": "true", className: "dsh-kinich-balance-setting__diamond" }),
					t("balance.provider")
				] }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-balance-setting__badge", children: t(balance.status === "ready" && !balance.stale ? "balance.live.badge" : "balance.unavailable.badge") })
			] }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { className: "dsh-kinich-balance-setting__readout", children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: settingBalanceAmount(balance) }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { "aria-hidden": "true", className: "dsh-kinich-balance-setting__status-dot" }),
					t(statusKey)
				] })
			] }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: retryMinutes !== null ? `${t("balance.retry.before")}${retryMinutes}${t("balance.retry.after")}` : balance.stale && balance.overheated === true ? `${t("balance.stale")} ${t("balance.overheated")}` : balance.stale ? t("balance.stale") : balance.overheated === true ? t("balance.overheated") : t("balance.live") })
		]
	});
}

export function KinichSettingsRow({ settings, t }) {
	const wallpaperText = (key, fallback) => typeof t === "function" ? t(`wallpaper.${key}`) : fallback;
	const snapshot = useKinichSettings(settings);
	const value = snapshot.value ?? DEFAULT_KINICH_SETTINGS;
	const wallpaper = useKinichWallpaper({ dynamicEnabled: Boolean(snapshot.value) && value.dynamicWallpaperEnabled });
	const [pending, setPending] = (0, react.useState)(null);
	const [failed, setFailed] = (0, react.useState)(null);
	const [backgroundProcessing, setBackgroundProcessing] = (0, react.useState)(false);
	const [backgroundMessage, setBackgroundMessage] = (0, react.useState)("");
	const [backgroundError, setBackgroundError] = (0, react.useState)("");
	const [wallpaperError, setWallpaperError] = (0, react.useState)("");
	const [wallpaperMessage, setWallpaperMessage] = (0, react.useState)("");
	const [wallpaperExportParts, setWallpaperExportParts] = (0, react.useState)([]);
	const [wallpaperProcessing, setWallpaperProcessing] = (0, react.useState)(false);
	const backgroundInputRef = (0, react.useRef)(null);
	const wallpaperInputRef = (0, react.useRef)(null);
	const wallpaperArchiveInputRef = (0, react.useRef)(null);

	const updateMany = async (label, patch) => {
		setPending(label);
		setFailed(null);
		try {
			await writeKinichSettings(settings, patch, snapshot.value ?? DEFAULT_KINICH_SETTINGS);
			return true;
		} catch (error) {
			setFailed({ label, patch, partial: error?.partial === true });
			return false;
		} finally {
			setPending(null);
		}
	};
	const handleBackgroundSelection = async event => {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = "";
		if (!file) return;
		setBackgroundProcessing(true);
		setBackgroundError("");
		setBackgroundMessage("");
		try {
			if (wallpaper.current) {
				await importStaticWallpaper(file);
				setBackgroundMessage(t("background.saved"));
				return;
			}
			const optimized = await normalizeKinichBackgroundFile(file);
			const saved = await updateMany("custom-background", {
				customBackgroundImage: optimized.dataUrl,
				customBackgroundAccent: optimized.accent ?? ""
			});
			if (saved) setBackgroundMessage(t("background.saved"));
		} catch (error) {
			const key = error instanceof KinichBackgroundError ? `background.error.${error.code}` : "background.error.invalid-image";
			setBackgroundError(t(key));
		} finally {
			setBackgroundProcessing(false);
		}
	};
	const importStaticWallpaper = async file => {
		const image = await normalizeKinichStaticWallpaperImage(file);
		const asset = await wallpaper.upload(image.blob, "static-webp-v1");
		const name = "本地壁纸";
		const pack = await wallpaper.uploadBundle({ schemaVersion: 1, id: `local-${asset.sha256.slice(0, 20)}`, version: "1", name, sampledAccent: image.accent ?? "", representativeAssetId: asset.sha256,
			projects: [{ id: "local-image", title: name, headline: name, assetIds: [asset.sha256], coverId: asset.sha256, heroId: asset.sha256 }] });
		await wallpaper.apply({ mode: "static", bundleHash: pack.bundleHash, projectId: "local-image", templateId: "work", parameters: wallpaper.committedCurrent.active.parameters, autoPalette: true, paletteCaptured: true, reason: "import-static" });
	};
	const handleWallpaperSelection = async event => {
		const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (!file) return;
		setWallpaperProcessing(true); setWallpaperError("");
		try {
			await importStaticWallpaper(file);
		} catch (error) { setWallpaperError(error.message || "壁纸素材未能导入"); }
		finally { setWallpaperProcessing(false); }
	};
	const handleWallpaperArchive = async event => {
		const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ""; if (!files.length) return;
		setWallpaperProcessing(true); setWallpaperError(""); setWallpaperMessage("");
		try {
			let imported = 0; let result;
			for (const file of files) { result = await wallpaper.importArchive(file); imported += result.imported; if (result.staged) setWallpaperMessage(`${wallpaperText("volume.pending", "分卷已暂存")} ${result.received}/${result.total}。${wallpaperText("volume.incomplete", "全部分卷到齐后才会合并历史；当前壁纸保持不变。")}`); }
			if (result?.staged) setWallpaperMessage(`${wallpaperText("volume.pending", "分卷已暂存")} ${result.received}/${result.total}。${wallpaperText("volume.incomplete", "全部分卷到齐后才会合并历史；当前壁纸保持不变。")}`);
			else setWallpaperMessage(`${wallpaperText("import.done", "备份包已处理；当前壁纸保持不变。")} ${files.length} · ${imported}`);
		}
		catch (error) { setWallpaperError(error.message || "壁纸包导入失败"); }
		finally { setWallpaperProcessing(false); }
	};
	const downloadWallpaperPart = async part => {
		const anchor = document.createElement("a"); anchor.href = part.href; anchor.download = part.filename; anchor.rel = "noreferrer";
		document.body.appendChild(anchor); anchor.click(); anchor.remove();
	};
	const downloadWallpaperArchive = async (scope, hash = "") => {
		setWallpaperError(""); setWallpaperExportParts([]);
		try {
			const plan = await wallpaper.exportPlan(scope, hash); const stamp = Date.now();
			const parts = plan.volumes.map(volume => ({ index: volume.index, total: plan.volumes.length,
				label: plan.volumes.length === 1 ? wallpaperText("volume.download", "下载备份包") : `${wallpaperText("volume.download", "下载分卷")} ${volume.index+1}/${plan.volumes.length}`,
				href: wallpaper.exportUrl(scope, hash, volume.index, plan.datasetId), filename: `kinich-wallpaper-${scope}-${stamp}-part-${volume.index+1}-of-${plan.volumes.length}.kinich-wallpaper.zip` }));
			if (parts.length === 1) await downloadWallpaperPart(parts[0]);
							else { setWallpaperExportParts(parts); setWallpaperMessage(`${parts.length} 卷；${wallpaperText("volume.incomplete", "导入时选择全部分卷后才会合并。")}`); }
		} catch (error) { setWallpaperError(error.message || "壁纸包导出失败"); }
	};
	const update = (field, next) => updateMany(field, { [field]: next });
	const disabled = !snapshot.writable || pending !== null;
	const backgroundDisabled = disabled || backgroundProcessing;
	const wallpaperActive = wallpaper.committedCurrent?.active;
	const staticActive = wallpaperActive?.mode === "static";
	const staticPreview = wallpaper.current ? (staticActive ? wallpaperAssetUrl(wallpaper.current.manifest.representativeAssetId) : "") : value.customBackgroundImage;
	const staticVisibility = wallpaper.current ? wallpaperActive?.parameters.visibility : value.backgroundVisibility;
	const staticAutoPalette = wallpaper.current ? wallpaperActive?.autoPalette : value.backgroundAutoPalette;
	const updateWallpaper = async patch => {
		if (!wallpaperActive || wallpaperActive.mode === "none") return;
		setWallpaperError("");
		try { await wallpaper.apply({ ...wallpaperActive, viewPosition:wallpaperActive.normalizedViewPosition, parameters: { ...wallpaperActive.parameters, ...(patch.parameters ?? {}) }, autoPalette: patch.autoPalette ?? wallpaperActive.autoPalette, reason: "settings" }); return true; }
		catch (error) { setWallpaperError(error.message || "壁纸设置未能保存"); return false; }
	};
	const applyWallpaperBrowse = async () => {
		const project = wallpaper.current?.manifest?.projects?.[wallpaper.page];
		if (!wallpaperActive || wallpaperActive.mode === "none" || !project) return;
		try { await wallpaper.apply({ ...wallpaperActive, projectId: project.id, templateId: wallpaper.view, viewPosition: wallpaper.viewPosition, reason: "browse-apply" }); setWallpaperError(""); }
		catch (error) { setWallpaperError(error.message || "浏览场景未能应用"); }
	};
	const stateLabel = active => t(active ? "state.on" : "state.off");
	const ajawAtDefault = value.ajawPosition.x === DEFAULT_KINICH_SETTINGS.ajawPosition.x &&
		value.ajawPosition.y === DEFAULT_KINICH_SETTINGS.ajawPosition.y &&
		value.ajawRotation === DEFAULT_KINICH_SETTINGS.ajawRotation &&
		value.ajawFlipped === DEFAULT_KINICH_SETTINGS.ajawFlipped;

	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
		className: "dsh-kinich-settings",
		"aria-labelledby": "dsh-kinich-settings-title",
		children: [
			/* @__PURE__ */ (0,react_jsx_runtime.jsx)("nav",{className:"dsh-kinich-settings__navigation","aria-label":wallpaperText("settings.navigation","Kinich 设置分区"),children:[["01",t("visualIntensity.section")],["02",t("ajaw.section")],["03",t("balance.section")],["04",t("environment.section")],["05",t("background.section")],["06",wallpaperText("section","复杂动态壁纸")]].map(([id,label])=>(0,react_jsx_runtime.jsx)("button",{type:"button",onClick:()=>{if(typeof document!=="undefined")document.getElementById(`dsh-kinich-settings-section-${id}`)?.scrollIntoView({block:"start",behavior:"auto"});},children:`${id} ${label}`},id))}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-kinich-settings__hero",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-kinich-settings__heading",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-settings__kicker", children: t("hero.kicker") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-kinich-settings__title-row",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { className: "dsh-kinich-settings__title", id: "dsh-kinich-settings-title", children: t("title") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-settings__version", children: `v${PLUGIN_VERSION}` })
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsh-kinich-settings__description", children: t("description") })
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThemePreview, { value, t })
				]
			}),
			pending !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsh-kinich-settings__pending", role: "status", children: `${t("state.saving")} ${t(SETTING_LABEL_KEYS[pending] ?? "state.setting")}` }),
			failed !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { className: "dsh-kinich-settings__error", role: "alert", children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: failed.partial ? t("state.error.partial") : `${t("state.error.before")}${t(SETTING_LABEL_KEYS[failed.label] ?? "state.setting")}${t("state.error.after")}` }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, { disabled, label: t("state.retry"), onClick: () => updateMany(failed.label, failed.patch) })
			] }),


			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingSection, {
				eyebrow: "01",
				title: t("visualIntensity.section"),
				description: t("visualIntensity.description"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment,{children:[(0,react_jsx_runtime.jsx)(ChoiceGroup,{disabled,label:t("style.label"),value:value.visualStyle,onChange:next=>update("visualStyle",next),options:[{value:"jungle",label:t("style.jungle.label")},{value:"phlogiston",label:t("style.phlogiston.label")},{value:"sunlit",label:t("style.sunlit.label")}]}),(0, react_jsx_runtime.jsx)(ChoiceGroup, {
					disabled,
					label: t("visualIntensity.label"),
					onChange: next => update("visualIntensity", next),
					options: [
						{ value: "minimal", label: t("visualIntensity.minimal") },
						{ value: "balanced", label: t("visualIntensity.balanced") },
						{ value: "immersive", label: t("visualIntensity.immersive") }
					],
					value: value.visualIntensity
				})]})
			}),

			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingSection, {
				eyebrow: "02",
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
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dsh-kinich-settings__microcopy", children: t("ajaw.interaction") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MoreControls, {
							label: t("details.label"),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, {
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RangeControl, {
										disabled: disabled || !value.animateAjaw,
										label: t("ajaw.rotation"),
										max: 360,
										min: 0,
										onCommit: next => update("ajawRotation", next),
										suffix: "°",
										value: value.ajawRotation
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChoiceGroup, {
										disabled: disabled || !value.animateAjaw,
										label: t("ajaw.flip"),
										onChange: next => update("ajawFlipped", next === "flipped"),
										options: [
											{ value: "normal", label: t("ajaw.flip.normal") },
											{ value: "flipped", label: t("ajaw.flip.flipped") }
										],
										value: value.ajawFlipped ? "flipped" : "normal"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dsh-kinich-settings__actions",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
											disabled: disabled || ajawAtDefault,
											label: t("ajaw.reset"),
											onClick: () => updateMany("ajaw-reset", {
												ajawPosition: DEFAULT_KINICH_SETTINGS.ajawPosition,
												ajawRotation: DEFAULT_KINICH_SETTINGS.ajawRotation,
												ajawFlipped: DEFAULT_KINICH_SETTINGS.ajawFlipped
											})
										})
									})
								]
							})
						})
					]
				})
			}),

			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingSection, {
				eyebrow: "03",
				title: t("balance.section"),
				description: t("balance.section.description"),
				className: "dsh-kinich-settings__section--balance",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BalanceMonitorPreview, { t })
			}),

			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingSection, {
				eyebrow: "04",
				title: t("environment.section"),
				description: t("environment.section.description"),
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
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, {
							checked: value.ambientMotion,
							description: t("ambientMotion.description"),
							disabled,
							label: t("ambientMotion.label"),
							onChange: () => update("ambientMotion", !value.ambientMotion),
							stateLabel: stateLabel(value.ambientMotion)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MoreControls, {
							label: t("details.label"),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, {
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { className: "dsh-kinich-settings__subgroup", children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChoiceGroup, {
											disabled: disabled || !value.showCharacter,
											label: t("character.position"),
											onChange: next => update("characterPosition", next),
											options: [
												{ value: "corner", label: t("character.position.corner"), preview: "corner" },
												{ value: "edge", label: t("character.position.edge"), preview: "edge" }
											],
											value: value.characterPosition
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChoiceGroup, {
											disabled: disabled || !value.showCharacter,
											label: t("character.opacity"),
											onChange: next => update("characterOpacity", next),
											options: [
												{ value: "low", label: t("character.opacity.low") },
												{ value: "medium", label: t("character.opacity.medium") },
												{ value: "high", label: t("character.opacity.high") }
											],
											value: value.characterOpacity
										})
									] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, {
										checked: value.showOrnament,
										description: t("ornament.description"),
										disabled,
										label: t("ornament.label"),
										onChange: () => update("showOrnament", !value.showOrnament),
										stateLabel: stateLabel(value.showOrnament)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChoiceGroup, {
										disabled: disabled || !value.showOrnament,
										label: t("ornament.intensity"),
										onChange: next => update("ornamentIntensity", next),
										options: [{ value: "soft", label: t("intensity.soft") }, { value: "standard", label: t("intensity.standard") }],
										value: value.ornamentIntensity
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, {
										checked: value.showTexture,
										description: t("texture.description"),
										disabled,
										label: t("texture.label"),
										onChange: () => update("showTexture", !value.showTexture),
										stateLabel: stateLabel(value.showTexture)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChoiceGroup, {
										disabled: disabled || !value.showTexture,
										label: t("texture.intensity"),
										onChange: next => update("textureIntensity", next),
										options: [{ value: "soft", label: t("intensity.soft") }, { value: "standard", label: t("intensity.standard") }],
										value: value.textureIntensity
									})
								]
							})
						})
					]
				})
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingSection, {
				eyebrow: "05",
				title: t("background.section"),
				description: t("background.description"),
				className: "dsh-kinich-settings__section--background",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-kinich-background-control",
					children: [
						staticPreview && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
							alt: "",
							className: "dsh-kinich-background-control__preview",
							src: staticPreview
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							accept: "image/png,image/jpeg,image/webp",
							className: "dsh-kinich-background-control__file",
						disabled: backgroundDisabled,
							onChange: handleBackgroundSelection,
							ref: backgroundInputRef,
							type: "file"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-kinich-settings__actions",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
									disabled: backgroundDisabled,
									label: backgroundProcessing ? t("background.processing") : t(staticPreview ? "background.replace" : "background.choose"),
									onClick: () => backgroundInputRef.current?.click(),
									tone: "accent"
								}),
								staticPreview && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, {
									disabled: backgroundDisabled,
									label: t("background.reset"),
									onClick: async () => {
										setBackgroundError("");
										if (wallpaper.current) {
											try { await wallpaper.apply({ mode: "none", parameters: wallpaperActive.parameters, autoPalette: wallpaperActive.autoPalette, reason: "clear-static" }); setBackgroundMessage(t("background.resetDone")); }
											catch (error) { setBackgroundError(error.message); }
											return;
										}
										setBackgroundMessage(await updateMany("custom-background", {
											customBackgroundImage: "", customBackgroundAccent: "",
											backgroundVisibility: DEFAULT_KINICH_SETTINGS.backgroundVisibility
										}) ? t("background.resetDone") : "");
									},
								}),
							]
						}),
						staticPreview && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RangeControl, {
							disabled: backgroundDisabled,
							label: t("background.visibility.label"),
							max: 100,
							min: 0,
							onCommit: next => wallpaper.current ? updateWallpaper({ parameters: { visibility: next } }) : update("backgroundVisibility", next),
							step: 5,
							suffix: "%",
							value: staticVisibility
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-kinich-background-control__hint",
							children: t("background.visibility.description")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, {
							checked: staticAutoPalette,
							description: t("background.autoPalette.description"),
							disabled: backgroundDisabled || !staticPreview,
							label: t("background.autoPalette.label"),
							onChange: () => wallpaper.current ? updateWallpaper({ autoPalette: !staticAutoPalette }) : update("backgroundAutoPalette", !value.backgroundAutoPalette),
							stateLabel: stateLabel(staticAutoPalette)
						}),
						backgroundMessage && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { className: "dsh-kinich-background-control__status", role: "status", children: backgroundMessage }),
						backgroundError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { className: "dsh-kinich-background-control__error", role: "alert", children: backgroundError })
					]
				})
			}),
			wallpaper.current && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingSection, {
				eyebrow: "06", title: wallpaperText("section", "复杂动态壁纸"), description: wallpaperActive?.mode === "dynamic" ? wallpaper.current.manifest?.name ?? wallpaperText("status.dynamic", "动态壁纸") : wallpaperActive?.mode === "static" ? wallpaperText("status.static", "静态壁纸") : wallpaperText("status.none", "当前未启用壁纸"),
				className: "dsh-kinich-settings__section--wallpaper",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { className: "dsh-kinich-background-control", children: [
					/* @__PURE__ */ (0,react_jsx_runtime.jsx)(Toggle,{checked:value.dynamicWallpaperEnabled,label:wallpaperText("enabled","启用动态壁纸"),description:wallpaperText("enabled.description","关闭后停止动态壁纸显示与播放，保留素材、参数和强调色；静态背景不受影响"),disabled:disabled||wallpaperProcessing,stateLabel:stateLabel(value.dynamicWallpaperEnabled),onChange:()=>update("dynamicWallpaperEnabled",!value.dynamicWallpaperEnabled)}),
					wallpaper.current?.manifest && /* @__PURE__ */ (0,react_jsx_runtime.jsxs)("div",{className:"dsh-kinich-wallpaper-current",children:[(0,react_jsx_runtime.jsx)("img",{alt:"",src:wallpaperAssetUrl(wallpaper.current.manifest.representativeAssetId)}),(0,react_jsx_runtime.jsx)("span",{children:wallpaper.current.manifest.name}),(0,react_jsx_runtime.jsx)("p",{children:`R ${wallpaperActive.parameters.rhythm} · A ${wallpaperActive.parameters.amplitude} · E ${wallpaperActive.parameters.elementDensity} · V ${wallpaperActive.parameters.visibility}`})]}),
					/* @__PURE__ */ (0,react_jsx_runtime.jsx)(WallpaperBundleBuilder,{wallpaper,disabled:!snapshot.writable||wallpaperProcessing,onError:setWallpaperError,onMessage:setWallpaperMessage,t:wallpaperText}),
					wallpaperActive?.mode === "dynamic" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { className: "dsh-kinich-wallpaper-browser", children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, { id: "dsh-kinich-wallpaper-browse-entry", disabled: !value.dynamicWallpaperEnabled, label: wallpaperText(wallpaper.browsing ? "browse.exit" : "browse.enter", wallpaper.browsing ? "退出壁纸浏览" : "进入壁纸浏览"), tone: wallpaper.browsing ? "accent" : "neutral", onClick: () => wallpaper.browsing ? wallpaper.exitBrowse() : wallpaper.enterBrowse() }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, { disabled: !value.dynamicWallpaperEnabled, label: wallpaperText(wallpaper.calibration ? "calibration.end" : "calibration.start", wallpaper.calibration ? "退出参考校准" : "参考校准"), tone: wallpaper.calibration ? "accent" : "neutral", onClick: () => wallpaper.setCalibration(!wallpaper.calibration) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [wallpaperText("template.label", "浏览模板"), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", { value: wallpaper.view, onChange: event => wallpaper.setView(event.currentTarget.value), children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", { value: "work", children: wallpaperText("template.work", "Work 首页") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", { value: "overview", children: wallpaperText("template.overview", "作品总览") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", { value: "detail", children: wallpaperText("template.detail", "项目详情") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", { value: "about", children: wallpaperText("template.about", "About") })
						] })] }),
						wallpaper.view !== "about" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [wallpaperText("project", "项目"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", { value: String(wallpaper.page), onChange: event => wallpaper.setPage(Number(event.currentTarget.value)), children: wallpaper.current.manifest.projects.map((project,index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", { value: String(index), children: `${String(index+1).padStart(2,"0")} · ${project.title}` }, project.id)) })] }),
						wallpaper.view !== "work" && wallpaper.view !== "overview" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RangeControl, { label: wallpaper.view === "detail" ? wallpaperText("position.detail", "详情浏览位置") : wallpaperText("position.about", "About 阅读位置"), min: 0, max: 100, step: 1, suffix: "%", value: Math.round(wallpaper.viewPosition*100), onCommit: next => wallpaper.setViewPosition(next/100) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, { label: wallpaperText("applyView", "应用当前浏览场景"), tone: "accent", disabled: !snapshot.writable, onClick: () => { void applyWallpaperBrowse(); } })
					] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", { ref: wallpaperInputRef, type: "file", accept: "image/png,image/jpeg,image/webp", hidden: true, disabled: !snapshot.writable || wallpaperProcessing, onChange: handleWallpaperSelection }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, { label: wallpaperProcessing ? wallpaperText("importing", "正在导入…") : wallpaperText("importStatic", "导入并应用静态壁纸"), tone: "accent", disabled: !snapshot.writable || wallpaperProcessing, onClick: () => wallpaperInputRef.current?.click() }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", { ref: wallpaperArchiveInputRef, type: "file", accept: ".zip,.kinich-wallpaper.zip,application/zip", multiple: true, hidden: true, disabled: !snapshot.writable || wallpaperProcessing, onChange: handleWallpaperArchive }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, { label: wallpaperText("importArchive", "导入壁纸备份包"), tone: "neutral", disabled: !snapshot.writable || wallpaperProcessing, onClick: () => wallpaperArchiveInputRef.current?.click() }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, { label: wallpaperText("exportCurrent", "导出当前壁纸"), tone: "neutral", disabled: !snapshot.writable || wallpaperProcessing, onClick: () => { void downloadWallpaperArchive("current"); } }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, { label: wallpaperText("exportAll", "导出全部历史与当前"), tone: "neutral", disabled: !snapshot.writable || wallpaperProcessing, onClick: () => { void downloadWallpaperArchive("all"); } }),
					/* @__PURE__ */ (0,react_jsx_runtime.jsx)(ActionButton,{label:wallpaperText("restoreDefault","恢复默认壁纸"),disabled:!snapshot.writable||wallpaperProcessing,onClick:async()=>{try{await wallpaper.restoreDefault();setWallpaperError("");}catch(error){setWallpaperError(error.message);}}}),
					wallpaperActive?.mode!=="none" && /* @__PURE__ */ (0,react_jsx_runtime.jsx)(ActionButton,{label:wallpaperText("resetParameters","参数重置为中等"),disabled:!snapshot.writable||wallpaperProcessing,onClick:()=>updateWallpaper({parameters:{rhythm:50,amplitude:50,elementDensity:50,visibility:50}})}),
					wallpaper.current?.manifest && /* @__PURE__ */ (0,react_jsx_runtime.jsx)("p",{children:`${wallpaperText("availableAssets","可用图像")}: ${wallpaper.current.manifest.assetIds.filter(id=>!wallpaper.current.manifest.fontAssetIds.includes(id)).length} · ${wallpaperText("densityLimit","附加显示上限")}: ${wallpaperElementCount(wallpaperActive.parameters.elementDensity,wallpaper.current.manifest.assetIds.filter(id=>!wallpaper.current.manifest.fontAssetIds.includes(id)).length)}`}),
					wallpaper.history.find(entry => entry.mode === "dynamic" && entry.recoverable) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, { label: wallpaperText("restoreDynamic", "恢复历史动态壁纸"), tone: "neutral", disabled: !snapshot.writable || wallpaperProcessing, onClick: async () => { try { await wallpaper.restore(wallpaper.history.find(entry => entry.mode === "dynamic" && entry.recoverable).hash); } catch (error) { setWallpaperError(error.message); } } }),
					wallpaperActive?.mode && wallpaperActive.mode !== "none" ? [["rhythm",wallpaperText("rhythm","动效节奏")], ["amplitude",wallpaperText("amplitude","变化幅度")], ["elementDensity",wallpaperText("density","元素数量")], ["visibility",wallpaperText("visibility","可见度")]].map(([key,label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RangeControl, { disabled: !snapshot.writable, label, min: 0, max: 100, step: 1, suffix: "%", value: wallpaperActive.parameters[key], scaleLabels:[wallpaperText("scale.none","无"),wallpaperText("scale.medium","中等"),wallpaperText("scale.exaggerated","夸张")], onPreview:next=>wallpaper.previewParameters(next===null?null:{[key]:next}), onCommit: next => updateWallpaper({ parameters: { [key]: next } }) }, key)) : null,
					wallpaperActive?.mode !== "none" && wallpaperActive?.mode && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toggle, { checked: wallpaperActive.autoPalette, description: wallpaperText("autoPalette.description","强调色仅在素材包建立时采集一次"), disabled: !snapshot.writable, label: wallpaperText("autoPalette","自动采集强调色"), onChange: () => updateWallpaper({ autoPalette: !wallpaperActive.autoPalette }), stateLabel: stateLabel(wallpaperActive.autoPalette) }),
					(wallpaperError||wallpaper.error) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { className: "dsh-kinich-settings__error", role: "alert", children: wallpaperError||wallpaper.error }),
					wallpaper.renderError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { className: "dsh-kinich-settings__error", role: "status", children: `${wallpaperText("render.failure","壁纸渲染暂不可用：")}${wallpaper.renderError}` }),
					wallpaper.renderError && /* @__PURE__ */ (0,react_jsx_runtime.jsx)(ActionButton,{label:wallpaperText("render.retry","重试壁纸显示"),disabled:!value.dynamicWallpaperEnabled&&wallpaperActive?.mode==="dynamic",onClick:wallpaper.retryRenderer}),
					wallpaper.status==="error" && /* @__PURE__ */ (0,react_jsx_runtime.jsx)(ActionButton,{label:wallpaperText("retry","重新加载壁纸数据"),onClick:()=>{void wallpaper.retry();}}),
					wallpaperMessage && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { className: "dsh-kinich-background-control__status", role: "status", children: wallpaperMessage }),
					wallpaperExportParts.map(part => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, { label: part.label, tone: "accent", disabled: wallpaperProcessing, onClick: () => { void downloadWallpaperPart(part); } }, part.index)),
					wallpaperActive?.mode !== "none" && wallpaperActive?.mode && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, { label: wallpaperText("removeCurrent","移除当前壁纸"), tone: "neutral", disabled: !snapshot.writable, onClick: async () => { try { await wallpaper.apply({ mode: "none", parameters: wallpaperActive.parameters, autoPalette: wallpaperActive.autoPalette, reason: "remove" }); setWallpaperError(""); } catch (error) { setWallpaperError(error.message); } } }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, { label: wallpaperText("clearHistory","清除历史记录（保留当前壁纸）"), tone: "neutral", disabled: !snapshot.writable || wallpaper.current.historyCount === 0, onClick: async () => { try { await wallpaper.clearHistory(); setWallpaperError(""); } catch (error) { setWallpaperError(error.message); } } }),
					wallpaper.history.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", { className: "dsh-kinich-wallpaper-history", "aria-label": wallpaperText("history.title","壁纸历史记录"), children: wallpaper.history.map(entry => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { className: "dsh-kinich-wallpaper-history__item", children: [
						entry.representativeAssetId && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", { loading: "lazy", alt: "", src: wallpaperAssetUrl(entry.representativeAssetId) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: entry.name }), !entry.recoverable&&(0,react_jsx_runtime.jsx)("span",{className:"dsh-kinich-settings__error",children:wallpaperText("history.unrecoverable","素材或记录损坏，暂不可恢复（保留原记录）")}), /* @__PURE__ */ (0,react_jsx_runtime.jsx)("time",{dateTime:entry.createdAtUtc,children:entry.createdAtUtc?new Date(entry.createdAtUtc).toLocaleString():"—"}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: `${wallpaperText(`status.${entry.mode}`,entry.mode)} · ${wallpaperText("rhythm","动效节奏")} ${entry.parameters?.rhythm ?? "—"} · ${wallpaperText("amplitude","变化幅度")} ${entry.parameters?.amplitude ?? "—"} · ${wallpaperText("density","元素数量")} ${entry.parameters?.elementDensity ?? "—"} · ${wallpaperText("visibility","可见度")} ${entry.parameters?.visibility ?? "—"}` })] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, { label: wallpaperText("history.restore","恢复"), tone: "accent", disabled: !snapshot.writable || !entry.recoverable, onClick: async () => { try { await wallpaper.restore(entry.hash); setWallpaperError(""); } catch (error) { setWallpaperError(error.message); } } }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, { label: wallpaperText("history.export","导出"), tone: "neutral", disabled: !entry.recoverable || wallpaperProcessing, onClick: () => { void downloadWallpaperArchive("history", entry.hash); } }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, { label: wallpaperText("history.delete","删除"), tone: "neutral", disabled: !snapshot.writable, onClick: async () => { try { await wallpaper.deleteHistory(entry.hash); setWallpaperError(""); } catch (error) { setWallpaperError(error.message); } } })
					] }, entry.hash)) }),
					wallpaper.total > wallpaper.history.length && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActionButton, { label: wallpaperText("history.more","加载更多历史"), tone: "neutral", disabled: !snapshot.writable, onClick: () => { void wallpaper.nextHistoryPage().catch(error => setWallpaperError(error.message)); } })
				] })
			}),

			!wallpaper.current&&wallpaper.status==="error"&&/* @__PURE__ */ (0,react_jsx_runtime.jsx)(SettingSection,{eyebrow:"06",title:wallpaperText("section","复杂动态壁纸"),description:wallpaper.error,children:(0,react_jsx_runtime.jsx)(ActionButton,{label:wallpaperText("retry","重新加载壁纸数据"),onClick:()=>{void wallpaper.retry();}})}),

			!snapshot.writable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dsh-kinich-settings__hint", children: t("state.unavailable") })
		]
	});
}
