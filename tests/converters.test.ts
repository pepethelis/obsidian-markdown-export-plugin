import { describe, expect, test } from "bun:test";
import { convertWikilinks, convertLineBreaks } from "../src/helpers/converters";
import { App } from "obsidian";

const mockApp = {
	metadataCache: {
		getFirstLinkpathDest: (path: string) => {
			if (path === "published_doc") return { path: "published_doc.md" };
			if (path === "draft_doc") return { path: "draft_doc.md" };
			return null;
		},
		getFileCache: (file: any) => {
			if (file.path === "published_doc.md") {
				return {
					frontmatter: {
						status: "Published",
						extLink: "https://example.com/doc",
					},
				};
			}
			if (file.path === "draft_doc.md") {
				return { frontmatter: { status: "Draft" } };
			}
			return null;
		},
	},
} as unknown as App;

describe("converters", () => {
	test("convertWikilinks with existing published document", () => {
		const result = convertWikilinks({
			input: "[[published_doc|Click Here]]",
			app: mockApp,
			wikilinkExternalLinkField: "extLink",
		});
		expect(result).toBe("[Click Here](https://example.com/doc)");
	});

	test("convertWikilinks with missing document", () => {
		const result = convertWikilinks({
			input: "[[missing_doc]]",
			app: mockApp,
			wikilinkExternalLinkField: "extLink",
		});
		expect(result).toBe("missing_doc⚠️🔗");
	});

	test("convertWikilinks with draft document", () => {
		const result = convertWikilinks({
			input: "[[draft_doc]]",
			app: mockApp,
			wikilinkExternalLinkField: "extLink",
		});
		expect(result).toBe("draft_doc⏳");
	});

	test("convertWikilinks without display override", () => {
		const result = convertWikilinks({
			input: "[[published_doc]]",
			app: mockApp,
			wikilinkExternalLinkField: "extLink",
		});
		expect(result).toBe("[published_doc](https://example.com/doc)");
	});

	test("convertWikilinks preserves existing HTML entities", () => {
		const result = convertWikilinks({
			input: "[[published_doc|Rock &amp; Roll]]",
			app: mockApp,
			wikilinkExternalLinkField: "extLink",
		});
		expect(result).toBe("[Rock &amp; Roll](https://example.com/doc)");
	});

	test("convertLineBreaks handles text from test.md correctly", () => {
		const testMdContent1 = `
		Single break 1
		Single break 2
		`;

		const testMdContent2 = `
		Double break 1

		Double break 2
		`;

		const testMdContent3 = `
		Triple break 1
		

		Triple break 2
		`;

		const fix = (text: string) => text.replace(/\t/g, "").trim();

		const result1 = convertLineBreaks({ input: fix(testMdContent1) });

		expect(result1).toContain("Single break 1 Single break 2");

		const result2 = convertLineBreaks({ input: fix(testMdContent2) });

		expect(result2).toContain("Double break 1\nDouble break 2");

		const result3 = convertLineBreaks({ input: fix(testMdContent3) });

		expect(result3).toContain("Triple break 1\n\nTriple break 2");
	});

	test("convertLineBreaks handles real test.md content", () => {
		const testMdContent = `**Monster VR46 zero**. Офіційний смак на банці не вказано, але на сайті - "Light, crisp, refreshing citrus"

==ОПИС ЗАПАХУ ЗАПАХУ==

==ОПИС ЗАПАХУ СМАКУ==

Дизайн дуже близький до того, що ми вже маємо у жовтого [[Monster VR46|vr46/the doctor]], але з деякими спрощеннями. Стало меньше кольорів, зменшилась деталізація\\стилізація. Тепер сонце та місяць виглядають простіше та менш цікаво, ніби це просто взяли рандом svg картинку з інтернету. З того що збільшили - акцент на номері 46. Як на мене дизайн не на рівні дизайну дефолтного доктора, тут зробили гірше. Що кольори ці блакитні, що самі елементи дизайну як на мене стали гірше

Кольорове кодування в лінійці відсутнє, бо усі гоночні екземпляри були ніби окремо. Офіційно всі гоночні смаки належить до класичної лінійки, але це мабуть не лінійка, а просто збірник бастардів + пари варіацій на чорний монстр. Якщо ж виділяти дві банки по валентіно россі в окрему підлініку, то кодування там повноцінне - одна банка жовта, а інша синя

Ключик та верхівка фарбовані у чорний


Колір напою - ==КОЛІР==

Об'єм 0,5л

Кофеїну 32мг/100мл

11кДж або ж 3ккал /100мл

Вуглеводів 0,7г, серед них цукрів 0г /100мл

Підсолоджувач: еритритол, сукралоза, інозитол


Виготовлено під ринок польщі. Лицьова частина уніфікована, а інформаційна повністю польською. Про офіційний чи не офіційний імпорт таких банок наразі невідомо. З офійійного нараз є тільки звічайний [[Monster VR46|the doctor]]

Доступність 3 бали з 5 можливих

Бляшанка від canpack


По висновку - ==ВИСНОВОК==

Пост вийшов завдяки [спонсору оглядів](https://t.me/ed_shitpost), підписуйтесь на кліпі


Пов'язані огляди: [[Monster VR46|Monster the doctor]], [[Monster lando norris]], [[Monster lewis hamilton (🇵🇱)]]

#огляди`;

		const result = convertLineBreaks({ input: testMdContent });

		// Ensure that the empty lines are collapsed around headers
		expect(result).toContain('citrus"\n==ОПИС');
		expect(result).toContain("ЗАПАХУ==\n==ОПИС");
		expect(result).toContain("СМАКУ==\nДизайн");

		// Ensure that double blank lines are preserved
		expect(result).toContain("чорний\n\nКолір");
		expect(result).toContain("інозитол\n\nВиготовлено");
		expect(result).toContain("canpack\n\nПо висновку");
		expect(result).toContain("на кліпі\n\nПов'язані");

		// Ensure that single blank lines are collapsed
		expect(result).toContain("0,5л\nКофеїну");

		// The test data doesn't have internal single line breaks within paragraphs,
		// but let's test it just in case
		const singleLineBreakContent =
			"Paragraph line 1\nParagraph line 2\n\nNext paragraph";
		const singleLineBreakResult = convertLineBreaks({
			input: singleLineBreakContent,
		});
		expect(singleLineBreakResult).toBe(
			"Paragraph line 1 Paragraph line 2\nNext paragraph",
		);
	});
});
