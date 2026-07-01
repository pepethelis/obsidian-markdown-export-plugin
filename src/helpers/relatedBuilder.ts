import { App, TFile } from "obsidian";
import { MyPluginSettings, RelatedItem } from "../types";

export interface FileWithFrontmatter {
	file: TFile;
	frontmatter: Record<string, unknown>;
}

export function scanOtherMarkdownFiles(
	app: App,
	file: TFile,
): FileWithFrontmatter[] {
	return app.vault.getMarkdownFiles().flatMap((f) => {
		if (f.path === file.path) return [];
		const frontmatter = app.metadataCache.getFileCache(f)?.frontmatter;
		if (!frontmatter) return [];
		return [{ file: f, frontmatter }];
	});
}

export function computeBrandRelated(
	app: App,
	file: TFile,
	settings: MyPluginSettings,
	candidates: FileWithFrontmatter[] = scanOtherMarkdownFiles(app, file),
): { label: string; items: RelatedItem[] } {
	const { externalLinkField } = settings;
	if (!externalLinkField) return { label: "", items: [] };

	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const currentBrand: unknown = frontmatter?.["brand"];
	if (!currentBrand || typeof currentBrand !== "string") return { label: "", items: [] };

	const slashIdx = currentBrand.indexOf("/");
	const hasSub = slashIdx >= 0;
	const parent = hasSub ? currentBrand.substring(0, slashIdx) : currentBrand;

	const matchesFamily = (brand: string): boolean => {
		if (hasSub) {
			return (
				brand === currentBrand ||
				brand.startsWith(parent + "/") ||
				brand === parent
			);
		}
		return brand === currentBrand || brand.startsWith(currentBrand + "/");
	};

	// Tier 0: same exact brand, Tier 1: other sub-brands of same parent, Tier 2: parent
	const sortScore = (brand: string): number => {
		if (brand === currentBrand) return 0;
		if (brand.startsWith(parent + "/")) return 1;
		return 2;
	};

	const items = candidates
		.flatMap(({ file: f, frontmatter: fm }) => {
			const brand = fm["brand"];
			if (!brand || typeof brand !== "string") return [];
			if (!matchesFamily(brand)) return [];
			const url = fm[externalLinkField];
			if (!url || typeof url !== "string" || !url.trim()) return [];
			return [{ url: url.trim(), name: f.basename, brand }];
		})
		.sort((a, b) => sortScore(a.brand) - sortScore(b.brand))
		.slice(0, 10)
		.map(({ url, name }) => ({ url, name, enabled: true }));

	return { label: currentBrand, items };
}

export function computeTasteRelated(
	app: App,
	file: TFile,
	settings: MyPluginSettings,
	candidates: FileWithFrontmatter[] = scanOtherMarkdownFiles(app, file),
): RelatedItem[] {
	const { externalLinkField } = settings;
	if (!externalLinkField) return [];

	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const currentTaste = frontmatter?.["taste"];
	if (!currentTaste) return [];

	const tastes: string[] = Array.isArray(currentTaste)
		? currentTaste.map(String)
		: [String(currentTaste)];

	return candidates
		.flatMap(({ file: f, frontmatter: fm }) => {
			const otherTaste = fm["taste"];
			if (!otherTaste) return [];
			const url = fm[externalLinkField];
			if (!url || typeof url !== "string" || !url.trim()) return [];
			const otherTastes: string[] = Array.isArray(otherTaste)
				? otherTaste.map(String)
				: [String(otherTaste)];
			if (!tastes.some((t) => otherTastes.includes(t))) return [];
			return [{ url: url.trim(), name: f.basename, enabled: true }];
		})
		.slice(0, 10);
}

export function computeManualRelated(
	app: App,
	file: TFile,
	settings: MyPluginSettings,
): RelatedItem[] {
	const { externalLinkField } = settings;
	if (!externalLinkField) return [];

	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	const related: unknown = frontmatter?.["related"];
	if (!related) return [];

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
			file.path,
		);
		if (!target) return [];

		const url =
			app.metadataCache.getFileCache(target)?.frontmatter?.[
				externalLinkField
			];
		if (!url || typeof url !== "string" || !url.trim()) return [];

		return [{ url: url.trim(), name: target.basename, enabled: true }];
	});
}
