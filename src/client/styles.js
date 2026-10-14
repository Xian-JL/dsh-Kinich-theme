import { KINICH_STYLE_TEXT } from "./styles.generated.js";

export const KINICH_STYLE_ID = "dsh-kinich-theme/enhanced-layer.css";

/** Mount the authored stylesheet for exactly this plugin fiber's lifetime. */
		export function installKinichStyles(ctx) {
			if (typeof document === "undefined") return;
			ctx.effect(() => {
				// Hot replacement may mount before the old fiber disposes. Each fiber owns its tag.
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-kinich-theme";
				tag.dataset.pluginCss = KINICH_STYLE_ID;
				tag.textContent = KINICH_STYLE_TEXT;
				document.head.appendChild(tag);
				return () => tag.remove();
			}, "dsh-kinich-theme: enhanced layer stylesheet");
		}
