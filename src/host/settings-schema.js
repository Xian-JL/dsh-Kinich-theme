import z from "@deepseek-ai/schemastery";
import { KINICH_SETTING_DEFINITIONS } from "../shared/settings.js";

function schemaFor(definition) {
	switch (definition.kind) {
		case "boolean":
			return z.boolean().default(definition.default);
		case "number":
			return z.number().min(definition.min).max(definition.max).step(definition.step ?? 1).default(definition.default);
		case "choice":
			return z.union([...definition.options]).default(definition.default);
		case "position":
			return z.object({
				x: z.number().min(definition.min).max(definition.max).default(definition.default.x),
				y: z.number().min(definition.min).max(definition.max).default(definition.default.y)
			}).default(definition.default);
		default:
			throw new TypeError(`Unsupported Kinich setting kind: ${definition.kind}`);
	}
}

/** Host-side schema is derived from the shared setting definition table. */
export const KinichThemeSettingsSchema = z.object(Object.fromEntries(
	Object.entries(KINICH_SETTING_DEFINITIONS).map(([key, definition]) => [key, schemaFor(definition)])
));
