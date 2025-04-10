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

		let output = "";
		// [\r\n]: avoid infinite loop at empty line
		const lineRegex = /^([\t ]*)((([-+*]|((\d+)\.)) )?(.*))$([\r\n]?)/gm;
		lineRegex.lastIndex =
			startMatch.index + startMatch[0].length + startIndex;
		for (
			let lineMatch, prevBlankLines = 0, contentItemLevel = 0, lb = true;
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
			const indentlevel0 = indentsMatch?.length ?? 0;
			const prefix0 = MarkdownParser.generateQuotePrefix(indentlevel0);
			if (prevBlankLines) {
				output += `${prefix0}\n`;
			}
			prevBlankLines = 0;

			if (!marker) {
				const prefixI =
					MarkdownParser.generateQuotePrefix(contentItemLevel);
				const prefixC =
					indentlevel0 > contentItemLevel
						? MarkdownParser.generateIndents(
								indentlevel0 - contentItemLevel
						  )
						: "";
				output += `${prefixI}${prefixC}${content}\n`;
				continue;
			}

			output += `${prefix0}\n`;
			const indentlevel1 = indentlevel0 + 1;
			const prefix1 = MarkdownParser.generateQuotePrefix(indentlevel1);

			if (markerNum?.length) {
				if (indentlevel0 === 0) {
					let title: (() => string) | undefined;
					if (content.startsWith('"') && content.endsWith('"')) {
						title = () =>
							`${prefix1}[!${
								Constants.DATA_CALLOUT_COMMENTS
							}]+ ${content.substring(1, content.length - 1)}\n`;
					} else {
						const commands = content.trim().split(/[ \t]/);
						for (
							let i = 0, page: string;
							i < commands.length;
							i++
						) {
							switch (commands[i]) {
								case "p":
									page =
										++i < commands.length
											? commands[i]
											: "?";
									title = () =>
										`${prefix1}[!${Constants.DATA_CALLOUT_COMMENTS}|${Constants.DATA_CALLOUT_METADATA_PAGE}]+ ${page}\n`;
									break;
								default:
									title = () =>
										`${prefix1}[!${Constants.DATA_CALLOUT_COMMENTS}]+ ${content}\n`;
									i = commands.length;
									break;
							}
						}
					}

					if (title !== undefined) {
						output += title();
					}
					continue;
				}

				output += `${prefix0}${item}\n`;
			} else {
				contentItemLevel = indentlevel1;
				const calloutType =
					indentlevel1 <= 2
						? Constants.DATA_CALLOUT_COMMENT
						: Constants.DATA_CALLOUT_REPLY;
				output += `${prefix1}[!${calloutType}]\n${prefix1}${content}\n`;
			}
		}

		return output.trimEnd();
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
