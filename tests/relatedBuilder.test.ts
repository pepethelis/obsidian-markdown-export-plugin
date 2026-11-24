import { describe, expect, test } from "bun:test";
import { App, TFile } from "obsidian";
import {
	computeBrandRelated,
	computeTasteRelated,
	computeAuthorRelated,
	computeManualRelated,
	computeTypeRelated,
} from "../src/helpers/relatedBuilder";
import { TelegramExportSettings } from "../src/types";

// ── mock helpers ──────────────────────────────────────────────────────────

interface MockFrontmatter {
	brand?: string;
	taste?: string | string[];
	author?: string | string[];
	related?: string | string[];
	link?: string;
	types?: string | string[];
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

const settings: TelegramExportSettings = {
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

	test("returns empty (does not throw) when brand is a non-string value", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { brand: 42 as unknown as string } },
		]);
		expect(() => computeBrandRelated(app, currentFile, settings)).not.toThrow();
		const result = computeBrandRelated(app, currentFile, settings);
		expect(result).toEqual({ label: "", items: [] });
	});

	test("returns empty (does not throw) when brand is a boolean value", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { brand: true as unknown as string } },
		]);
		expect(() => computeBrandRelated(app, currentFile, settings)).not.toThrow();
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
			{ path: "sibling.md", basename: "sibling", frontmatter: { brand: "monster/juiced", link: "https://t.me/sibling" } },
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

	test("within the same tier, same-type items are preferred over other types", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { brand: "monster", types: ["energy"] } },
			{ path: "othertype.md", basename: "othertype", frontmatter: { brand: "monster/ultra", link: "https://t.me/othertype", types: ["alco"] } },
			{ path: "sametype.md", basename: "sametype", frontmatter: { brand: "monster/juiced", link: "https://t.me/sametype", types: ["energy"] } },
		]);
		const result = computeBrandRelated(app, currentFile, settings);
		expect(result.items.map((i) => i.name)).toEqual(["sametype", "othertype"]);
	});

	test("other-type items of the same brand are disabled by default; same-type stay enabled", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { brand: "bronx/zero", types: ["energy"] } },
			{ path: "othertype.md", basename: "othertype", frontmatter: { brand: "bronx", link: "https://t.me/othertype", types: ["alco"] } },
			{ path: "sametype.md", basename: "sametype", frontmatter: { brand: "bronx/zero", link: "https://t.me/sametype", types: ["energy"] } },
			{ path: "othertype2.md", basename: "othertype2", frontmatter: { brand: "bronx", link: "https://t.me/othertype2", types: ["alco"] } },
		]);
		const result = computeBrandRelated(app, currentFile, settings);
		expect(result.items.find((i) => i.name === "sametype")?.enabled).toBe(true);
		expect(result.items.find((i) => i.name === "othertype")?.enabled).toBe(false);
	});

	test("does not disable items when the current note has no type", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { brand: "bronx/zero" } },
			{ path: "other.md", basename: "other", frontmatter: { brand: "bronx/zero", link: "https://t.me/1", types: ["alco"] } },
		]);
		const result = computeBrandRelated(app, currentFile, settings);
		expect(result.items[0].enabled).toBe(true);
	});

	test("brand tier still outranks type match", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { brand: "monster/ultra", types: ["energy"] } },
			{ path: "sibling-othertype.md", basename: "sibling-othertype", frontmatter: { brand: "monster/juiced", link: "https://t.me/sibling", types: ["alco"] } },
			{ path: "exact-othertype.md", basename: "exact-othertype", frontmatter: { brand: "monster/ultra", link: "https://t.me/exact", types: ["alco"] } },
		]);
		const result = computeBrandRelated(app, currentFile, settings);
		expect(result.items.map((i) => i.name)).toEqual(["exact-othertype", "sibling-othertype"]);
	});

	test("prefers items without an author field over items with one", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { brand: "monster" } },
			{ path: "withauthor.md", basename: "withauthor", frontmatter: { brand: "monster", link: "https://t.me/withauthor", author: "Ann" } },
			{ path: "noauthor.md", basename: "noauthor", frontmatter: { brand: "monster", link: "https://t.me/noauthor" } },
		]);
		const result = computeBrandRelated(app, currentFile, settings);
		expect(result.items.map((i) => i.name)).toEqual(["noauthor", "withauthor by Ann"]);
	});

	test("multi-value types: candidate must match the full type set, not just overlap", () => {
		// regression: real vault notes use a `types` array (e.g. `bronx` alco-energy hybrids are
		// `[alco, energy]` while `bronx/zero` is plain `[energy]`) — a hybrid sharing one value
		// with a pure type is still a *different* drink type and must default to disabled.
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { brand: "bronx/zero", types: ["energy"] } },
			{
				path: "zero-sibling.md",
				basename: "zero-sibling",
				frontmatter: { brand: "bronx/zero", link: "https://t.me/zero-sibling", types: ["energy"] },
			},
			{
				path: "hybrid.md",
				basename: "hybrid",
				frontmatter: { brand: "bronx", link: "https://t.me/hybrid", types: ["alco", "energy"] },
			},
			{
				path: "pink.md",
				basename: "pink",
				frontmatter: { brand: "bronx/zero", link: "https://t.me/pink", types: ["alco"] },
			},
		]);
		const result = computeBrandRelated(app, currentFile, settings);
		expect(result.items.find((i) => i.name === "zero-sibling")?.enabled).toBe(true);
		expect(result.items.find((i) => i.name === "hybrid")?.enabled).toBe(false);
		expect(result.items.find((i) => i.name === "pink")?.enabled).toBe(false);
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

	test("prefers same-type matches over other types", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { taste: "sweet", types: ["energy"] } },
			{ path: "othertype.md", basename: "othertype", frontmatter: { taste: "sweet", link: "https://t.me/othertype", types: ["alco"] } },
			{ path: "sametype.md", basename: "sametype", frontmatter: { taste: "sweet", link: "https://t.me/sametype", types: ["energy"] } },
		]);
		const result = computeTasteRelated(app, currentFile, settings);
		expect(result.map((i) => i.name)).toEqual(["sametype", "othertype"]);
	});

	test("other-type items are disabled by default; same-type stay enabled", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { taste: "sweet", types: ["energy"] } },
			{ path: "othertype.md", basename: "othertype", frontmatter: { taste: "sweet", link: "https://t.me/othertype", types: ["alco"] } },
			{ path: "sametype.md", basename: "sametype", frontmatter: { taste: "sweet", link: "https://t.me/sametype", types: ["energy"] } },
		]);
		const result = computeTasteRelated(app, currentFile, settings);
		expect(result.find((i) => i.name === "sametype")?.enabled).toBe(true);
		expect(result.find((i) => i.name === "othertype")?.enabled).toBe(false);
	});

	test("all items default to enabled when current file has no types", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { taste: "sweet" } },
			{ path: "a.md", basename: "a", frontmatter: { taste: "sweet", link: "https://t.me/a", types: ["energy"] } },
			{ path: "b.md", basename: "b", frontmatter: { taste: "sweet", link: "https://t.me/b", types: ["alco"] } },
		]);
		const result = computeTasteRelated(app, currentFile, settings);
		expect(result.every((i) => i.enabled)).toBe(true);
	});

	test("prefers items without an author field over items with one", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { taste: "sweet" } },
			{ path: "withauthor.md", basename: "withauthor", frontmatter: { taste: "sweet", link: "https://t.me/withauthor", author: "Ann" } },
			{ path: "noauthor.md", basename: "noauthor", frontmatter: { taste: "sweet", link: "https://t.me/noauthor" } },
		]);
		const result = computeTasteRelated(app, currentFile, settings);
		expect(result.map((i) => i.name)).toEqual(["noauthor", "withauthor by Ann"]);
	});
});

// ── computeTypeRelated ────────────────────────────────────────────────────

describe("computeTypeRelated", () => {
	test("returns empty when externalLinkField is unset", () => {
		const app = makeApp([{ path: "current.md", basename: "current", frontmatter: {} }]);
		const result = computeTypeRelated(app, currentFile, { ...settings, externalLinkField: "" });
		expect(result).toEqual([]);
	});

	test("returns empty when current file has no types", () => {
		const app = makeApp([{ path: "current.md", basename: "current", frontmatter: {} }]);
		const result = computeTypeRelated(app, currentFile, settings);
		expect(result).toEqual([]);
	});

	test("excludes the current file itself", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { types: ["energy"], link: "https://t.me/cur" } },
		]);
		const result = computeTypeRelated(app, currentFile, settings);
		expect(result).toHaveLength(0);
	});

	test("matches file with the exact same types set", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { types: ["energy"] } },
			{ path: "match.md", basename: "match", frontmatter: { types: ["energy"], link: "https://t.me/match" } },
			{ path: "nomatch.md", basename: "nomatch", frontmatter: { types: ["alco"], link: "https://t.me/nm" } },
		]);
		const result = computeTypeRelated(app, currentFile, settings);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("match");
	});

	test("excludes files whose types set is a subset/superset, not an exact match", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { types: ["energy", "alco"] } },
			{ path: "partial.md", basename: "partial", frontmatter: { types: ["energy"], link: "https://t.me/partial" } },
		]);
		const result = computeTypeRelated(app, currentFile, settings);
		expect(result).toHaveLength(0);
	});

	test("excludes files without link field", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { types: ["energy"] } },
			{ path: "nolink.md", basename: "nolink", frontmatter: { types: ["energy"] } },
		]);
		const result = computeTypeRelated(app, currentFile, settings);
		expect(result).toHaveLength(0);
	});

	test("slices to 10 items maximum", () => {
		const extras = Array.from({ length: 15 }, (_, i) => ({
			path: `n${i}.md`,
			basename: `n${i}`,
			frontmatter: { types: ["energy"], link: `https://t.me/${i}` },
		}));
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { types: ["energy"] } },
			...extras,
		]);
		const result = computeTypeRelated(app, currentFile, settings);
		expect(result).toHaveLength(10);
	});

	test("all returned items have enabled: true", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { types: ["energy"] } },
			{ path: "other.md", basename: "other", frontmatter: { types: ["energy"], link: "https://t.me/1" } },
		]);
		const result = computeTypeRelated(app, currentFile, settings);
		expect(result.every((i) => i.enabled)).toBe(true);
	});

	test("url is trimmed", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { types: ["energy"] } },
			{ path: "other.md", basename: "other", frontmatter: { types: ["energy"], link: "  https://t.me/1  " } },
		]);
		const result = computeTypeRelated(app, currentFile, settings);
		expect(result[0].url).toBe("https://t.me/1");
	});

	test("prefers items without an author field over items with one", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { types: ["energy"] } },
			{ path: "withauthor.md", basename: "withauthor", frontmatter: { types: ["energy"], link: "https://t.me/withauthor", author: "Ann" } },
			{ path: "noauthor.md", basename: "noauthor", frontmatter: { types: ["energy"], link: "https://t.me/noauthor" } },
		]);
		const result = computeTypeRelated(app, currentFile, settings);
		expect(result.map((i) => i.name)).toEqual(["noauthor", "withauthor by Ann"]);
	});
});

// ── computeAuthorRelated ──────────────────────────────────────────────────

describe("computeAuthorRelated", () => {
	test("returns empty when externalLinkField is unset", () => {
		const app = makeApp([{ path: "current.md", basename: "current", frontmatter: {} }]);
		const result = computeAuthorRelated(app, currentFile, { ...settings, externalLinkField: "" });
		expect(result).toEqual([]);
	});

	test("returns empty when current file has no author", () => {
		const app = makeApp([{ path: "current.md", basename: "current", frontmatter: {} }]);
		const result = computeAuthorRelated(app, currentFile, settings);
		expect(result).toEqual([]);
	});

	test("excludes the current file itself", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { author: "Ann", link: "https://t.me/cur" } },
		]);
		const result = computeAuthorRelated(app, currentFile, settings);
		expect(result).toHaveLength(0);
	});

	test("matches file sharing any author value (array in current)", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { author: ["Ann", "Bob"] } },
			{ path: "match.md", basename: "match", frontmatter: { author: "Ann", link: "https://t.me/match" } },
			{ path: "nomatch.md", basename: "nomatch", frontmatter: { author: "Cid", link: "https://t.me/nm" } },
		]);
		const result = computeAuthorRelated(app, currentFile, settings);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("match by Ann");
	});

	test("handles string author (not array) in current file", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { author: "Ann" } },
			{ path: "match.md", basename: "match", frontmatter: { author: ["Ann", "Bob"], link: "https://t.me/m" } },
		]);
		const result = computeAuthorRelated(app, currentFile, settings);
		expect(result).toHaveLength(1);
	});

	test("excludes files without link field", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { author: "Ann" } },
			{ path: "nolink.md", basename: "nolink", frontmatter: { author: "Ann" } },
		]);
		const result = computeAuthorRelated(app, currentFile, settings);
		expect(result).toHaveLength(0);
	});

	test("slices to 10 items maximum", () => {
		const extras = Array.from({ length: 15 }, (_, i) => ({
			path: `n${i}.md`,
			basename: `n${i}`,
			frontmatter: { author: "Ann", link: `https://t.me/${i}` },
		}));
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { author: "Ann" } },
			...extras,
		]);
		const result = computeAuthorRelated(app, currentFile, settings);
		expect(result).toHaveLength(10);
	});

	test("all returned items have enabled: true", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { author: "Ann" } },
			{ path: "other.md", basename: "other", frontmatter: { author: "Ann", link: "https://t.me/1" } },
		]);
		const result = computeAuthorRelated(app, currentFile, settings);
		expect(result.every((i) => i.enabled)).toBe(true);
	});

	test("url is trimmed", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { author: "Ann" } },
			{ path: "other.md", basename: "other", frontmatter: { author: "Ann", link: "  https://t.me/1  " } },
		]);
		const result = computeAuthorRelated(app, currentFile, settings);
		expect(result[0].url).toBe("https://t.me/1");
	});

	test("prefers same-type matches over other types", () => {
		const app = makeApp([
			{ path: "current.md", basename: "current", frontmatter: { author: "Ann", types: ["energy"] } },
			{ path: "othertype.md", basename: "othertype", frontmatter: { author: "Ann", link: "https://t.me/othertype", types: ["alco"] } },
			{ path: "sametype.md", basename: "sametype", frontmatter: { author: "Ann", link: "https://t.me/sametype", types: ["energy"] } },
		]);
		const result = computeAuthorRelated(app, currentFile, settings);
		expect(result.map((i) => i.name)).toEqual(["sametype by Ann", "othertype by Ann"]);
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
