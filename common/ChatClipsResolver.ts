import {
	App,
	Editor,
	MarkdownView,
	Notice,
	WorkspaceLeaf,
	TFile,
} from "obsidian";
import { Constants } from "common/Constants";

type ResolveCache = {
	readonly file: TFile | null | undefined;
	readonly targetMarkdown: string;
};
type TaskKeys = "contentResolved";
type Tasks = {
	[key in TaskKeys]: ((
		cache: ResolveCache,
		presentCache: ResolveCache
	) => Promise<void>)[];
};

export class ChatClipsResolver {
	private readonly app: App;
	private cache: ResolveCache;
	readonly tasks: Tasks;

	constructor(app: App) {
		this.app = app;
		this.cache = { file: undefined, targetMarkdown: "" };
		this.tasks = {
			contentResolved: [],
		};
	}

	getTargetMarkdown() {
		return this.cache.targetMarkdown;
	}

	prepare() {
		const { workspace } = this.app;
		// may be null before workspace.onLayoutReady
		const leaf = workspace.getMostRecentLeaf(workspace.rootSplit);
		if (
			leaf?.view instanceof MarkdownView &&
			this.cache.targetMarkdown.length
		) {
			const { view } = leaf;
			if (view.getMode() === "preview" && view?.file?.path) {
				console.log(
					`${Constants.BASE_NAME}: rerendering ${view.file.path}`
				);
				leaf.view.previewMode.rerender(true);
			}
		}
		return;
	}

	async resolveLeaf(leaf: WorkspaceLeaf | null) {
		if (!leaf) {
			return;
		}
		const { view } = leaf;
		if (!(view instanceof MarkdownView)) {
			const { workspace } = this.app;
			if (leaf === workspace.getMostRecentLeaf(workspace.rootSplit)) {
				const cache = {
					file: null,
					targetMarkdown: "",
				} as ResolveCache;
				await this.iterateTasks(cache);
			}
			return;
		}

		if (!view.file) {
			new Notice("Chat Clips: No associated file found!");
			return;
		}
		await this.resolveMarkdown(view.file, view.editor.getValue());
	}

	async resolveMarkdown(file: TFile, sourceMarkdown: string) {
		console.log(`${Constants.BASE_NAME}: resolving ${file.path}`);
		const cache = {
			file: file,
			targetMarkdown: this.doResolveMarkdown(sourceMarkdown).trimEnd(),
		};
		await this.iterateTasks(cache);
	}

	private async iterateTasks(cache: ResolveCache) {
		await Promise.all(
			this.tasks.contentResolved.map(
				async (f) => await f(cache, this.cache)
			)
		).then(
			(() => {
				this.cache = cache;
			}).bind(this)
		);
	}

	/**
	 * todo recognize by codemirror
	 */
	doResolveMarkdown(content: string): string {
		const startMarkHeadingContent = Constants.START_MARK;
		const pattern = new RegExp(
			`^#+ +${startMarkHeadingContent}$\\s*$[\\r\\n]`,
			"m"
		);
		const contentMatch = pattern.exec(content);
		if (!contentMatch) {
			return "";
		}

		let output = "";
		const startPos = contentMatch.index + contentMatch[0].length;
		const lineRegex = /^([\t ]*)(([-+*]|((\d+)\.)) (.+))?$/gm;
		lineRegex.lastIndex = startPos;
		for (let lineMatch; (lineMatch = lineRegex.exec(content)) !== null; ) {
			const [line, indents, item, marker, , markerNum, itemContent] =
				lineMatch;
			if (!marker) {
				break;
			}

			const indentsMatch = indents.match(/\t|( {1,4})/g);
			const indentlevel = (indentsMatch?.length ?? 0) + 1;
			const prefix = this.generateQuotePrefix(indentlevel);
			output += `${this.generateQuotePrefix(indentlevel - 1)}\n`;
			if (markerNum) {
				output += `${prefix}[!${Constants.DATA_CALLOUT_COMMENTS}|${Constants.DATA_CALLOUT_METADATA_PAGE}]+ ${markerNum}`;
			} else {
				const calloutTpe =
					indentlevel <= 2
						? Constants.DATA_CALLOUT_COMMENT
						: Constants.DATA_CALLOUT_REPLY;
				output += `${prefix}[!${calloutTpe}]\n${prefix}${itemContent}`;
			}
			output += "\n";
		}

		return output;
	}

	generateQuotePrefix = (function (
		toRepeat: string
	): (occurrence: number) => string {
		const quotePrefix: Array<string> = ["", toRepeat];
		return (occurrence: number) => {
			return (
				quotePrefix[occurrence] ??
				(quotePrefix[occurrence] = quotePrefix[1].repeat(occurrence))
			);
		};
	})(">");
}
