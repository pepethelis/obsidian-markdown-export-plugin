import { App, ConfirmationModal, Setting, TextComponent } from "obsidian";
import { validateChannelUsername } from "../helpers/telegramLinks";
import { Channel } from "../types";

/** Add/edit form for one channel. Resolves to the saved channel, or null if cancelled. */
class ChannelModal extends ConfirmationModal {
	private result: Channel | null = null;
	private nameInput!: TextComponent;

	constructor(
		app: App,
		initial: Channel | null,
		private onResult: (channel: Channel | null) => void,
	) {
		super(app);
		this.setTitle(initial ? "Edit channel" : "Add channel");

		let usernameInput!: TextComponent;
		new Setting(this.contentEl).setName("Name").addText((t) => {
			this.nameInput = t.setPlaceholder("e.g. Main or Test").setValue(initial?.name ?? "");
		});
		new Setting(this.contentEl).setName("Username or ID").addText((t) => {
			usernameInput = t
				.setPlaceholder("@channel_name or -100123456789")
				.setValue(initial?.username ?? "");
		});
		let updateNote = initial?.updateNote ?? true;
		new Setting(this.contentEl)
			.setName("Update note after posting")
			.setDesc("Save the post link, date and status to the note. Turn off for test channels.")
			.addToggle((t) =>
				t.setValue(updateNote).onChange((v) => {
					updateNote = v;
				}),
			);
		const errorEl = this.contentEl.createDiv({ cls: "md-export-reply-error" });

		this.addButton((btn) =>
			btn
				.setButtonText("Save")
				.setCta()
				.onClick(() => {
					const username = usernameInput.getValue().trim();
					const error = validateChannelUsername(username);
					if (error) {
						errorEl.setText(error);
						return true; // keep the modal open
					}
					this.result = {
						name: this.nameInput.getValue().trim() || username,
						username,
						updateNote,
					};
				}),
		);
		this.addCancelButton();
	}

	onOpen() {
		super.onOpen();
		this.nameInput.inputEl.focus();
	}

	onClose() {
		super.onClose();
		this.onResult(this.result);
	}
}

export function editChannel(app: App, initial: Channel | null): Promise<Channel | null> {
	return new Promise((resolve) => {
		new ChannelModal(app, initial, resolve).open();
	});
}
