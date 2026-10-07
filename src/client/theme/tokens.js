import { deriveKinichAccentPalette } from "../background/palette.js";

function token(light, dark) {
	return Object.freeze({
		light,
		dark
	});
}
/**
* Kinich-inspired semantic palette for both DSH base color schemes.
*
* The day palette uses pale leaf/parchment surfaces with forest-green actions.
* The night palette uses deep jungle surfaces with a luminous lime accent.
* Warm amber is reserved for warnings and later phlogiston decorations so it
* remains meaningful instead of becoming a competing primary color.
*/
const JUNGLE_TOKENS = Object.freeze({
	"--dsw-alias-bg-base": token("#EFF3EA", "#0B1514"),
	"--dsw-alias-bg-layer-1": token("#F8FAF3", "#101E1B"),
	"--dsw-alias-bg-layer-2": token("#E4ECE3", "#142622"),
	"--dsw-alias-bg-layer-3": token("#D6E3DA", "#1B302A"),
	"--dsw-alias-bg-overlay": token("#F7F9F2", "#18302B"),
	"--dsw-alias-bg-module-platform": token("#E5EDE5", "#132420"),
	"--dsw-alias-bg-multi-select": token("#E0E8D8", "#23342B"),
	"--dsw-alias-bg-skeleton": token("rgba(54, 79, 55, 0.08)", "rgba(197, 232, 108, 0.08)"),
	"--dsw-alias-bg-mask-drop": token("rgba(241, 242, 233, 0.80)", "rgba(9, 16, 13, 0.82)"),
	"--dsw-alias-border-l1": token("rgba(45, 70, 50, 0.10)", "rgba(52, 73, 60, 0.62)"),
	"--dsw-alias-border-l2-darkmode-thin": token("rgba(45, 70, 50, 0.15)", "rgba(52, 73, 60, 0.78)"),
	"--dsw-alias-border-l2": token("rgba(45, 70, 50, 0.20)", "#34493C"),
	"--dsw-alias-border-l3": token("rgba(45, 70, 50, 0.28)", "#466050"),
	"--dsw-alias-border-l4": token("rgba(45, 70, 50, 0.38)", "#587463"),
	"--dsw-alias-brand-primary": token("#5F8124", "#C8EC62"),
	"--dsw-alias-brand-primary-invert": token("#E2EDC0", "#14211B"),
	"--dsw-alias-brand-primary-new-colorprimary-new-color": token("#247F73", "#C8EC62"),
	"--dsw-alias-brand-text": token("#506F1D", "#D8F47D"),
	"--dsw-alias-button-primary-fill": token("#5F8124", "#C8EC62"),
	"--dsw-alias-button-primary-hover": token("#506F1D", "#D8F47D"),
	"--dsw-alias-button-primary-dimmed": token("#DCE6C1", "#34452A"),
	"--dsw-alias-button-info-fill": token("#477A13", "#4F741B"),
	"--dsw-alias-button-info-hover": token("#3D6810", "#5C8122"),
	"--dsw-alias-button-elevated-fill": token("#FAFBF4", "#23342B"),
	"--dsw-alias-button-floating-fill": token("#F7F8F1", "#192720"),
	"--dsw-alias-button-floating-hover": token("#E9EEE2", "#2B3E33"),
	"--dsw-alias-button-ghost-active-border": token("#78964D", "#8EBB48"),
	"--dsw-alias-button-ghost-active-fill": token("#DFE9C8", "#32432C"),
	"--dsw-alias-button-ghost-active-hover": token("#D3E0B7", "#3C5032"),
	"--dsw-alias-interactive-bg-hover": token("rgba(83, 116, 32, 0.10)", "rgba(190, 245, 87, 0.08)"),
	"--dsw-alias-interactive-bg-hover-accent": token("rgba(83, 116, 32, 0.18)", "rgba(190, 245, 87, 0.16)"),
	"--dsw-alias-interactive-bg-active": token("rgba(83, 116, 32, 0.22)", "rgba(190, 245, 87, 0.20)"),
	"--dsw-alias-interactive-bg-hover-solid": token("#E1EAC6", "#2A3A2C"),
	"--dsw-alias-label-primary": token("#142522", "#EAEBDD"),
	"--dsw-alias-label-secondary": token("#4C605B", "#A9BBB5"),
	"--dsw-alias-label-tertiary": token("#536761", "#829A92"),
	"--dsw-alias-label-caption": token("#5D6B60", "#8F9F94"),
	"--dsw-alias-label-dimmed": token("#ABB3A7", "#536159"),
	"--dsw-alias-label-primary-dimmed": token("#344138", "#D4D9D0"),
	"--dsw-alias-label-primary-foreground": token("#FFFFFF", "#18220D"),
	"--dsw-alias-label-primary-inverted": token("#F4F5EC", "#101A17"),
	"--dsw-alias-label-primary-bluish": token("#4E7121", "#D4F27E"),
	"--dsw-alias-markdown-citation": token("#DCE7BE", "#2D402A"),
	"--dsw-alias-markdown-code-block": token("#E8EDD8", "#101A15"),
	"--dsw-alias-markdown-code-block-banner": token("#DDE6C2", "#1A281E"),
	"--dsw-alias-markdown-code-segment-selected": token("#F8F9F1", "#26372A"),
	"--dsw-alias-markdown-code-segment-unselected": token("#D6DFB9", "#142019"),
	"--dsw-alias-markdown-inline-code": token("#E1E8CB", "#26352A"),
	"--dsw-alias-markdown-placeholder": token("#EDF0E1", "#1B2820"),
	"--dsw-alias-markdown-tag": token("#DCE7BE", "#2A3D28"),
	"--dsw-alias-scrollbar-bg-l1": token("#B7C49F", "#3B4A3D"),
	"--dsw-alias-scrollbar-bg-l2": token("#AAB993", "#475A49"),
	"--dsw-alias-scrollbar-hover-l1": token("#91A176", "#596D59"),
	"--dsw-alias-scrollbar-hover-l2": token("#819268", "#688168"),
	"--dsw-alias-state-business-primary": token("#557A24", "#C5E86C"),
	"--dsw-alias-state-business-tertiary": token("#E0E9C8", "#2D422A"),
	"--dsw-alias-state-success-primary": token("#3D7A25", "#8DD865"),
	"--dsw-alias-state-success-secondary": token("#66A23F", "#6BB94D"),
	"--dsw-alias-state-success-tertiary": token("#E0EED3", "#203A24"),
	"--dsw-alias-state-warn-label": token("#825F23", "#D9C28B"),
	"--dsw-alias-state-warn-primary": token("#967331", "#BEAA7A"),
	"--dsw-alias-state-warn-secondary": token("#B38B3E", "#A99462"),
	"--dsw-alias-state-warn-tertiary": token("#F2E8D0", "#3A3222"),
	"--dsw-alias-state-error-primary": token("#C4554C", "#FFB2A7"),
	"--dsw-alias-state-error-secondary": token("#DA756B", "#D97A69"),
	"--dsw-alias-toast-bg": token("#25331F", "#34452F"),
	"--dsw-alias-tooltip-bg": token("#1D2A18", "#3A4B35"),
	"--dsw-specific-bubble": token("#E4ECCC", "#1B2A20"),
	"--dsw-specific-bubble-highlight": token("#CFE89B", "#344C2E"),
	"--dsw-specific-input-major": token("#FFFFFA", "#15251C"),
	"--dsw-specific-login-input": token("#F1F5E2", "#0F1A14"),
	"--dsw-specific-menu": token("#E4ECCB", "#213027"),
	"--dsw-specific-selector": token("#E8EFD4", "#23362A"),
	"--dsw-specific-sidebar-fill": token("#E1EAE3", "#0D1A18"),
	"--dsw-specific-sidebar-nav-item-active-accent": token("#C8E96F", "#356255"),
	"--dsw-specific-sidebar-nav-item-active": token("#D7E5D8", "#18302A"),
	"--dsw-specific-sidebar-nav-item-hover": token("#DDE8E0", "#132622"),
	"--dsw-specific-tip": token("#E8EFD5", "#1E3024")
});


const PHLOGISTON_TOKENS = Object.freeze({
	...JUNGLE_TOKENS,
	"--dsw-alias-bg-base": token("#171A13", "#090B08"),
	"--dsw-alias-bg-layer-1": token("#20251A", "#10130D"),
	"--dsw-alias-bg-layer-2": token("#272E1E", "#171C12"),
	"--dsw-alias-bg-layer-3": token("#303924", "#1D2517"),
	"--dsw-alias-bg-overlay": token("#22281C", "#252C1D"),
	"--dsw-alias-bg-module-platform": token("#252C1C", "#12170F"),
	"--dsw-specific-sidebar-fill": token("#141910", "#0B100B"),
	"--dsw-specific-sidebar-nav-item-active": token("#33411F", "#243119"),
	"--dsw-specific-sidebar-nav-item-active-accent": token("#D7FF5B", "#CEFF58"),
	"--dsw-specific-sidebar-nav-item-hover": token("#252E1B", "#172015"),
	"--dsw-alias-brand-primary": token("#D6F34B", "#D7FF56"),
	"--dsw-alias-brand-primary-invert": token("#20250E", "#1A210C"),
	"--dsw-alias-brand-text": token("#DDF86A", "#E5FF77"),
	"--dsw-alias-button-primary-fill": token("#D7F34E", "#D7FF56"),
	"--dsw-alias-button-primary-hover": token("#E5FF74", "#E9FF82"),
	"--dsw-alias-button-primary-dimmed": token("#4D5528", "#374020"),
	"--dsw-alias-label-primary": token("#F2F3E8", "#F5F7EC"),
	"--dsw-alias-label-secondary": token("#C6CAB8", "#CED3C0"),
	"--dsw-alias-label-tertiary": token("#9EA58D", "#A6AE95"),
	"--dsw-alias-label-primary-foreground": token("#171B0D", "#11150A"),
	"--dsw-alias-state-business-primary": token("#D1F14B", "#D5FF58"),
	"--dsw-alias-state-business-tertiary": token("#3B4724", "#2B391D"),
	"--dsw-alias-state-warn-primary": token("#FF9F2F", "#FFB24A"),
	"--dsw-alias-state-warn-tertiary": token("#56391E", "#422B18"),
	"--dsw-specific-bubble": token("#252C1B", "#182016"),
	"--dsw-specific-bubble-highlight": token("#3B4B20", "#30431F"),
	"--dsw-specific-input-major": token("#1E2418", "#111810"),
	"--dsw-specific-selector": token("#29321D", "#202B1A")
});

const SUNLIT_TOKENS = Object.freeze({
	...JUNGLE_TOKENS,
	"--dsw-alias-bg-base": token("#FFF9EA", "#14140F"),
	"--dsw-alias-bg-layer-1": token("#FFFCF3", "#1A1B14"),
	"--dsw-alias-bg-layer-2": token("#F8EFD7", "#23241A"),
	"--dsw-alias-bg-layer-3": token("#F1E4C5", "#2B2A1D"),
	"--dsw-alias-bg-overlay": token("#FFF8E8", "#302F22"),
	"--dsw-alias-bg-module-platform": token("#F8EBCB", "#1F2117"),
	"--dsw-specific-sidebar-fill": token("#F8E9C7", "#171A12"),
	"--dsw-specific-sidebar-nav-item-active": token("#F1DFAE", "#29321F"),
	"--dsw-specific-sidebar-nav-item-active-accent": token("#6A8A28", "#B7E765"),
	"--dsw-specific-sidebar-nav-item-hover": token("#F5E7C4", "#20261A"),
	"--dsw-alias-brand-primary": token("#668426", "#B9EA63"),
	"--dsw-alias-brand-primary-invert": token("#F3D98B", "#2B321D"),
	"--dsw-alias-brand-text": token("#5B7720", "#C7F27A"),
	"--dsw-alias-button-primary-fill": token("#668426", "#B9EA63"),
	"--dsw-alias-button-primary-hover": token("#55731D", "#C9F77A"),
	"--dsw-alias-button-primary-dimmed": token("#E8DDBD", "#3A402B"),
	"--dsw-alias-label-primary": token("#342E20", "#F3F0DF"),
	"--dsw-alias-label-secondary": token("#625A47", "#CBC7B3"),
	"--dsw-alias-label-tertiary": token("#837A64", "#A6A18E"),
	"--dsw-alias-state-business-primary": token("#708F2B", "#BCEB6B"),
	"--dsw-alias-state-business-tertiary": token("#EEE2BD", "#313C25"),
	"--dsw-alias-state-warn-primary": token("#B8751F", "#EFB75A"),
	"--dsw-specific-bubble": token("#F3E7C8", "#24291D"),
	"--dsw-specific-bubble-highlight": token("#E9D79D", "#344126"),
	"--dsw-specific-input-major": token("#FFFDF6", "#1B2117"),
	"--dsw-specific-selector": token("#F3E4BD", "#2A3322")
});

export const KINICH_THEME_PRESETS = Object.freeze({
	jungle: JUNGLE_TOKENS,
	phlogiston: PHLOGISTON_TOKENS,
	sunlit: SUNLIT_TOKENS
});

export const KINICH_THEME_TOKENS = JUNGLE_TOKENS;
export const KINICH_THEME_SOURCE = "dsh-kinich-theme";

const BACKGROUND_SURFACE_ALPHA = Object.freeze({
	"--dsw-alias-bg-base": { from: [0.48, 0.40], to: [0.20, 0.16] },
	"--dsw-alias-bg-layer-1": { from: [0.94, 0.92], to: [0.50, 0.44] },
	"--dsw-alias-bg-layer-2": { from: [0.96, 0.94], to: [0.56, 0.50] },
	"--dsw-alias-bg-layer-3": { from: [0.97, 0.96], to: [0.62, 0.56] },
	"--dsw-alias-bg-overlay": { from: [0.98, 0.97], to: [0.68, 0.62] },
	"--dsw-alias-bg-module-platform": { from: [0.95, 0.93], to: [0.56, 0.50] },
	"--dsw-alias-bg-multi-select": { from: [0.94, 0.92], to: [0.52, 0.46] },
	"--dsw-specific-sidebar-fill": { from: [0.88, 0.85], to: [0.45, 0.40] },
	"--dsw-specific-bubble": { from: [0.96, 0.94], to: [0.60, 0.54] },
	"--dsw-specific-bubble-highlight": { from: [0.94, 0.92], to: [0.56, 0.50] },
	"--dsw-specific-menu": { from: [0.98, 0.97], to: [0.72, 0.66] },
	"--dsw-specific-selector": { from: [0.96, 0.94], to: [0.60, 0.54] }
});

function rgba(value, alpha) {
	const hex = /^#([\da-f]{6})$/i.exec(value);
	if (hex) {
		const color = hex[1];
		const red = Number.parseInt(color.slice(0, 2), 16);
		const green = Number.parseInt(color.slice(2, 4), 16);
		const blue = Number.parseInt(color.slice(4, 6), 16);
		return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
	}
	const existing = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(value);
	if (!existing) return value;
	const oldAlpha = existing[4] === undefined ? 1 : Number(existing[4]);
	return `rgba(${existing[1]}, ${existing[2]}, ${existing[3]}, ${alpha * oldAlpha})`;
}

function transparentSurface(value, alpha) {
	return token(rgba(value.light, alpha[0]), rgba(value.dark, alpha[1]));
}

function surfaceAlpha(pair, visibility) {
	const amount = Math.min(100, Math.max(0, visibility)) / 100;
	return pair.from.map((value, index) => Number((value + (pair.to[index] - value) * amount).toFixed(3)));
}

export function getKinichAccentPalette(style, accentHex) {
	const base = KINICH_THEME_PRESETS[style] ?? JUNGLE_TOKENS;
	const surfaces = base["--dsw-alias-bg-layer-1"];
	return deriveKinichAccentPalette(accentHex, surfaces.light, surfaces.dark);
}

export function getKinichThemeTokens(style, accentHex = "", customBackground = false, backgroundVisibility = 75) {
	const base = KINICH_THEME_PRESETS[style] ?? JUNGLE_TOKENS;
	if (!accentHex && !customBackground) return base;
	const result = { ...base };
	if (customBackground) {
		const safeVisibility = typeof backgroundVisibility === "number" && Number.isFinite(backgroundVisibility)
			? backgroundVisibility : 75;
		for (const [key, alpha] of Object.entries(BACKGROUND_SURFACE_ALPHA)) {
			if (result[key]) result[key] = transparentSurface(result[key], surfaceAlpha(alpha, safeVisibility));
		}
	}
	if (accentHex) {
		const palette = getKinichAccentPalette(style, accentHex);
		if (palette) {
			result["--dsw-alias-brand-primary"] = token(palette.light, palette.dark);
			result["--dsw-alias-brand-primary-invert"] = token(palette.foregroundLight, palette.foregroundDark);
			result["--dsw-alias-brand-text"] = token(palette.strongLight, palette.strongDark);
			result["--dsw-alias-button-primary-fill"] = token(palette.light, palette.dark);
			result["--dsw-alias-button-primary-hover"] = token(palette.strongLight, palette.strongDark);
			result["--dsw-alias-button-primary-dimmed"] = token(rgba(palette.light, 0.22), rgba(palette.dark, 0.24));
			result["--dsw-specific-sidebar-nav-item-active-accent"] = token(palette.light, palette.dark);
			result["--dsw-alias-state-business-primary"] = token(palette.light, palette.dark);
			if (result["--dsw-alias-state-business-secondary"]) {
				result["--dsw-alias-state-business-secondary"] = token(palette.strongLight, palette.strongDark);
			}
		}
	}
	return Object.freeze(result);
}
