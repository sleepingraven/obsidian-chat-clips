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
 * tofix If we use heading like "## chat-clips" to indicate, without mark in the list, then in preview mode we must append the output element to the heading, however,
 * - if we hide the following list use css, the scroll goes wrong;
 * - if we edit the list, it doesn't rerender.
 *
 * tofix lists with an empty line merges to one list.
 */
export default class ChatClipsPlugin extends Plugin {
	private settings: ChatClipsPluginSettings;

	async onload() {
		const { workspace } = this.app;
		await this.loadSettings();

		const resolver = new ChatClipsResolver(this.app);
		resolver.tasks.contentResolved.push((cache, presentCache) =>
			this.applyToView(async (view) => {
				const setViewDisplayText = cache.file !== presentCache.file;
				if (cache.targetMarkdown.length) {
					if (!cache.file) {
						return;
					}
					await view.renderMarkdown(
						cache.targetMarkdown,
						normalizePath(cache.file.path)
					);
				} else {
					if (presentCache.targetMarkdown.length) {
						await view.displayDefaultContent();
					}
				}
				if (setViewDisplayText) {
					await view.setDisplayTextFor(cache?.file?.basename);
				}
			})
		);

		this.registerView(
			CHAT_CLIPS_RIGHT_SIDEBAR_VIEW_TYPE,
			(leaf) => new ChatClipsRightSidebarView(leaf)
		);
		workspace.onLayoutReady(async () => {
			resolver.prepare();
			await workspace.ensureSideLeaf(
				CHAT_CLIPS_RIGHT_SIDEBAR_VIEW_TYPE,
				"right",
				{ reveal: false }
			);
		});

		this.registerMarkdownPostProcessor(async (element, context) => {
			if (!resolver.getTargetMarkdown().length) {
				return;
			}
			const ccHeadings = element.findAll(
				`[${Constants.DATA_HEADING_ATTR}="${Constants.START_MARK}"]`
			);
			if (!ccHeadings.length) {
				return;
			}
			console.log(
				`${Constants.BASE_NAME}: rendering ${context.sourcePath}`
			);
			await Promise.all(
				ccHeadings
					.map((h) => h.parentElement)
					.filter((p) => p !== null)
					.map(async (p) => {
						const el = createDiv({
							cls: [
								Constants.EL_DIV_CLS,
								Constants.CHAT_CLIPS_CONTAINER_CLS,
							],
						});
						p.appendChild(el);
						await MarkdownRenderer.render(
							this.app,
							resolver.getTargetMarkdown(),
							el,
							context.sourcePath,
							this
						);
					})
			);
		});

		this.registerEvent(
			workspace.on(
				"active-leaf-change",
				// await resolver.resolveLeaf.bind(resolver)
				async (leaf) => {
					console.log(`${Constants.BASE_NAME}: active event`);
					await resolver.resolveLeaf(leaf);
				}
			)
		);
		this.registerEvent(
			workspace.on(
				"quick-preview",
				await resolver.resolveMarkdown.bind(resolver)
			)
		);

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
