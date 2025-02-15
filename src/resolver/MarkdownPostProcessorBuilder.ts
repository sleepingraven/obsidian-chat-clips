/*
 * @Author       sleepingraven
 * @Date         2025-02-14 18:55:29
 * @LastEditors  sleepingraven
 * @LastEditTime 2025-02-14 19:18:44
 * @FilePath     \obsidian-chat-clips\src\resolver\MarkdownPostProcessorBuilder.ts
 * @Description  这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {
	App,
	Notice,
	Plugin,
	MarkdownPostProcessor,
	MarkdownRenderer,
	MarkdownSectionInformation,
	TFile,
} from "obsidian";
import ChatClipsPlugin from "main";
import { ChatClipsResolver } from "src/resolver/ChatClipsResolver";
import { Constants, ENV_VAR } from "src/common/Constants";

export class MarkdownPostProcessorBuilder {
	private readonly plugin: ChatClipsPlugin;
	private readonly resolver: ChatClipsResolver;

	constructor(plugin: ChatClipsPlugin, resolver: ChatClipsResolver) {
		this.plugin = plugin;
		this.resolver = resolver;
	}

	build(): MarkdownPostProcessor {
		return async (element, context) => {
			const sectionInfo = context.getSectionInfo(element);
			if (!sectionInfo) {
				return;
			}

			let ccOls: HTMLElement[];
			let tagged = false;
			switch (this.plugin.settings.locator) {
				case "class":
					ccOls = element.findAll(
						`ol:has( > li:first-child span.${Constants.CHAT_CLIPS_MARKUP_CLS})`
					);
					break;
				default:
					ccOls = element.findAll(
						`ol:has( > li:first-child .${Constants.TAG_CLS}[href='#${Constants.ABBREVIATION}'])`
					);
					tagged = true;
			}
			if (!ccOls.length) {
				return;
			}

			const file = this.plugin.app.vault.getFileByPath(
				context.sourcePath
			);
			if (!file) {
				new Notice(
					`${Constants.BASE_DISPLAY_TEXT_CAP}: cannot find file in path "${context.sourcePath}".`
				);
				return;
			}
			/*
			const cache = await this.resolver.resolveMarkdown(
				file,
				sectionInfo.text,
				{ force: false }
			);
			*/
			const startIndex = MarkdownPostProcessorBuilder.findLineStart(
				sectionInfo.text,
				sectionInfo.lineStart
			);
			const targetMarkdown = this.resolver.parser.parse(
				sectionInfo.text,
				startIndex
			);
			if (!targetMarkdown) {
				return;
			}

			const elsToRender: HTMLElement[] = ccOls
				.map((ol) => ol.parentElement)
				.filter((parentElement) => parentElement !== null)
				.map((parentElement) => {
					parentElement.empty();
					parentElement.removeClass(Constants.EL_OL_CLS);
					parentElement.addClasses([Constants.EL_DIV_CLS]);
					return parentElement.createDiv({
						cls: [Constants.CHAT_CLIPS_CONTAINER_CLS],
					});
				});

			ENV_VAR.logDevMessage(() => `rendering ${context.sourcePath}`);
			for (const el of elsToRender) {
				await MarkdownRenderer.render(
					this.plugin.app,
					tagged ? `#chatclips\n${targetMarkdown}` : targetMarkdown,
					el,
					context.sourcePath,
					this.plugin
				);
				break;
			}
		};
	}

	static findLineStart(text: string, n: number) {
		let i;
		for (i = 0; i < text.length; i++) {
			if (n === 0) {
				break;
			}
			if (text[i] === "\n") {
				n--;
			}
		}
		return i;
	}
}
