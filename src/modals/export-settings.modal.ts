import { App, Modal, Setting } from "obsidian";
import { ExportOptions, RelatedSection } from "../types";

export interface ModalParams {
	title: string;
	submitLabel: string;
	showReplyLink: boolean;
	finalHashtag: string;
	brandLabel: string;
	brandItems: RelatedSection["items"];
	tasteItems: RelatedSection["items"];
	manualItems: RelatedSection["items"];
	defaultFormat?: "html" | "md";
}

export class ExportSettingsModal extends Modal {
	private options: ExportOptions;
	private params: ModalParams;
	private submitted = false;
	private resolve: (options: ExportOptions | null) => void;

	constructor(
		app: App,
		params: ModalParams,
		resolve: (options: ExportOptions | null) => void,
	) {
		super(app);
		this.params = params;
		this.resolve = resolve;
		this.options = {
			format: params.defaultFormat ?? "html",
			includeHashtag: true,
			replyLink: "",
			brandRelated: {
				enabled: true,
				items: params.brandItems.map((i) => ({ ...i })),
			},
			tasteRelated: {
				enabled: true,
				items: params.tasteItems.map((i) => ({ ...i })),
			},
			manualRelated: {
				enabled: true,
				items: params.manualItems.map((i) => ({ ...i })),
			},
		};
	}

	onOpen() {
		const { contentEl } = this;
		const { title, submitLabel, showReplyLink, finalHashtag, brandLabel } =
			this.params;

		contentEl.addClass("md-export-modal");
		contentEl.createEl("h2", { text: title });

		new Setting(contentEl).setName("Format").addDropdown((dd) =>
			dd
				.addOption("html", "Classic")
				.addOption("md", "Rich text")
				.setValue(this.options.format)
				.onChange((v) => {
					this.options.format = v as "html" | "md";
				}),
		);

		this.renderSection(
			contentEl,
			brandLabel ? `Більше ${brandLabel}` : "Brand related",
			this.options.brandRelated,
		);
		this.renderSection(contentEl, "Схожий смак", this.options.tasteRelated);
		this.renderSection(
			contentEl,
			"Пов'язані огляди",
			this.options.manualRelated,
		);

		if (finalHashtag) {
			new Setting(contentEl)
				.setName(finalHashtag)
				.setDesc("Include hashtag at the end")
				.addToggle((t) =>
					t
						.setValue(this.options.includeHashtag)
						.onChange((v) => {
							this.options.includeHashtag = v;
						}),
				)
				.settingEl.addClass("md-export-hashtag");
		}

		if (showReplyLink) {
			new Setting(contentEl)
				.setName("Reply to post")
				.setDesc("Telegram post link to reply to (optional)")
				.addText((t) =>
					t
						.setPlaceholder("https://t.me/…")
						.setValue(this.options.replyLink)
						.onChange((v) => {
							this.options.replyLink = v;
						}),
				)
				.settingEl.addClass("md-export-hashtag");
		}

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(submitLabel)
					.setCta()
					.onClick(() => {
						this.submitted = true;
						this.close();
						this.resolve(this.options);
					}),
			)
			.settingEl.addClass("md-export-actions");
	}

	private renderSection(
		containerEl: HTMLElement,
		label: string,
		section: RelatedSection,
	) {
		if (section.items.length === 0) return;

		let itemsEl!: HTMLElement;

		new Setting(containerEl)
			.setName(label)
			.setHeading()
			.addToggle((t) =>
				t.setValue(section.enabled).onChange((v) => {
					section.enabled = v;
					itemsEl.style.display = v ? "" : "none";
				}),
			);

		itemsEl = containerEl.createDiv({ cls: "md-export-section-items" });

		for (const item of section.items) {
			new Setting(itemsEl).setName(item.name).addToggle((t) =>
				t.setValue(item.enabled).onChange((v) => {
					item.enabled = v;
				}),
			);
		}
	}

	onClose() {
		if (!this.submitted) {
			this.resolve(null);
		}
		this.contentEl.empty();
	}
}
