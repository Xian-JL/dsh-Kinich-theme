export function isBelowCnyThreshold(value) {
	if (value?.currency !== "CNY" || typeof value.totalBalance !== "string") return false;
	const normalized = value.totalBalance.trim();
	if (!/^\d+(?:\.\d+)?$/.test(normalized)) return false;
	const [whole] = normalized.split(".");
	const canonical = whole.replace(/^0+(?=\d)/, "");
	return canonical.length < 2 || canonical.length === 2 && canonical < "10";
}
