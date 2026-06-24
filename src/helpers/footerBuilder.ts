import { App, TFile } from "obsidian";
import { MyPluginSettings } from "../types";
import { escapeHtmlPreserveEntities } from "./escapers";

type LinkBuilder = (url: string, text: string) => string;

const htmlLink: LinkBuilder = (url, text) =>
	`<a href="${url}">${escapeHtmlPreserveEntities(text)}</a>`;

const mdLink: LinkBuilder = (url, text) => `[${text}](${url})`;

export function buildFooter(
	app: App,
	file: TFile,
	settings: MyPluginSettings,
	format: "html" | "md" = "html",
): string {
	const { externalLinkField } = settings;
	if (!externalLinkField) return "";

	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	if (!frontmatter) return "";

	const linkFn = format === "html" ? htmlLink : mdLink;
	const sectionSep = format === "html" ? "\n" : "\n\n";
	const parts: string[] = [];

	const brand: string | undefined = frontmatter["brand"];
	if (brand) {
		const brandLinks = getBrandLinks(app, file, brand, externalLinkField, linkFn);
		if (brandLinks.length > 0) {
			const brandLabel =
				format === "html"
					? escapeHtmlPreserveEntities(brand)
					: brand;
			parts.push(`Більше ${brandLabel}: ${brandLinks.join(", ")}`);
		}
	}

	const related: unknown = frontmatter["related"];
	if (related) {
		const relatedLinks = getRelatedLinks(app, file, related, externalLinkField, linkFn);
		if (relatedLinks.length > 0) {
			parts.push(`Пов'язані огляди: ${relatedLinks.join(", ")}`);
		}
	}

	if (parts.length === 0) return "";
	
	if (format === "md") {
		parts.unshift('\n---\n')
		parts[parts.length - 1] += "\n\n\\#огляди";
	} else {
		parts.push("#огляди");
	}

	return "\n\n" + parts.join(sectionSep);
}

function getBrandLinks(
	app: App,
	currentFile: TFile,
	brand: string,
	externalLinkField: string,
	linkFn: LinkBuilder,
): string[] {
	return app.vault
		.getMarkdownFiles()
		.filter((f) => {
			if (f.path === currentFile.path) return false;
			const fm = app.metadataCache.getFileCache(f)?.frontmatter;
			if (!fm || fm["brand"] !== brand) return false;
			const url = fm[externalLinkField];
			return url && typeof url === "string" && url.trim();
		})
		.map((f) => {
			const url =
				app.metadataCache.getFileCache(f)!.frontmatter![externalLinkField];
			return linkFn(url.trim(), f.basename);
		});
}

function getRelatedLinks(
	app: App,
	currentFile: TFile,
	related: unknown,
	externalLinkField: string,
	linkFn: LinkBuilder,
): string[] {
	const items: string[] = Array.isArray(related)
		? related.map(String)
		: [String(related)];

	return items.flatMap((item) => {
		const noteName = item
			.replace(/^\[\[|\]\]$/g, "")
			.split("|")[0]
			.split("#")[0]
			.trim();
		if (!noteName) return [];

		const target = app.metadataCache.getFirstLinkpathDest(
			noteName,
			currentFile.path,
		);
		if (!target) return [];

		const url =
			app.metadataCache.getFileCache(target)?.frontmatter?.[externalLinkField];
		if (!url || typeof url !== "string" || !url.trim()) return [];

		return [linkFn(url.trim(), target.basename)];
	});
}
