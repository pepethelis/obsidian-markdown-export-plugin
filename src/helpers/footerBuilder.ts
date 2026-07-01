import { MyPluginSettings, ExportOptions } from "../types";
import { escapeHtmlPreserveEntities } from "./escapers";

type LinkBuilder = (url: string, text: string) => string;

const htmlLink: LinkBuilder = (url, text) =>
	`<a href="${url.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">${escapeHtmlPreserveEntities(text)}</a>`;

const mdLink: LinkBuilder = (url, text) =>
	`[${text.replace(/\]/g, "\\]")}](${url})`;

export function buildFooterFromItems(
	options: ExportOptions,
	brandLabel: string,
	settings: MyPluginSettings,
): string {
	const { format } = options;
	const linkFn: LinkBuilder = format === "html" ? htmlLink : mdLink;
	const sectionSep = format === "html" ? "\n" : "\n\n";
	const parts: string[] = [];

	if (options.brandRelated.enabled && brandLabel) {
		const links = options.brandRelated.items
			.filter((i) => i.enabled)
			.map((i) => linkFn(i.url, i.name));
		if (links.length > 0) {
			const label =
				format === "html"
					? escapeHtmlPreserveEntities(brandLabel)
					: brandLabel;
			parts.push(`Більше ${label}: ${links.join(", ")}`);
		}
	}

	if (options.tasteRelated.enabled) {
		const links = options.tasteRelated.items
			.filter((i) => i.enabled)
			.map((i) => linkFn(i.url, i.name));
		if (links.length > 0) {
			parts.push(`Схожий смак: ${links.join(", ")}`);
		}
	}

	if (options.manualRelated.enabled) {
		const links = options.manualRelated.items
			.filter((i) => i.enabled)
			.map((i) => linkFn(i.url, i.name));
		if (links.length > 0) {
			parts.push(`Пов'язані огляди: ${links.join(", ")}`);
		}
	}

	const hasHashtag = options.includeHashtag && !!settings.finalHashtag;

	if (parts.length === 0 && !hasHashtag) return "";

	if (format === "md") {
		if (hasHashtag) {
			const escaped = settings.finalHashtag.replace(/^#/, "\\#");
			if (parts.length > 0) {
				parts[parts.length - 1] += `\n\n${escaped}`;
			} else {
				parts.push(escaped);
			}
		}
		parts.unshift("\n---\n");
	} else {
		if (hasHashtag) {
			parts.push(escapeHtmlPreserveEntities(settings.finalHashtag));
		}
	}

	return "\n\n" + parts.join(sectionSep);
}
