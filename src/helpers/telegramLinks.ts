/**
 * Extracts the message id from a Telegram post link:
 * `https://t.me/<channel>/<id>` or `https://t.me/c/<internal id>/<id>`.
 * Returns null when the link is not a post link.
 */
export function parsePostMessageId(link: string): number | null {
	const match = link.trim().match(/^https?:\/\/t\.me\/(?:c\/\d+|[^/\s]+)\/(\d+)/);
	return match ? parseInt(match[1], 10) : null;
}

/** Returns an error message for an invalid channel identifier, or undefined if valid. */
export function validateChannelUsername(value: string): string | undefined {
	return /^(@?[A-Za-z]\w{4,}|-100\d+)$/.test(value.trim())
		? undefined
		: "Use '@channel_name' or a numeric ID starting with -100";
}

/** Normalizes a channel identifier into a Bot API chat_id. */
export function channelChatId(username: string): string {
	const value = username.trim();
	return value.startsWith("@") || value.startsWith("-100") ? value : `@${value}`;
}

/** Builds the public t.me link of a message posted to the channel. */
export function channelPostUrl(username: string, messageId: number | undefined): string {
	const chatId = channelChatId(username);
	if (chatId.startsWith("-100")) {
		return `https://t.me/c/${chatId.substring(4)}/${messageId}`;
	}
	return `https://t.me/${chatId.substring(1)}/${messageId}`;
}
