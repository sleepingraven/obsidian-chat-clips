/*
 * @Author       sleepingraven
 * @Date         2025-02-13 20:55:17
 * @LastEditors  sleepingraven
 * @LastEditTime 2025-02-13 20:55:41
 * @FilePath     \chat-clips\src\resolver\MarkdownParser.ts
 * @Description  这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Constants } from "src/common/Constants";
import ChatClipsPlugin from "main";

export class MarkdownParser {
	private readonly plugin: ChatClipsPlugin;

	constructor(plugin: ChatClipsPlugin) {
		this.plugin = plugin;
	}

	parse(markdown: string, startIndex = 0): string {
		const startMatch = this.matchStart(markdown, startIndex);
		if (!startMatch) {
			return "";
		}

		const output = new StringBuilder();
		// [\r\n]: avoid infinite loop at empty line
		const lineRegex = /^([\t ]*)((([-+*]|((\d+)\.)) )?(.*))$([\r\n]?)/gm;
		lineRegex.lastIndex =
			startMatch.index + startMatch[0].length + startIndex;
		for (
			let lineMatch, prevBlankLines = 0, contentLevel = 1, lb = true;
			lb && (lineMatch = lineRegex.exec(markdown)) !== null;

		) {
			const [
				_line,
				indents,
				item,
				,
				marker,
				,
				markerNum,
				content,
				lineBreak,
			] = lineMatch;
			// handle empty line at EOF
			lb = !!lineBreak.length;

			const hasIndent = () =>
				indents.startsWith("\t") || indents.startsWith(" ".repeat(3));
			if (!marker) {
				if (content && prevBlankLines && !hasIndent()) {
					break;
				}
			} else {
				if (!hasIndent() && !markerNum?.length) {
					break;
				}
			}
			if (!marker && !content) {
				prevBlankLines++;
				continue;
			}

			const indentsMatch = indents.match(/\t|( {1,4})/g);
			const indentlevel0 = indentsMatch?.length ?? 0,
				indentlevel1 = indentlevel0 + 1;
			if (marker && !markerNum?.length) {
				contentLevel = indentlevel1;
			}

			const _prevBlankLines = prevBlankLines;
			prevBlankLines = 0;
			let contentStr;
			if (!marker) {
				contentStr = content;
			} else if (markerNum?.length && indentlevel0) {
				contentStr = item;
			}
			if (contentStr !== undefined) {
				const prefixI =
					MarkdownParser.generateQuotePrefix(contentLevel);
				const prefixC =
					indentlevel0 > contentLevel
						? MarkdownParser.generateIndents(
								indentlevel0 - contentLevel
						  )
						: "";
				if (_prevBlankLines) {
					output.appendLine(prefixI);
				}
				output.appendLine(prefixI, prefixC, contentStr);
				continue;
			}

			const prefix0 = MarkdownParser.generateQuotePrefix(indentlevel0),
				prefix1 = MarkdownParser.generateQuotePrefix(indentlevel1);
			output.appendLine(prefix0);
			if (markerNum?.length) {
				let titleSupplier: (() => string) | undefined;
				if (content.startsWith('"') && content.endsWith('"')) {
					titleSupplier = () =>
						`${prefix1}${calloutTypeMarkdown({
							data_callout: Constants.DATA_CALLOUT_FOLDER_GROUP,
							data_callout_fold: "+",
						})} ${content.substring(1, content.length - 1)}`;
				} else {
					const commands = content.trim().split(/[ \t]/);
					for (let i = 0, page: string; i < commands.length; i++) {
						switch (commands[i]) {
							case "p":
								page =
									++i < commands.length ? commands[i] : "?";
								titleSupplier = () =>
									`${prefix1}${calloutTypeMarkdown({
										data_callout:
											Constants.DATA_CALLOUT_FOLDER_PAGE,
										data_callout_fold: "+",
									})} ${page}`;
								break;
							default:
								titleSupplier = () =>
									`${prefix1}${calloutTypeMarkdown({
										data_callout:
											Constants.DATA_CALLOUT_FOLDER_GROUP,
										data_callout_fold: "+",
									})} ${content}`;
								i = commands.length;
								break;
						}
					}
				}

				if (titleSupplier) {
					output.appendLine(titleSupplier());
				}
			} else {
				const calloutType = `${Constants.DATA_CALLOUT_COMMENT}-${indentlevel0}`;
				output.appendLine(`${prefix1}[!${calloutType}]`);
				output.appendLine(prefix1, content);
			}
		}

		return output.str.trimEnd();
	}

	private matchStart(markdown: string, startIndex: number) {
		// Don't match blank lines after that to count prevBlankLines correctly.
		let pattern: RegExp;
		switch (this.plugin.settings.locator) {
			case "class":
				pattern = new RegExp(
					`^\\d+\\. +<span\\s+[^>]*\\bclass\\s*=\\s*["'][^"']*\\b${Constants.CHAT_CLIPS_MARKUP_CLS}\\b[^"']*["'].*?>.*?<\\/span>.*?$`,
					"sim"
				);
				break;
			default:
				pattern = new RegExp(
					`^\\d+\\. +#${Constants.ABBREVIATION}([ \\t].*)?$`,
					"im"
				);
		}
		return pattern.exec(markdown.substring(startIndex));
	}

	static generateIndents = MarkdownParser.quickRepeat("\t");
	static generateQuotePrefix = MarkdownParser.quickRepeat(">");

	static quickRepeat(toRepeat: string): (occurrence: number) => string {
		const quotePrefix: Array<string> = ["", toRepeat];
		return (occurrence: number) => {
			return (
				quotePrefix[occurrence] ??
				(quotePrefix[occurrence] = quotePrefix[1].repeat(occurrence))
			);
		};
	}
}

type CalloutTypeParams = {
	data_callout: string;
	data_callout_metadata?: string;
	data_callout_fold?: "+";
};
function calloutTypeMarkdown({
	data_callout,
	data_callout_metadata,
	data_callout_fold,
}: CalloutTypeParams) {
	return `[!${
		data_callout_metadata?.length
			? data_callout + "|" + data_callout_metadata
			: data_callout
	}]${data_callout_fold ?? ""}`;
}

class StringBuilder {
	private _str: string;

	constructor(str = "") {
		this._str = str;
	}

	get str() {
		return this._str;
	}

	appendLine(...lineSubstrings: string[]) {
		this._str = this._str.concat(...lineSubstrings, "\n");
	}
}
