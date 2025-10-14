const detokenizeBold = (input: string): string =>
	input.replace(/<b>(.*?)<\/b>/g, (_, inner) => `*${(inner)}*`);

const detokenizeItalics = (input: string): string =>
	input.replace(/<i>(.*?)<\/i>/g, (_, inner) => `_${inner}_`);

const detokenizeStrikethrough = (input: string): string =>
	input.replace(/<s>(.*?)<\/s>/g, (_, inner) => `~${inner}~`);

const detokenizeUnderline = (input: string): string =>
	input.replace(/<u>(.*?)<\/u>/g, (_, inner) => `__${inner}__`);

const detokenizeLinks = (input: string): string =>
	input.replace(
		/<a href="(https?:\/\/[^"]+)"(?: title="([^"]*)")?>(.*?)<\/a>/g,
		(_, url, title, text) => {
			// Escape only parentheses in URL
			const safeUrl = url.replace(/\(/g, "\\(").replace(/\)/g, "\\)");
			return `[${text}](${safeUrl})`;
		}
	);

const detokenizeTables = (input: string): string => {
	return input.replace(/<table>([\s\S]*?)<\/table>/g, (_, inner) => {
		// Extract text from <th> and <td> tags
		const rows = [...inner.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(
			(m) => m[1]
		);
		const tableText = rows
			.map((row) =>
				[...row.matchAll(/<(?:th|td)>(.*?)<\/(?:th|td)>/g)]
					.map((m) => m[1])
					.join(" | ")
			)
			.join("\n");

		// Escape MarkdownV2 symbols
		const safe = tableText.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
		return `\`\`\`\n${safe}\n\`\`\``; // render as code block
	});
};

const detokenizeComments = (input: string): string => {
	// Remove HTML comment blocks (<!-- ... -->)
	// + any surrounding blank lines or leading newline for cleaner layout
	return (
		input
			// Remove the comment and an optional newline before/after
			.replace(/(^\s*\n)?<!--[\s\S]*?-->(\s*\n)?/g, "")
			// Collapse multiple blank lines left after removal
			.replace(/\n{3,}/g, "\n\n")
			.trimEnd()
	);
};

export const detokenizeMethods = [
	detokenizeLinks,
	detokenizeItalics,
	detokenizeBold,
	detokenizeStrikethrough,
	detokenizeUnderline,
	detokenizeTables,
	detokenizeComments,
];
