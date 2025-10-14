const tokenizeBold = (input: string): string => {
	return input.replace(/(\*\*|__)(?=\S)(.+?[*_]*)(?<=\S)\1/g, "<b>$2</b>");
};

const tokenizeStrikethrough = (input: string): string => {
	return input.replace(/~~(?=\S)([^\n]*?\S)~~/g, "<s>$1</s>");
};

const tokenizeItalics = (input: string): string => {
	return input.replace(/(\*|_)(?=\S)(.+?)(?<=\S)\1/g, "<i>$2</i>");
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
	// Matches %% comment %% blocks (multiline-safe, ignores escaped %%)
	return input.replace(/(?<!\\)%%([\s\S]*?)(?<!\\)%%/g, (_, comment) => {
		// Trim surrounding spaces/newlines inside the comment
		const cleaned = comment.trim();

		// Escape HTML-sensitive characters inside comments for safety
		const safe = cleaned;
		// Wrap as valid HTML comment token
		return `<!-- ${safe} -->`;
	});
};

const tokenizeTables = (input: string): string => {
	// Match tables: header | separator | body rows
	const tableRegex =
		/((?:\|[^\n]+\|\r?\n)+\|(?:\s*[-:]+\s*\|)+\r?\n(?:\|[^\n]+\|\r?\n?)*)/g;

	return input.replace(tableRegex, (match) => {
		// Split into lines
		const lines = match.trim().split(/\r?\n/);
		if (lines.length < 2) return match;

		// Header row (remove leading/trailing pipes, split by "|")
		const headers = lines[0]
			.trim()
			.replace(/^\||\|$/g, "")
			.split("|")
			.map((h) => h.trim());

		// Body rows (skip 2nd line = separator)
		const bodyRows = lines.slice(2).map((line) =>
			line
				.trim()
				.replace(/^\||\|$/g, "")
				.split("|")
				.map((cell) => cell.trim())
		);

		// Build HTML table
		const headerHTML =
			"<tr>" + headers.map((h) => `<th>${h}</th>`).join("") + "</tr>";
		const bodyHTML = bodyRows
			.map(
				(row) =>
					"<tr>" +
					row.map((cell) => `<td>${cell}</td>`).join("") +
					"</tr>"
			)
			.join("");

		return `<table>${headerHTML}${bodyHTML}</table>`;
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
];
