export interface PostRef {
	/** Bot API chat_id: `@username` or `-100…`. */
	chatId: string;
	messageId: number;
}

/**
 * Parses a Telegram post link into the chat and message it points to:
 * `https://t.me/<channel>/<id>` → `@channel`, `https://t.me/c/<internal id>/<id>` → `-100<internal id>`.
 * Returns null when the link is not a post link.
 */
export function parsePostLink(link: string): PostRef | null {
	const value = link.trim();
	const privateMatch = value.match(/^https?:\/\/t\.me\/c\/(\d+)\/(\d+)/);
	if (privateMatch) {
		return { chatId: `-100${privateMatch[1]}`, messageId: parseInt(privateMatch[2], 10) };
	}
	const publicMatch = value.match(/^https?:\/\/t\.me\/([A-Za-z]\w+)\/(\d+)/);
	if (publicMatch) {
		return { chatId: `@${publicMatch[1]}`, messageId: parseInt(publicMatch[2], 10) };
	}
	return null;
}

/** Whether two Bot API chat ids refer to the same chat (usernames are case-insensitive). */
export function sameChat(a: string, b: string): boolean {
	return a.trim().toLowerCase() === b.trim().toLowerCase();
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
