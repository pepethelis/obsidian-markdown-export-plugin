export const escapeMarkdownV2 = (text: string): string => {
	return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
};

export const parenthesesEscape = (input: string): string => {
	return input.replace(/\(/g, "\\(").replace(/\)/g, "\\)");
};

export const plusEscape = (input: string): string => {
	return input.replace(/(?<!\\)\+/g, "\\+");
};

export const minusEscape = (input: string): string => {
	return input.replace(/(?<!\\)-/g, "\\-");
};
