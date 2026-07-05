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

	// iOS keyboards cover the bottom of the modal without resizing the layout
	// viewport the modal is centered in, so we shrink/reposition it manually
	// to fit whatever visualViewport area remains above the keyboard.
	private readonly onViewportResize = () => {
		const vv = window.visualViewport;
		if (!vv) return;
		this.containerEl.style.top = `${vv.offsetTop}px`;
		this.containerEl.style.height = `${vv.height}px`;
		this.containerEl.style.bottom = "auto";
		this.modalEl.style.maxHeight = `${vv.height - 40}px`;
	};

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

		window.visualViewport?.addEventListener("resize", this.onViewportResize);
		window.visualViewport?.addEventListener("scroll", this.onViewportResize);

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
				.addText((t) => {
					t.setPlaceholder("https://t.me/…")
						.setValue(this.options.replyLink)
						.onChange((v) => {
							this.options.replyLink = v;
						});
					// iOS pushes the modal (and this field, near the bottom) behind the
					// keyboard on focus without scrolling it back into view on its own.
					t.inputEl.addEventListener("focus", () => {
						setTimeout(
							() => t.inputEl.scrollIntoView({ block: "center", behavior: "smooth" }),
							300,
						);
					});
				})
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
		window.visualViewport?.removeEventListener("resize", this.onViewportResize);
		window.visualViewport?.removeEventListener("scroll", this.onViewportResize);
		this.containerEl.style.top = "";
		this.containerEl.style.height = "";
		this.containerEl.style.bottom = "";
		this.modalEl.style.maxHeight = "";
		if (!this.submitted) {
			this.resolve(null);
		}
		this.contentEl.empty();
	}
}
