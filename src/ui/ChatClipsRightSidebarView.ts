/*
 * @Author       spgrvn
 * @Date         2024-12-31 17:01:57
 * @LastEditors  spgrvn
 * @LastEditTime 2024-12-31 17:02:12
 * @FilePath     \obsidian-chat-clips\src\ui\ChatClipsRightSidebarView.ts
 * @Description  这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {
	ItemView,
	WorkspaceLeaf,
	MarkdownRenderer,
	Workspace,
	Plugin,
	TFile,
} from "obsidian";
import { Constants, Optional } from "src/common/Constants";
import { ChatClipsResolver } from "src/resolver/ChatClipsResolver";
import { LeafUtil } from "src/common/LeafUtil";

export const CHAT_CLIPS_RIGHT_SIDEBAR_VIEW_TYPE = `${Constants.BASE_NAME}-right-sidebar-view`;
const BASE_DISPLAY_TEXT = `${Constants.BASE_DISPLAY_TEXT_CAP} (first)`;

export class ChatClipsRightSidebarView extends ItemView {
	private readonly resolver: ChatClipsResolver;

	constructor(leaf: WorkspaceLeaf, resolver: ChatClipsResolver) {
		super(leaf);
		this.icon = "messages-square";
		this.displayText = BASE_DISPLAY_TEXT;
		this.resolver = resolver;
	}

	getViewType() {
		return CHAT_CLIPS_RIGHT_SIDEBAR_VIEW_TYPE;
	}

	private displayText: string;

	getDisplayText() {
		return this.displayText;
	}

	async setDisplayTextFor(filename?: string) {
		const displayText = filename
			? `${BASE_DISPLAY_TEXT} in ${filename}`
			: `${BASE_DISPLAY_TEXT}`;
		if (displayText === this.displayText) {
			return;
		}

		this.displayText = displayText;
		const viewState = { ...this.leaf.getViewState() };
		viewState.state = { ...viewState.state };
		viewState.state.viewTitle = this.displayText;
		await this.leaf.setViewState(viewState);
	}

	async onOpen() {
		this.displayDefaultContent();
		this.contentEl.addClass(Constants.CHAT_CLIPS_CONTAINER_CLS);
		await ChatClipsRightSidebarView.refreshView(this);
	}

	static async refreshViewIfFileIsActive(
		view: ChatClipsRightSidebarView,
		file: Optional<TFile>
	) {
		if (file !== view.app.workspace.getActiveFile()) {
			return;
		}
		return ChatClipsRightSidebarView.doRefreshView(view, file);
	}

	static async refreshView(view: ChatClipsRightSidebarView) {
		const file = view.app.workspace.getActiveFile();
		return ChatClipsRightSidebarView.doRefreshView(view, file);
	}

	static async doRefreshView(
		view: ChatClipsRightSidebarView,
		file: Optional<TFile>
	): Promise<void> {
		if (!file) {
			view.displayDefaultContent();
		} else {
			const cache = await view.resolver.resolveMarkdownFile(file);
			if (!cache.targetMarkdown) {
				view.displayDefaultContent();
			} else {
				await view.renderMarkdown(cache.targetMarkdown, file.path);
			}
		}

		await view.setDisplayTextFor(file?.basename);
	}

	displayDefaultContent() {
		const container = this.containerEl.children[1];
		if (container.find(`.${Constants.PANE_EMPTY_CLS_FOR_RIGHT_SIDEBAR}`)) {
			return;
		}
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

	static async reveal(workspace: Workspace) {
		return await workspace.ensureSideLeaf(
			CHAT_CLIPS_RIGHT_SIDEBAR_VIEW_TYPE,
			"right",
			{ reveal: true }
		);
	}

	static isVisible(workspace: Workspace): boolean {
		return LeafUtil.isLeavesOfTypeVisible(
			CHAT_CLIPS_RIGHT_SIDEBAR_VIEW_TYPE,
			workspace
		);
	}

	static async applyToViews(
		workspace: Workspace,
		callback: (view: ChatClipsRightSidebarView) => Promise<void>
	) {
		await Promise.allSettled(
			workspace
				.getLeavesOfType(CHAT_CLIPS_RIGHT_SIDEBAR_VIEW_TYPE)
				.map(async (leaf) => {
					if (leaf?.view instanceof ChatClipsRightSidebarView) {
						await callback(leaf.view);
					}
				})
		);
	}
}
