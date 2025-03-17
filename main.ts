/*
 * @Author       spgrvn
 * @Date         2024-12-30 17:05:32
 * @LastEditors  spgrvn
 * @LastEditTime 2025-01-02 18:54:36
 * @FilePath     \chat-clips\main.ts
 * @Description  这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Plugin } from "obsidian";
import {
	ChatClipsRightSidebarView,
	CHAT_CLIPS_RIGHT_SIDEBAR_VIEW_TYPE,
} from "src/ui/ChatClipsRightSidebarView";
import {
	ChatClipsPluginSettings,
	CHAT_CLIPS_DEFAULT_SETTINGS,
} from "src/ui/SettingTab";
import { SettingTab } from "src/ui/SettingTab";
import { ChatClipsResolver } from "src/resolver/ChatClipsResolver";
import { MarkdownPostProcessorBuilder } from "src/resolver/MarkdownPostProcessorBuilder";
import { Constants } from "src/common/Constants";

export default class ChatClipsPlugin extends Plugin {
	private _settings: ChatClipsPluginSettings;

	get settings() {
		return this._settings;
	}

	async onload() {
		const { workspace } = this.app;
		await this.loadSettings();

		const resolver = new ChatClipsResolver(this);

		this.registerView(
			CHAT_CLIPS_RIGHT_SIDEBAR_VIEW_TYPE,
			(leaf) => new ChatClipsRightSidebarView(leaf, resolver)
		);
		this.addCommand({
			id: `${Constants.BASE_NAME}:open`,
			name: `Show ${Constants.BASE_DISPLAY_TEXT}`,
			callback: async () => ChatClipsRightSidebarView.reveal(workspace),
		});

		workspace.onLayoutReady(async () => {
			resolver.tasks.afterResolve.push((file) =>
				ChatClipsRightSidebarView.applyToViews(
					workspace,
					async (view) => {
						await ChatClipsRightSidebarView.refreshViewIfFileIsActive(
							view,
							file
						);
					}
				)
			);

			await ChatClipsRightSidebarView.applyToViews(
				workspace,
				ChatClipsRightSidebarView.refreshView
			);

			this.registerEvent(
				workspace.on("active-leaf-change", async (leaf) => {
					if (ChatClipsRightSidebarView.isVisible(workspace)) {
						await resolver.resolveLeaf(leaf);
					}
				})
			);
			this.registerEvent(
				workspace.on("quick-preview", async (file, data) => {
					await resolver.resolveMarkdown(file, data, { force: true });
				})
			);
		});

		const markdownPostProcessor = new MarkdownPostProcessorBuilder(
			this,
			resolver
		).build();
		this.registerMarkdownPostProcessor(markdownPostProcessor);

		this.addSettingTab(new SettingTab(this.app, this, resolver));
	}

	onunload() {}

	async loadSettings() {
		this._settings = Object.assign(
			{},
			CHAT_CLIPS_DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
