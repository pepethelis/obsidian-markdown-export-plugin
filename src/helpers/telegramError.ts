/**
 * Extracts a human-readable reason from a failed Telegram Bot API response.
 * The API answers errors with `{ ok: false, error_code, description }`; anything
 * else (proxy pages, empty bodies) falls back to the HTTP status.
 */
export function describeTelegramError(status: number, bodyText: string): string {
	try {
		const json = JSON.parse(bodyText) as { description?: unknown };
		if (typeof json.description === "string" && json.description.trim()) {
			return json.description.trim();
		}
	} catch {
		// not JSON — fall through
	}
	return `HTTP ${status}`;
}
