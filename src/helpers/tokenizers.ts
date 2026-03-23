const tokenizeHeaders = (input: string): string => {
	return input.replace(
		/^(#{1,6})\s{1,}(.+)$/gm,
		(_, hashes, text) => `<b>${text.trim()}</b>\n`,
	);
};

const tokenizeBulletedLists = (input: string): string => {
	// no changes actually needed for bulleted lists
	return input;
};

const tokenizeNumberedLists = (input: string): string => {
	// no changes actually needed for numbered lists
	return input;
};

const tokenizeCheckboxes = (input: string): string => {
	return input.replace(
		/^(\s*)- \[( |x)\] /gm,
		(_, indent, checked) => `${indent}${checked === "x" ? "☑️" : "⏹️"} `,
	);
};

const tokenizeBold = (input: string): string => {
	return input.replace(/(\*\*|__)(?=\S)(.+?[*_]*)(?<=\S)\1/g, "<b>$2</b>");
};

const tokenizeStrikethrough = (input: string): string => {
	return input.replace(/~~(?=\S)([^\n]*?\S)~~/g, "<s>$1</s>");
};

const tokenizeItalics = (input: string): string => {
	return input.replace(
		/(?<!<[^>]*)\*(?=\S)(.+?)(?<=\S)\*(?![^<]*>)/g,
		"<i>$1</i>",
	);
};

const tokenizeInlineCode = (input: string): string => {
	return input.replace(/(?<!\\)`([^`\n]+?)`/g, "<code>$1</code>");
};

const tokenizeCodeBlock = (input: string): string => {
	return input.replace(
		/```([\s\S]*?)```/g,
		(_, code) => `<pre>${code.trim()}</pre>`,
	);
};

const tokenizeSpoilers = (input: string): string => {
	return input.replace(
		/(?<!\\)\|\|([\s\S]*?)(?<!\\)\|\|/g,
		"<tg-spoiler>$1</tg-spoiler>",
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
		},
	);
};

const tokenizeComments = (input: string): string => {
	// Remove %%comments%% and any surrounding blank lines or spaces
	return input.replace(/^[ \t]*%%[\s\S]*?%%[ \t]*(\r?\n)?/gm, "");
};

const tokenizeBlockquote = (input: string): string => {
	return input.replace(
		// Match blockquote header and all following lines starting with '> '
		/^>\s?(.*)(?:\n((?:>\s?.*(?:\n|$))*))/gm,
		(_, firstLine, contentLines) => {
			// Clean up the content lines: remove leading '> ' and trim
			const content = [
				firstLine,
				...(contentLines ? contentLines.match(/^>\s?.*/gm) || [] : []),
			]
				.map((line) => line.replace(/^>\s?/, "").trim())
				.join("\n")
				.trim();
			return `<blockquote>${content}</blockquote>`;
		},
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

const tokenizeCallouts = (input: string): string => {
	enum CalloutTypes {
		Note = "note",
		Abstract = "abstract",
		Info = "info",
		Todo = "todo",
		Tip = "tip",
		Success = "success",
		Question = "question",
		Warning = "warning",
		Failure = "failure",
		Danger = "danger",
		Bug = "bug",
		Example = "example",
		Quote = "quote",
	}

	interface CalloutCollection {
		[key: string]: string[];
	}

	const known_callouts: CalloutCollection = {
		[CalloutTypes.Note]: ["note"],
		[CalloutTypes.Abstract]: ["abstract", "summary", "tldr"],
		[CalloutTypes.Info]: ["info"],
		[CalloutTypes.Todo]: ["todo"],
		[CalloutTypes.Tip]: ["tip", "hint", "important"],
		[CalloutTypes.Success]: ["success", "check", "done"],
		[CalloutTypes.Question]: ["question", "help", "faq"],
		[CalloutTypes.Warning]: ["warning", "caution", "attention"],
		[CalloutTypes.Failure]: ["failure", "fail", "missing"],
		[CalloutTypes.Danger]: ["danger", "error"],
		[CalloutTypes.Bug]: ["bug"],
		[CalloutTypes.Example]: ["example"],
		[CalloutTypes.Quote]: ["quote", "cite"],
	};

	const callount_icons = {
		[CalloutTypes.Note]: "🗒️",
		[CalloutTypes.Abstract]: "📝",
		[CalloutTypes.Info]: "ℹ️",
		[CalloutTypes.Todo]: "📝",
		[CalloutTypes.Tip]: "💡",
		[CalloutTypes.Success]: "✅",
		[CalloutTypes.Question]: "❓",
		[CalloutTypes.Warning]: "⚠️",
		[CalloutTypes.Failure]: "❌",
		[CalloutTypes.Danger]: "‼️",
		[CalloutTypes.Bug]: "🐛",
		[CalloutTypes.Example]: "📌",
		[CalloutTypes.Quote]: "💬",
	};

	return input.replace(
		// Match callout header and all following lines starting with '> '
		/^> \[!(\w+)\](\+)?\s*(.*)(?:\n((?:> .*(?:\n|$))*))?/gm,
		(_, type, _plus, firstLine, contentLines: string) => {
			const typeKey = type.toLowerCase();
			let canonicalType = Object.keys(known_callouts).find((key) =>
				known_callouts[key].includes(typeKey),
			) as CalloutTypes | undefined;
			if (!canonicalType) canonicalType = CalloutTypes.Note;
			const icon = callount_icons[canonicalType] || "";
			const title =
				firstLine && firstLine.trim().length > 0
					? firstLine.trim()
					: canonicalType.charAt(0).toUpperCase() +
						canonicalType.slice(1);
			// Only include lines that start with '> '
			const content = contentLines
				? (contentLines.match(/^> .*/gm) || [])
						.map((line) => line.replace(/^> /, "").trim())
						.join("\n")
						.trim()
				: "";
			return `<blockquote>${icon} <b>${title}</b>\n${content}${content ? "\n" : ""}</blockquote>`;
		},
	);
};

export const tokenizeMethods = [
	tokenizeHeaders,
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
	tokenizeBulletedLists,
	tokenizeNumberedLists,
	tokenizeCheckboxes,
	tokenizeCallouts,
	tokenizeBlockquote,
];
