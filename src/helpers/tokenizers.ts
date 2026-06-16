import { PiplineMethodParams } from "../types";
import { escapeHtmlPreserveEntities } from "./escapers";

const tokenizeHeaders: PiplineMethodParams = (params) => {
	const { input } = params;

	return input.replace(
		/^(#{1,6})\s{1,}(.+)$/gm,
		(_, hashes, text) => `\n<b>${text.trim()}</b>`,
	);
};

const tokenizeBulletedLists: PiplineMethodParams = (params) => {
	const { input } = params;

	return input;
};

const tokenizeNumberedLists: PiplineMethodParams = (params) => {
	const { input } = params;

	return input;
};

const tokenizeCheckboxes: PiplineMethodParams = (params) => {
	const { input } = params;
	return input.replace(
		/^(\s*)- \[( |x)\] /gm,
		(_, indent, checked) => `${indent}${checked === "x" ? "☑️" : "⏹️"} `,
	);
};

const tokenizeBold: PiplineMethodParams = (params) => {
	const { input } = params;
	return input.replace(/(\*\*|__)(?=\S)(.+?[*_]*)(?<=\S)\1/g, "<b>$2</b>");
};

const tokenizeStrikethrough: PiplineMethodParams = (params) => {
	const { input } = params;
	return input.replace(/~~(?=\S)([^\n]*?\S)~~/g, "<s>$1</s>");
};

const tokenizeItalics: PiplineMethodParams = (params) => {
	const { input } = params;
	return input.replace(
		/(?<!<[^>]*)\*(?=\S)(.+?)(?<=\S)\*(?![^<]*>)/g,
		"<i>$1</i>",
	);
};

const tokenizeMarked: PiplineMethodParams = (params) => {
	const { input } = params;

	return input.replace(/==(?=\S)(.+?)(?<=\S)==/g, "<b>$1</b>");
};

const tokenizeInlineCode: PiplineMethodParams = (params) => {
	const { input } = params;
	return input.replace(/(?<!\\)`([^`\n]+?)`/g, "<code>$1</code>");
};

const tokenizeCodeBlock: PiplineMethodParams = (params) => {
	const { input } = params;
	return input.replace(
		/```([\s\S]*?)```/g,
		(_, code) => `<pre>${code.trim()}</pre>`,
	);
};

const tokenizeSpoilers: PiplineMethodParams = (params) => {
	const { input } = params;
	return input.replace(
		/(?<!\\)\|\|([\s\S]*?)(?<!\\)\|\|/g,
		"<tg-spoiler>$1</tg-spoiler>",
	);
};

const tokenizeUnderline: PiplineMethodParams = (params) => {
	const { input } = params;
	return input;
};

const tokenizeLinks: PiplineMethodParams = (params) => {
	const { input } = params;
	return input.replace(
		/\[([^\]]+)\]\((https?:\/\/[^\s)]+)(?:\s+"([^"]+)")?\)/g,
		(_, text, url, title) => {
			if (!/^https?:\/\/[^\s)]+$/i.test(url)) return text;

			const safeText = escapeHtmlPreserveEntities(text);
			const safeUrl = escapeHtmlPreserveEntities(url).replace(
				/"/g,
				"&quot;",
			);
			const safeTitle = title
				? ` title="${title.replace(/"/g, "&quot;")}"`
				: "";

			return `<a href="${safeUrl}"${safeTitle}>${safeText}</a>`;
		},
	);
};

const tokenizeComments: PiplineMethodParams = (params) => {
	const { input } = params;
	// Remove %%comments%% and any surrounding blank lines or spaces
	return input.replace(/^[ \t]*%%[\s\S]*?%%[ \t]*(\r?\n)?/gm, "");
};

const tokenizeBlockquote: PiplineMethodParams = (params) => {
	const { input } = params;
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
const tokenizeDivider: PiplineMethodParams = (params) => {
	const { input } = params;

	return input.replace(/^\s*([-*_]){3,}\s*$/gm, "-----");
};

const tokenizeTables: PiplineMethodParams = (params) => {
	const { input } = params;

	return input.replace(/((?:^\|.*\|\s*\n)+)(?=(?:\n|$))/gm, (match) => {
		// clean and escape content
		const codeContent = escapeHtmlPreserveEntities(match.trimEnd());

		// wrap in pre/code tags
		return `<pre><code>${codeContent}</code></pre>\n`;
	});
};

const tokenizeCallouts: PiplineMethodParams = (params) => {
	const { input } = params;
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
	tokenizeMarked,
	tokenizeStrikethrough,
	tokenizeItalics,
	tokenizeUnderline,
	tokenizeDivider,
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
