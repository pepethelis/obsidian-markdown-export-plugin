import { describe, expect, test } from "bun:test";
import { App, TFile } from "obsidian";
import {
	computeBrandRelated,
	computeTasteRelated,
	computeManualRelated,
} from "../src/helpers/relatedBuilder";
import { MyPluginSettings } from "../src/types";

// ── mock helpers ──────────────────────────────────────────────────────────

interface MockFrontmatter {
	brand?: string;
	taste?: string | string[];
	related?: string | string[];
	link?: string;
}

interface MockFile {
	path: string;
	basename: string;
	frontmatter: MockFrontmatter | null;
}

function makeApp(files: MockFile[]): App {
	const byPath = new Map(files.map((f) => [f.path, f]));
	const byBasename = new Map(files.map((f) => [f.basename, f]));

	return {
		vault: {
			getMarkdownFiles: () =>
				files.map((f) => ({ path: f.path, basename: f.basename }) as TFile),
		},
		metadataCache: {
			getFileCache: (f: TFile) => {
				const mf = byPath.get(f.path);
				if (!mf?.frontmatter) return null;
				return { frontmatter: mf.frontmatter };
			},
			getFirstLinkpathDest: (noteName: string, _from: string) => {
				const found = byBasename.get(noteName);
				return found
					? ({ path: found.path, basename: found.basename } as TFile)
					: null;
			},
		},
	} as unknown as App;
}

const settings: MyPluginSettings = {
	botToken: "key",
	chatId: "chat",
	externalLinkField: "link",
	pubDateField: "",
	updateDateField: "",
	statusField: "",
	publishedStatusValue: "",
	channelUsername: "",
	finalHashtag: "",
};

const currentFile = { path: "current.md", basename: "current" } as TFile;

// ── computeBrandRelated ───────────────────────────────────────────────────

describe("computeBrandRelated", () => {
	test("returns empty when externalLinkField is unset", () => {
		const app = makeApp([{ path: "current.md", basename: "current", frontmatter: {} }]);
		const result = computeBrandRelated(app, currentFile, { ...settings, externalLinkField: "" });
		expect(result).toEqual({ label: "", items: [] });
	});

	test("returns empty when current file has no brand", () => {
		const app = makeApp([{ path: "current.md", basename: "current", frontmatter: {} }]);
		const result = computeBrandRelated(app, currentFile, settings);
		expect(result).toEqual({ label: "", items: [] });
	});

	test("excludes the current file itself", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { brand: "monster", link: "https://t.me/1" } },
		]);
		const result = computeBrandRelated(app, currentFile, settings);
		expect(result.items).toHaveLength(0);
	});

	test("excludes files without the link field", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { brand: "monster" } },
			{ path: "other.md", basename: "other", frontmatter: { brand: "monster" } }, // no link
		]);
		const result = computeBrandRelated(app, currentFile, settings);
		expect(result.items).toHaveLength(0);
	});

	test("excludes files with unrelated brand", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { brand: "monster" } },
			{ path: "rb.md", basename: "redbull", frontmatter: { brand: "redbull", link: "https://t.me/rb" } },
		]);
		const result = computeBrandRelated(app, currentFile, settings);
		expect(result.items).toHaveLength(0);
	});

	test("tier ordering: exact (0) → sibling sub-brand (1) → parent (2)", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { brand: "monster/ultra" } },
			{ path: "parent.md", basename: "parent", frontmatter: { brand: "monster", link: "https://t.me/parent" } },
			{ path: "sibling.md", basename: "sibling", frontmatter: { brand: "monster/zero", link: "https://t.me/sibling" } },
			{ path: "exact.md", basename: "exact", frontmatter: { brand: "monster/ultra", link: "https://t.me/exact" } },
		]);
		const result = computeBrandRelated(app, currentFile, settings);
		expect(result.label).toBe("monster/ultra");
		expect(result.items).toHaveLength(3);
		expect(result.items[0].name).toBe("exact");    // tier 0
		expect(result.items[1].name).toBe("sibling");  // tier 1
		expect(result.items[2].name).toBe("parent");   // tier 2
	});

	test("simple brand matches sub-brands (tier 1)", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { brand: "monster" } },
			{ path: "sub.md", basename: "sub", frontmatter: { brand: "monster/ultra", link: "https://t.me/sub" } },
		]);
		const result = computeBrandRelated(app, currentFile, settings);
		expect(result.items).toHaveLength(1);
		expect(result.items[0].name).toBe("sub");
	});

	test("slices to 10 items maximum", () => {
		const extras = Array.from({ length: 15 }, (_, i) => ({
			path: `n${i}.md`,
			basename: `n${i}`,
			frontmatter: { brand: "monster", link: `https://t.me/${i}` },
		}));
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { brand: "monster" } },
			...extras,
		]);
		const result = computeBrandRelated(app, currentFile, settings);
		expect(result.items).toHaveLength(10);
	});

	test("all returned items have enabled: true", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { brand: "monster" } },
			{ path: "other.md", basename: "other", frontmatter: { brand: "monster", link: "https://t.me/1" } },
		]);
		const result = computeBrandRelated(app, currentFile, settings);
		expect(result.items.every((i) => i.enabled)).toBe(true);
	});

	test("url is trimmed", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { brand: "monster" } },
			{ path: "other.md", basename: "other", frontmatter: { brand: "monster", link: "  https://t.me/1  " } },
		]);
		const result = computeBrandRelated(app, currentFile, settings);
		expect(result.items[0].url).toBe("https://t.me/1");
	});
});

// ── computeTasteRelated ───────────────────────────────────────────────────

describe("computeTasteRelated", () => {
	test("returns empty when externalLinkField is unset", () => {
		const app = makeApp([{ path: "current.md", basename: "current", frontmatter: {} }]);
		const result = computeTasteRelated(app, currentFile, { ...settings, externalLinkField: "" });
		expect(result).toEqual([]);
	});

	test("returns empty when current file has no taste", () => {
		const app = makeApp([{ path: "current.md", basename: "current", frontmatter: {} }]);
		const result = computeTasteRelated(app, currentFile, settings);
		expect(result).toEqual([]);
	});

	test("excludes the current file itself", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { taste: "sweet", link: "https://t.me/cur" } },
		]);
		const result = computeTasteRelated(app, currentFile, settings);
		expect(result).toHaveLength(0);
	});

	test("matches file sharing any taste value (array in current)", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { taste: ["fruity", "sweet"] } },
			{ path: "match.md", basename: "match", frontmatter: { taste: "fruity", link: "https://t.me/match" } },
			{ path: "nomatch.md", basename: "nomatch", frontmatter: { taste: "bitter", link: "https://t.me/nm" } },
		]);
		const result = computeTasteRelated(app, currentFile, settings);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("match");
	});

	test("handles string taste (not array) in current file", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { taste: "sour" } },
			{ path: "match.md", basename: "match", frontmatter: { taste: ["sour", "citrus"], link: "https://t.me/m" } },
		]);
		const result = computeTasteRelated(app, currentFile, settings);
		expect(result).toHaveLength(1);
	});

	test("excludes files without link field", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { taste: "sweet" } },
			{ path: "nolink.md", basename: "nolink", frontmatter: { taste: "sweet" } },
		]);
		const result = computeTasteRelated(app, currentFile, settings);
		expect(result).toHaveLength(0);
	});

	test("slices to 10 items maximum", () => {
		const extras = Array.from({ length: 15 }, (_, i) => ({
			path: `n${i}.md`,
			basename: `n${i}`,
			frontmatter: { taste: "sweet", link: `https://t.me/${i}` },
		}));
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { taste: "sweet" } },
			...extras,
		]);
		const result = computeTasteRelated(app, currentFile, settings);
		expect(result).toHaveLength(10);
	});

	test("all returned items have enabled: true", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { taste: "sweet" } },
			{ path: "other.md", basename: "other", frontmatter: { taste: "sweet", link: "https://t.me/1" } },
		]);
		const result = computeTasteRelated(app, currentFile, settings);
		expect(result.every((i) => i.enabled)).toBe(true);
	});

	test("url is trimmed", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { taste: "sweet" } },
			{ path: "other.md", basename: "other", frontmatter: { taste: "sweet", link: "  https://t.me/1  " } },
		]);
		const result = computeTasteRelated(app, currentFile, settings);
		expect(result[0].url).toBe("https://t.me/1");
	});
});

// ── computeManualRelated ──────────────────────────────────────────────────

describe("computeManualRelated", () => {
	test("returns empty when no related field", () => {
		const app = makeApp([{ path: "current.md", basename: "current", frontmatter: {} }]);
		const result = computeManualRelated(app, currentFile, settings);
		expect(result).toEqual([]);
	});

	test("resolves [[wikilink]] and returns item", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { related: "[[Target]]" } },
			{ path: "target.md", basename: "Target", frontmatter: { link: "https://t.me/target" } },
		]);
		const result = computeManualRelated(app, currentFile, settings);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Target");
		expect(result[0].url).toBe("https://t.me/target");
		expect(result[0].enabled).toBe(true);
	});

	test("skips unresolvable note name", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { related: "[[Missing]]" } },
		]);
		const result = computeManualRelated(app, currentFile, settings);
		expect(result).toHaveLength(0);
	});

	test("skips resolved file with no link field", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { related: "[[NoLink]]" } },
			{ path: "nolink.md", basename: "NoLink", frontmatter: {} },
		]);
		const result = computeManualRelated(app, currentFile, settings);
		expect(result).toHaveLength(0);
	});

	test("handles array of related items", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { related: ["[[A]]", "[[B]]", "[[Missing]]"] } },
			{ path: "a.md", basename: "A", frontmatter: { link: "https://t.me/a" } },
			{ path: "b.md", basename: "B", frontmatter: { link: "https://t.me/b" } },
		]);
		const result = computeManualRelated(app, currentFile, settings);
		expect(result).toHaveLength(2);
		expect(result.map((i) => i.name)).toEqual(["A", "B"]);
	});

	test("handles plain note name without wikilink brackets", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { related: "Target" } },
			{ path: "target.md", basename: "Target", frontmatter: { link: "https://t.me/target" } },
		]);
		const result = computeManualRelated(app, currentFile, settings);
		expect(result).toHaveLength(1);
	});

	test("strips alias from wikilink [[Note|Alias]]", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { related: "[[Target|My Label]]" } },
			{ path: "target.md", basename: "Target", frontmatter: { link: "https://t.me/target" } },
		]);
		const result = computeManualRelated(app, currentFile, settings);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Target");
	});

	test("strips heading anchor from wikilink [[Note#Section]]", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { related: "[[Target#Intro]]" } },
			{ path: "target.md", basename: "Target", frontmatter: { link: "https://t.me/target" } },
		]);
		const result = computeManualRelated(app, currentFile, settings);
		expect(result).toHaveLength(1);
	});

	test("url is trimmed", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { related: "[[Target]]" } },
			{ path: "target.md", basename: "Target", frontmatter: { link: "  https://t.me/target  " } },
		]);
		const result = computeManualRelated(app, currentFile, settings);
		expect(result[0].url).toBe("https://t.me/target");
	});
});
