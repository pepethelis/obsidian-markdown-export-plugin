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

interface KeyboardPlugin {
	addListener(
		event: "keyboardWillShow" | "keyboardWillHide",
		cb: (info?: { keyboardHeight: number }) => void,
	): KeyboardListenerHandle | Promise<KeyboardListenerHandle>;
}

interface KeyboardListenerHandle {
	remove(): void | Promise<void>;
}

export class ExportSettingsModal extends Modal {
	private options: ExportOptions;
	private params: ModalParams;
	private submitted = false;
	private resolve: (options: ExportOptions | null) => void;
	private keyboardHandles: KeyboardListenerHandle[] = [];

	// Obsidian mobile runs with Capacitor keyboard resize mode "none": the iOS
	// keyboard overlays the webview without changing any viewport metrics (no
	// visualViewport/resize events), so the modal keeps its full-screen layout
	// and its bottom part ends up hidden behind the keyboard. The only reliable
	// signal is the Capacitor Keyboard plugin, which reports keyboard height.
	private setKeyboardOffset(height: number) {
		this.modalEl.style.marginBottom = height ? `${height}px` : "";
		this.modalEl.style.maxHeight = height
			? `calc(100% - ${height}px)`
			: "";
	}

	private registerKeyboardHandlers() {
		const keyboard = (
			window as {
				Capacitor?: { Plugins?: { Keyboard?: KeyboardPlugin } };
			}
		).Capacitor?.Plugins?.Keyboard;
		if (!keyboard) return;

		const listen = (
			event: "keyboardWillShow" | "keyboardWillHide",
			cb: (info?: { keyboardHeight: number }) => void,
		) => {
			Promise.resolve(keyboard.addListener(event, cb)).then((handle) =>
				this.keyboardHandles.push(handle),
			);
		};
		listen("keyboardWillShow", (info) =>
			this.setKeyboardOffset(info?.keyboardHeight ?? 0),
		);
		listen("keyboardWillHide", () => this.setKeyboardOffset(0));
	}

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

		this.registerKeyboardHandlers();

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
		for (const handle of this.keyboardHandles) {
			handle.remove();
		}
		this.keyboardHandles = [];
		this.setKeyboardOffset(0);
		if (!this.submitted) {
			this.resolve(null);
		}
		this.contentEl.empty();
	}
}
