export function resolveStoredFormat(rawFormat: unknown): "html" | "md" | undefined {
	return rawFormat === "html" || rawFormat === "md" ? rawFormat : undefined;
}
