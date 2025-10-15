const tokenizeBold = (input: string): string => {
	return input.replace(/(\*\*|__)(?=\S)(.+?[*_]*)(?<=\S)\1/g, "<b>$2</b>");
};

const tokenizeStrikethrough = (input: string): string => {
	return input.replace(/~~(?=\S)([^\n]*?\S)~~/g, "<s>$1</s>");
};

const tokenizeItalics = (input: string): string => {
	return input.replace(
		/(?<!<[^>]*)\*(?=\S)(.+?)(?<=\S)\*(?![^<]*>)/g,
		"<i>$1</i>"
	);
};

const tokenizeInlineCode = (input: string): string => {
	return input.replace(/(?<!\\)`([^`\n]+?)`/g, "<code>$1</code>");
};

const tokenizeCodeBlock = (input: string): string => {
	return input.replace(
		/```([\s\S]*?)```/g,
		(_, code) => `<pre>${code.trim()}</pre>`
	);
};

const tokenizeSpoilers = (input: string): string => {
	return input.replace(
		/(?<!\\)\|\|([\s\S]*?)(?<!\\)\|\|/g,
		"<tg-spoiler>$1</tg-spoiler>"
	);
};

const tokenizeUnderline = (input: string): string => {
	return input;
};

const tokenizeLinks = (input: string): string => {
	return input.replace(
		/\[([^\]]+)\]\((https?:\/\/[^\s)]+)(?:\s+"([^"]+)")?\)/g,
		(_, text, url, title) => {
			if (!/^https?:\/\/[^\s)]+$/i.test(url)) return text;

			const safeText = text
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;");
			const safeUrl = url.replace(/"/g, "&quot;");
			const safeTitle = title
				? ` title="${title.replace(/"/g, "&quot;")}"`
				: "";

			return `<a href="${safeUrl}"${safeTitle}>${safeText}</a>`;
		}
	);
};

const tokenizeComments = (input: string): string => {
	// Remove %%comments%% and any surrounding blank lines or spaces
	return input.replace(/^[ \t]*%%[\s\S]*?%%[ \t]*(\r?\n)?/gm, "");
};

const tokenizeBlockquote = (input: string): string => {
	return input.replace(
		/(^>[\s\S]+?(?=(?:\n{2,}|$)))/gm, // match consecutive quote lines until double line break or EOF
		(block) => {
			const content = block
				.replace(/^>\s?/gm, "") // remove leading >
				.trim();
			return `<blockquote>${content}</blockquote>`;
		}
	);
};

const tokenizeTables = (input: string): string => {
	return input.replace(/((?:^\|.*\|\s*\n)+)(?=(?:\n|$))/gm, (match) => {
		// clean and escape content
		const codeContent = match
			.trimEnd()
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");

		// wrap in pre/code tags
		return `<pre><code>${codeContent}</code></pre>\n`;
	});
};

export const tokenizeMethods = [
	tokenizeLinks,
	tokenizeBold,
	tokenizeStrikethrough,
	tokenizeItalics,
	tokenizeUnderline,
	tokenizeTables,
	tokenizeComments,
	tokenizeInlineCode,
	tokenizeCodeBlock,
	tokenizeSpoilers,
	tokenizeBlockquote,
];
