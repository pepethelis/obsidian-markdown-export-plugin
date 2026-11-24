/**
 * Extracts the message id from a Telegram post link:
 * `https://t.me/<channel>/<id>` or `https://t.me/c/<internal id>/<id>`.
 * Returns null when the link is not a post link.
 */
export function parsePostMessageId(link: string): number | null {
	const match = link.trim().match(/^https?:\/\/t\.me\/(?:c\/\d+|[^/\s]+)\/(\d+)/);
	return match ? parseInt(match[1], 10) : null;
}
