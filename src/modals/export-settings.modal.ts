import { App, Modal, Setting, SettingGroup } from "obsidian";
import { Channel, ExportOptions, RelatedSection } from "../types";

export interface ModalParams {
	title: string;
	submitLabel: string;
	finalHashtag: string;
	brandLabel: string;
	brandItems: RelatedSection["items"];
	typeItems: RelatedSection["items"];
	tasteItems: RelatedSection["items"];
	authorItems: RelatedSection["items"];
	manualItems: RelatedSection["items"];
	defaultFormat?: "html" | "md";
	/** When set, a channel picker is shown (first channel preselected). */
	channels?: Channel[];
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
			channelIndex: params.channels?.length ? 0 : undefined,
			includeHashtag: true,
			brandRelated: {
				enabled: true,
				items: params.brandItems.map((i) => ({ ...i })),
			},
			typeRelated: {
				enabled: true,
				items: params.typeItems.map((i) => ({ ...i })),
			},
			tasteRelated: {
				enabled: true,
				items: params.tasteItems.map((i) => ({ ...i })),
			},
			authorRelated: {
				enabled: true,
				items: params.authorItems.map((i) => ({ ...i })),
			},
			manualRelated: {
				enabled: true,
				items: params.manualItems.map((i) => ({ ...i })),
			},
		};
	}

	onOpen() {
		const { contentEl } = this;
		const { title, submitLabel, finalHashtag, brandLabel } = this.params;

		contentEl.addClass("md-export-modal");
		contentEl.createEl("h2", { text: title });

		const general = new SettingGroup(contentEl);
		const { channels } = this.params;
		if (channels?.length) {
			general.addSetting((s) =>
				s.setName("Channel").addDropdown((dd) => {
					channels.forEach((c, i) => dd.addOption(String(i), `${c.name} (${c.username})`));
					dd.setValue(String(this.options.channelIndex ?? 0)).onChange((v) => {
						this.options.channelIndex = Number(v);
					});
				}),
			);
		}
		general.addSetting((s) =>
			s.setName("Format").addDropdown((dd) =>
				dd
					.addOption("html", "Classic")
					.addOption("md", "Rich text")
					.setValue(this.options.format)
					.onChange((v) => {
						this.options.format = v as "html" | "md";
					}),
			),
		);

		this.renderSection(
			contentEl,
			"Пов'язані огляди",
			this.options.manualRelated,
		);
		this.renderSection(
			contentEl,
			brandLabel ? `Більше ${brandLabel}` : "Brand related",
			this.options.brandRelated,
		);
		this.renderSection(contentEl, "Схожий тип", this.options.typeRelated);
		this.renderSection(contentEl, "Схожий смак", this.options.tasteRelated);
		this.renderSection(
			contentEl,
			"Ще від автора",
			this.options.authorRelated,
		);

		if (finalHashtag) {
			new SettingGroup(contentEl).addSetting((s) =>
				s
					.setName(finalHashtag)
					.setDesc("Include hashtag at the end")
					.addToggle((t) =>
						t.setValue(this.options.includeHashtag).onChange((v) => {
							this.options.includeHashtag = v;
						}),
					),
			);
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

		const group = new SettingGroup(containerEl).setHeading(label);
		const itemEls: HTMLElement[] = [];

		group.addSetting((s) =>
			s.setName("Додати секцію").addToggle((t) =>
				t.setValue(section.enabled).onChange((v) => {
					section.enabled = v;
					for (const el of itemEls) el.toggle(v);
				}),
			),
		);

		for (const item of section.items) {
			group.addSetting((s) => {
				s.setName(item.name).addToggle((t) =>
					t.setValue(item.enabled).onChange((v) => {
						item.enabled = v;
					}),
				);
				s.settingEl.addClass("md-export-related-item");
				s.settingEl.toggle(section.enabled);
				itemEls.push(s.settingEl);
			});
		}
	}

	onClose() {
		if (!this.submitted) {
			this.resolve(null);
		}
		this.contentEl.empty();
	}
}
