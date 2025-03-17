/*
 * @Author       sleepingraven
 * @Date         2025-01-07 15:09:24
 * @LastEditors  sleepingraven
 * @LastEditTime 2025-02-13 17:16:33
 * @FilePath     \chat-clips\src\resolver\ChatClipsResolver.ts
 * @Description  这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { MarkdownView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { Constants, ENV_VAR, Nullable } from "src/common/Constants";
import ChatClipsPlugin from "main";
import { LeafUtil } from "src/common/LeafUtil";
import { MarkdownParser } from "src/resolver/MarkdownParser";

type TaskKeys = "afterResolve";
type Tasks = {
	[key in TaskKeys]: ((file: Nullable<TFile>) => Promise<void>)[];
};

class parsedCache {
	readonly targetMarkdown: string;
}

export type Options = {
	force: boolean;
};

export class ChatClipsResolver {
	private readonly plugin: ChatClipsPlugin;
	readonly parser: MarkdownParser;

	private _cacheMap: WeakMap<TFile, Promise<parsedCache>>;
	private readonly _tasks: Tasks;

	constructor(plugin: ChatClipsPlugin) {
		this.plugin = plugin;
		this.parser = new MarkdownParser(plugin);
		this._cacheMap = new WeakMap();
		this._tasks = {
			afterResolve: [],
		};
	}

	get cacheMap(): typeof this._cacheMap {
		return this._cacheMap;
	}
	get tasks(): typeof this._tasks {
		return this._tasks;
	}

	async clearCache() {
		this._cacheMap = new WeakMap();
		await this.rerenderRootSplitViews();
	}

	async rerenderRootSplitViews() {
		// outside workspace.onLayoutReady() provides empty editor value
		const { workspace } = this.plugin.app;
		ENV_VAR.logDevMessage(() => `prepare rerendering`);

		// getMostRecentLeaf() may be null before workspace.onLayoutReady()
		workspace.iterateRootLeaves(async (leaf) => {
			if (!LeafUtil.isLeafVisible(leaf)) {
				return;
			}

			if (!(leaf?.view instanceof MarkdownView)) {
				return;
			}
			const { view } = leaf;
			const cache = await this.resolveLeaf(leaf);
			if (!cache) {
				return;
			}

			ENV_VAR.logDevMessage(() => `rerendering`);
			view.previewMode.rerender(true);
		});
	}

	async resolveMostRecentLeaf(op: Options) {
		const { workspace } = this.plugin.app;
		const leaf = workspace.getMostRecentLeaf(workspace.rootSplit);
		return this.resolveLeaf(leaf, op);
	}

	async resolveLeaf(
		leaf: WorkspaceLeaf | null,
		op: Options = {
			force: true,
		}
	): Promise<parsedCache | undefined> {
		if (!leaf) {
			return;
		}
		const { workspace } = this.plugin.app;
		if (!LeafUtil.isLeafInRootSplit(leaf, workspace)) {
			return;
		}
		const { view } = leaf;
		if (!(view instanceof MarkdownView)) {
			if (view.getViewType() === "empty") {
				await this.iterateTasks(null);
			}
			return;
		}

		if (!view.file) {
			new Notice(
				`${Constants.BASE_DISPLAY_TEXT_CAP}: No associated file found.`
			);
			return;
		}
		// resolveLeaf() called 2 times whenever a new tab opened

		return await this.resolveMarkdown(
			view.file,
			view.editor.getValue(),
			op
		);
	}

	async resolveMarkdownFile(
		file: TFile,
		op: Options = {
			force: false,
		}
	): Promise<parsedCache> {
		const content = await this.plugin.app.vault.cachedRead(file);
		return this.resolveMarkdown(file, content, op);
	}

	async resolveMarkdown(
		file: TFile,
		sourceMarkdown: string,
		op: Options
	): Promise<parsedCache> {
		if (!op.force) {
			const cache = this._cacheMap.get(file);
			if (cache) {
				return cache;
			}
		}

		const parsePromise = new Promise<parsedCache>((resolve) => {
			ENV_VAR.logDevMessage(() => `resolving ${file.path}`);
			const cache = {
				targetMarkdown: this.parser.parse(sourceMarkdown),
			} as parsedCache;
			if (ENV_VAR.printParsedMarkdown) {
				console.log(cache.targetMarkdown);
			}
			resolve(cache);
		})
			.then(
				(cache) => {
					this.cacheMap.set(file, Promise.resolve(cache));
					return cache;
				},
				(reason) => {
					new Notice(
						`${Constants.BASE_DISPLAY_TEXT_CAP}: cannot resolve file in path "${file.path}".`
					);
					console.error(reason);
					return { targetMarkdown: "" } as parsedCache;
				}
			)
			.then(async (cache) => {
				await this.iterateTasks(file);
				return cache;
			});

		// todo sync
		this.cacheMap.set(file, parsePromise);
		return parsePromise;
	}

	async iterateTasks(file: Nullable<TFile>) {
		await Promise.allSettled(
			this._tasks.afterResolve.map(async (f) => await f(file))
		);
	}
}
