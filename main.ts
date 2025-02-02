/*
 * @Author       spgrvn
 * @Date         2024-12-30 17:05:32
 * @LastEditors  spgrvn
 * @LastEditTime 2025-01-02 18:54:36
 * @FilePath     \obsidian-chat-clips\main.ts
 * @Description  这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {
	App,
	Editor,
	Notice,
	Plugin,
	WorkspaceLeaf,
	normalizePath,
	MarkdownRenderer,
} from "obsidian";
import {
	ChatClipsRightSidebarView,
	CHAT_CLIPS_RIGHT_SIDEBAR_VIEW_TYPE,
} from "ui/ChatClipsRightSidebarView";
import {
	ChatClipsPluginSettings,
	CHAT_CLIPS_DEFAULT_SETTINGS,
} from "ui/SampleSettingTab";
import { ChatClipsSettingTab } from "ui/SampleSettingTab";
import { Constants } from "common/Constants";
import { ChatClipsResolver } from "common/ChatClipsResolver";

/* (ref: https://forum.obsidian.md/t/is-there-a-pre-render-pre-processor-callback/72530) */

/**
 * tofix if we edit the list mark number, it doesn't rerender
 * tofix must start by "<span" in 1st item
 */
export default class ChatClipsPlugin extends Plugin {
	private settings: ChatClipsPluginSettings;

	async onload() {
		const { workspace } = this.app;
		await this.loadSettings();

		this.registerView(
			CHAT_CLIPS_RIGHT_SIDEBAR_VIEW_TYPE,
			(leaf) => new ChatClipsRightSidebarView(leaf)
		);

		const resolver = new ChatClipsResolver(this.app);
		workspace.onLayoutReady(async () => {
			resolver.tasks.contentResolved.push((cache, presentCache) =>
				this.applyToView(async (view) => {
					const setViewDisplayText = cache.file !== presentCache.file;
					if (cache.targetMarkdown) {
						if (!cache.file) {
							return;
						}
						await view.renderMarkdown(
							cache.targetMarkdown,
							normalizePath(cache.file.path)
						);
					} else {
						if (presentCache.targetMarkdown) {
							await view.displayDefaultContent();
						}
					}
					if (setViewDisplayText) {
						await view.setDisplayTextFor(cache?.file?.basename);
					}
				})
			);

			await resolver.prepare();
			// outside workspace.onLayoutReady() provides empty editor value
			this.registerEvent(
				workspace.on(
					"active-leaf-change",
					await resolver.resolveLeaf.bind(resolver)
				)
			);
			this.registerEvent(
				workspace.on(
					"quick-preview",
					await resolver.resolveMarkdown.bind(resolver)
				)
			);

			await workspace.ensureSideLeaf(
				CHAT_CLIPS_RIGHT_SIDEBAR_VIEW_TYPE,
				"right",
				{ reveal: false }
			);
		});

		this.registerMarkdownPostProcessor(async (element, context) => {
			const ccOls = element.findAll(
				`ol:has( > li:first-child span.${Constants.CHAT_CLIPS_MARKUP_CLS})`
			);
			let elsToRender: HTMLElement[];
			if (ccOls.length) {
				elsToRender = ccOls
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
			} else {
				const ccDivs = element.findAll(
					`.${Constants.CHAT_CLIPS_CONTAINER_CLS}`
				);
				if (ccDivs.length) {
					elsToRender = ccDivs;
				} else {
					return;
				}
			}
			console.log(
				`${Constants.BASE_NAME}: rendering ${context.sourcePath}`
			);
			for (const el of elsToRender) {
				await MarkdownRenderer.render(
					this.app,
					resolver.getTargetMarkdown(),
					el,
					context.sourcePath,
					this
				);
			}
		});

		// this.addSettingTab(new ChatClipsSettingTab(this.app, this));
	}

	private readonly applyToView = async (
		consumer: (view: ChatClipsRightSidebarView) => Promise<void>
	) => {
		const leaf = this.app.workspace
			.getLeavesOfType(CHAT_CLIPS_RIGHT_SIDEBAR_VIEW_TYPE)
			.first();
		if (leaf?.view instanceof ChatClipsRightSidebarView) {
			await consumer(leaf.view);
		}
	};

	async activeView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(
			CHAT_CLIPS_RIGHT_SIDEBAR_VIEW_TYPE
		);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getRightLeaf(false);
			if (!leaf) {
				new Notice("Chat Clips: View creating failed!");
				return;
			}
			await leaf.setViewState({
				type: CHAT_CLIPS_RIGHT_SIDEBAR_VIEW_TYPE,
			});
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		await workspace.revealLeaf(leaf);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			CHAT_CLIPS_DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
