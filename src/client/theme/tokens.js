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
	"--dsw-alias-bg-base": token("#F7F8EC", "#0B1210"),
	"--dsw-alias-bg-layer-1": token("#FEFFF9", "#121C17"),
	"--dsw-alias-bg-layer-2": token("#EEF3DD", "#18251E"),
	"--dsw-alias-bg-layer-3": token("#E4ECCB", "#213027"),
	"--dsw-alias-bg-overlay": token("#FAFBF1", "#293A2D"),
	"--dsw-alias-bg-module-platform": token("#EAF0D7", "#142119"),
	"--dsw-alias-bg-multi-select": token("#E3ECC8", "#1E3024"),
	"--dsw-alias-bg-skeleton": token("rgba(50, 76, 25, 0.08)", "rgba(214, 255, 96, 0.08)"),
	"--dsw-alias-bg-mask-drop": token("rgba(244, 246, 232, 0.78)", "rgba(10, 16, 12, 0.78)"),
	"--dsw-alias-border-l1": token("rgba(49, 70, 26, 0.10)", "rgba(201, 255, 92, 0.08)"),
	"--dsw-alias-border-l2-darkmode-thin": token("rgba(49, 70, 26, 0.14)", "rgba(201, 255, 92, 0.10)"),
	"--dsw-alias-border-l2": token("rgba(49, 70, 26, 0.18)", "rgba(201, 255, 92, 0.14)"),
	"--dsw-alias-border-l3": token("rgba(49, 70, 26, 0.26)", "rgba(201, 255, 92, 0.20)"),
	"--dsw-alias-border-l4": token("rgba(49, 70, 26, 0.34)", "rgba(201, 255, 92, 0.28)"),
	"--dsw-alias-brand-primary": token("#3F6F22", "#B6F252"),
	"--dsw-alias-brand-primary-invert": token("#C9F06B", "#24351B"),
	"--dsw-alias-brand-primary-new-colorprimary-new-color": token("#5E8F28", "#A7E548"),
	"--dsw-alias-brand-text": token("#315F18", "#C5F56A"),
	"--dsw-alias-button-primary-fill": token("#3F6F22", "#B6F252"),
	"--dsw-alias-button-primary-hover": token("#315A19", "#C8FF68"),
	"--dsw-alias-button-primary-dimmed": token("#DCE8BE", "#344528"),
	"--dsw-alias-button-info-fill": token("#477A13", "#4F741B"),
	"--dsw-alias-button-info-hover": token("#3D6810", "#5C8122"),
	"--dsw-alias-button-elevated-fill": token("#FEFFF9", "#26372B"),
	"--dsw-alias-button-floating-fill": token("#FBFCF3", "#1A2820"),
	"--dsw-alias-button-floating-hover": token("#E9F0D7", "#283A2D"),
	"--dsw-alias-button-ghost-active-border": token("#78964D", "#8EBB48"),
	"--dsw-alias-button-ghost-active-fill": token("#DFE9C8", "#32432C"),
	"--dsw-alias-button-ghost-active-hover": token("#D3E0B7", "#3C5032"),
	"--dsw-alias-interactive-bg-hover": token("rgba(83, 116, 32, 0.10)", "rgba(190, 245, 87, 0.08)"),
	"--dsw-alias-interactive-bg-hover-accent": token("rgba(83, 116, 32, 0.18)", "rgba(190, 245, 87, 0.16)"),
	"--dsw-alias-interactive-bg-active": token("rgba(83, 116, 32, 0.22)", "rgba(190, 245, 87, 0.20)"),
	"--dsw-alias-interactive-bg-hover-solid": token("#E1EAC6", "#2A3A2C"),
	"--dsw-alias-label-primary": token("#202919", "#F2F6E9"),
	"--dsw-alias-label-secondary": token("#4D5C3E", "#C5CEB6"),
	"--dsw-alias-label-tertiary": token("#667457", "#A7B49B"),
	"--dsw-alias-label-caption": token("#788468", "#899881"),
	"--dsw-alias-label-dimmed": token("#A7AF9B", "#52604C"),
	"--dsw-alias-label-primary-dimmed": token("#35402D", "#DCE4D3"),
	"--dsw-alias-label-primary-foreground": token("#FFFFFF", "#14200F"),
	"--dsw-alias-label-primary-inverted": token("#F7F8EA", "#172019"),
	"--dsw-alias-label-primary-bluish": token("#315F18", "#D4FA83"),
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
	"--dsw-alias-state-business-primary": token("#4C781F", "#B2EE53"),
	"--dsw-alias-state-business-tertiary": token("#DFEBC5", "#2B3F27"),
	"--dsw-alias-state-success-primary": token("#3D7A25", "#8DD865"),
	"--dsw-alias-state-success-secondary": token("#66A23F", "#6BB94D"),
	"--dsw-alias-state-success-tertiary": token("#E0EED3", "#203A24"),
	"--dsw-alias-state-warn-label": token("#9A4D00", "#FFC76E"),
	"--dsw-alias-state-warn-primary": token("#C46B08", "#F5AE4B"),
	"--dsw-alias-state-warn-secondary": token("#E59A30", "#D9902C"),
	"--dsw-alias-state-warn-tertiary": token("#F7E7C7", "#49321A"),
	"--dsw-alias-state-error-primary": token("#C83B32", "#FF8175"),
	"--dsw-alias-state-error-secondary": token("#E46B61", "#E96B62"),
	"--dsw-alias-toast-bg": token("#25331F", "#34452F"),
	"--dsw-alias-tooltip-bg": token("#1D2A18", "#3A4B35"),
	"--dsw-specific-bubble": token("#E4ECCC", "#1B2A20"),
	"--dsw-specific-bubble-highlight": token("#CFE89B", "#344C2E"),
	"--dsw-specific-input-major": token("#FFFFFA", "#15251C"),
	"--dsw-specific-login-input": token("#F1F5E2", "#0F1A14"),
	"--dsw-specific-menu": token("#E4ECCB", "#213027"),
	"--dsw-specific-selector": token("#E8EFD4", "#23362A"),
	"--dsw-specific-sidebar-fill": token("#EAF0D2", "#101E17"),
	"--dsw-specific-sidebar-nav-item-active-accent": token("#D0F078", "#3F612D"),
	"--dsw-specific-sidebar-nav-item-active": token("#DFEAC0", "#29402D"),
	"--dsw-specific-sidebar-nav-item-hover": token("#E0E9C8", "#1B2D22"),
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

export function getKinichThemeTokens(style) {
	return KINICH_THEME_PRESETS[style] ?? JUNGLE_TOKENS;
}
