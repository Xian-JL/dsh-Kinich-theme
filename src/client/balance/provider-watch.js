import { refreshBalanceForCredentialChange } from "./balance-store.js";

/** Invalidate any previous-account display after the official key form changes. */
export function watchDeepSeekBalanceProvider(ctx, refresh = refreshBalanceForCredentialChange) {
	const forms = ctx.get?.("configForms");
	if (!forms) return () => {};
	const provider = forms.get("llm-deepseek-api-key");
	let previous = provider.getSnapshot();
	let initialized = previous?.status !== "loading";
	return provider.subscribe(() => {
		const next = provider.getSnapshot();
		if (next?.status === "loading") return;
		if (!initialized) { initialized = true; previous = next; return; }
		const changed = next?.revision !== previous?.revision || next?.status !== previous?.status;
		previous = next;
		if (changed) void refresh();
	});
}
