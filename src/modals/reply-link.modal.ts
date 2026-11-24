import { App, ConfirmationModal, TextComponent } from "obsidian";
import { parsePostLink, PostRef } from "../helpers/telegramLinks";

/**
 * Small prompt for the Telegram post to reply to. Kept separate from the export
 * modal so that modal has no text inputs and the mobile keyboard never covers it;
 * here the input sits at the top with the buttons right below it.
 */
class ReplyLinkModal extends ConfirmationModal {
	private result: PostRef | null = null;

	constructor(
		app: App,
		private onResult: (post: PostRef | null) => void,
	) {
		super(app);
		this.setTitle("Reply to post");

		const input = new TextComponent(this.contentEl).setPlaceholder("https://t.me/…");
		input.inputEl.addClass("md-export-reply-input");
		const errorEl = this.contentEl.createDiv({ cls: "md-export-reply-error" });

		let submitEl: HTMLElement | null = null;
		this.addButton((btn) => {
			submitEl = btn.buttonEl;
			btn.setButtonText("Continue")
				.setCta()
				.onClick(() => {
					const post = parsePostLink(input.getValue());
					if (!post) {
						errorEl.setText("Paste a post link like https://t.me/channel/123");
						return true; // keep the modal open
					}
					this.result = post;
				});
		});
		this.addCancelButton();

		input.inputEl.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter") {
				evt.preventDefault();
				submitEl?.click();
			}
		});
	}

	onOpen() {
		super.onOpen();
		this.contentEl.querySelector("input")?.focus();
	}

	onClose() {
		super.onClose();
		this.onResult(this.result);
	}
}

/** Resolves to the post to reply to (possibly in another channel), or null if cancelled. */
export function promptReplyPost(app: App): Promise<PostRef | null> {
	return new Promise((resolve) => {
		new ReplyLinkModal(app, resolve).open();
	});
}
