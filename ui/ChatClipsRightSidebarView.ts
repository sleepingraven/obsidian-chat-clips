/*
 * @Author       spgrvn
 * @Date         2024-12-31 17:01:57
 * @LastEditors  spgrvn
 * @LastEditTime 2024-12-31 17:02:12
 * @FilePath     \obsidian-chat-clips\ui\ChatClipsRightSidebarView.ts
 * @Description  这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {
	ItemView,
	WorkspaceLeaf,
	MarkdownRenderer,
	Workspace,
	Plugin,
} from "obsidian";
import { Constants } from "common/Constants";

export const CHAT_CLIPS_RIGHT_SIDEBAR_VIEW_TYPE = `${Constants.BASE_NAME}-right-side-view`;
const BASE_DISPLAY_TEXT = "Chat Clips";

export class ChatClipsRightSidebarView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.icon = "messages-square";
		this.displayText = BASE_DISPLAY_TEXT;
	}

	getViewType() {
		return CHAT_CLIPS_RIGHT_SIDEBAR_VIEW_TYPE;
	}

	private displayText: string;

	getDisplayText() {
		return this.displayText;
	}

	async setDisplayTextFor(filename?: string) {
		this.displayText = filename
			? BASE_DISPLAY_TEXT + ` in ${filename}`
			: BASE_DISPLAY_TEXT;
		const viewState = { ...this.leaf.getViewState() };
		viewState.state = { ...viewState.state };
		viewState.state.viewTitle = this.displayText;
		await this.leaf.setViewState(viewState);
	}

	async onOpen() {
		await this.displayDefaultContent();
		this.contentEl.addClass(Constants.CHAT_CLIPS_CONTAINER_CLS);
	}

	async displayDefaultContent() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createDiv({
			cls: Constants.PANE_EMPTY_CLS_FOR_RIGHT_SIDEBAR,
			text: "No Chat clips found.",
		});
	}

	async renderMarkdown(markdown: string, sourcePath: string) {
		const el: HTMLElement = this.contentEl;
		el.empty();
		await MarkdownRenderer.render(this.app, markdown, el, sourcePath, this);
	}

	async onClose() {
		// Nothing to clean up.
	}
}
