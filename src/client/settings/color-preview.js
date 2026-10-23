import { createElement as h } from "react";

/** A read-only colour sample drawn from the same emitted tokens as the live theme. */
export function ThemeColorPreview({ tokens, t, className }) {
	return h("section", { className, "aria-label": t("preview.colors") }, ["light", "dark"].map(mode => {
		const value = key => tokens[key][mode];
		return h("div", {
			key: mode, className: `${className}__scheme`, "data-color-scheme": mode,
			style: {
				"--preview-bg": value("--dsw-alias-bg-layer-1"),
				"--preview-text": value("--dsw-alias-label-primary"),
				"--preview-muted": value("--dsw-alias-label-secondary"),
				"--preview-bubble": value("--dsw-specific-bubble"),
				"--preview-fill": value("--dsw-alias-button-primary-fill"),
				"--preview-on-fill": value("--dsw-alias-label-primary-foreground")
			}
		}, [
			h("strong", { key: "mode" }, t(`preview.${mode}`)),
			h("p", { key: "message", className: `${className}__message` }, t("preview.message")),
			h("div", { key: "footer", className: `${className}__footer` }, [
				h("span", { key: "caption", className: `${className}__caption` }, t("preview.caption")),
				h("span", { key: "action", className: `${className}__action` }, t("preview.action"))
			])
		]);
	}));
}
