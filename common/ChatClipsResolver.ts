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

	async prepare() {
		const { workspace } = this.app;
		console.log(`${Constants.BASE_NAME}: preparing`);

		// may be null before workspace.onLayoutReady()
		const leaf = workspace.getMostRecentLeaf(workspace.rootSplit);
		if (!(leaf?.view instanceof MarkdownView)) {
			return;
		}
		const { view } = leaf;
		await this.resolveLeaf(leaf);
		if (!this.cache.targetMarkdown) {
			return;
		}
		console.log(`${Constants.BASE_NAME}: rerendering`);
		if (view.getMode() === "preview") {
			view.previewMode.rerender(true);
		}
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
		// resolveLeaf() called 2 times whenever a new tab opened
		// if (view.file === this.cache.file) {
		// 	return;
		// }
		await this.resolveMarkdown(view.file, view.editor.getValue());
	}

	async resolveMarkdown(file: TFile, sourceMarkdown: string) {
		console.log(`${Constants.BASE_NAME}: resolving ${file.path}`);
		const cache = {
			file: file,
			targetMarkdown: this.doResolveMarkdown(sourceMarkdown),
		};
		// console.log(cache.targetMarkdown);
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
	doResolveMarkdown(markdown: string): string {
		// Don't match blank lines after that to count prevBlankLines correctly.
		const pattern = new RegExp(
			`^\\d+\\. +<span\\s+[^>]*\\bclass\\s*=\\s*["'][^"']*\\b${Constants.CHAT_CLIPS_MARKUP_CLS}\\b[^"']*["'].*?>.*?<\\/span>.*?$`,
			"sim"
		);
		const contentMatch = pattern.exec(markdown);
		if (!contentMatch) {
			return "";
		}

		let output = "";
		const startPos = contentMatch.index + contentMatch[0].length;
		const lineRegex = /^([\t ]*)(([-+*]|((\d+)\.)) )?(.*)$[\r\n]/gm;
		lineRegex.lastIndex = startPos;
		for (
			let lineMatch, prevBlankLines = 0;
			(lineMatch = lineRegex.exec(markdown)) !== null;

		) {
			const [line, indents, , marker, , markerNum, content] = lineMatch;
			if (!marker) {
				if (
					content &&
					prevBlankLines &&
					!(
						indents.startsWith("\t") ||
						indents.startsWith(" ".repeat(3))
					)
				) {
					break;
				}
			}
			if (!marker && !content) {
				prevBlankLines++;
				continue;
			}

			const indentsMatch = indents.match(/\t|( {1,4})/g);
			const indentlevel = (indentsMatch?.length ?? 0) + 1;
			const prefix = this.generateQuotePrefix(indentlevel);
			if (prevBlankLines) {
				output += `${prefix}\n`;
			}
			prevBlankLines = 0;

			if (!marker) {
				output += `${prefix}${content}\n`;
				continue;
			}

			output += `${this.generateQuotePrefix(indentlevel - 1)}\n`;
			if (markerNum) {
				output += `${prefix}[!${Constants.DATA_CALLOUT_COMMENTS}|${Constants.DATA_CALLOUT_METADATA_PAGE}]+ ${markerNum}`;
			} else {
				const calloutType =
					indentlevel <= 2
						? Constants.DATA_CALLOUT_COMMENT
						: Constants.DATA_CALLOUT_REPLY;
				output += `${prefix}[!${calloutType}]\n${prefix}${content}`;
			}
			output += "\n";
		}

		return output.trimEnd();
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
