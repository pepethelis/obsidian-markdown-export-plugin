import { App, ConfirmationModal } from "obsidian";

interface ConfirmParams {
	title: string;
	message: string;
	confirmLabel: string;
	destructive?: boolean;
}

class ResolvingConfirmationModal extends ConfirmationModal {
	confirmed = false;

	constructor(
		app: App,
		params: ConfirmParams,
		private onResult: (confirmed: boolean) => void,
	) {
		super(app);
		this.setTitle(params.title);
		this.setContent(params.message);
		this.addButton((btn) => {
			btn.setButtonText(params.confirmLabel)
				.setInitialFocus()
				.onClick(() => {
					this.confirmed = true;
				});
			if (params.destructive) btn.setDestructive();
			else btn.setCta();
		});
		this.addCancelButton();
	}

	onClose() {
		super.onClose();
		this.onResult(this.confirmed);
	}
}

/** Asks the user to confirm an action; resolves false on cancel or dismissal. */
export function confirmAction(app: App, params: ConfirmParams): Promise<boolean> {
	return new Promise((resolve) => {
		new ResolvingConfirmationModal(app, params, resolve).open();
	});
}
