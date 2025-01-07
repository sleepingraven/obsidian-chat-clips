import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	MarkdownRenderer,
	WorkspaceLeaf,
	normalizePath,
	ItemView,
	TFile,
} from "obsidian";
import ChatClipsPlugin from "main";

export interface ChatClipsPluginSettings {
	mySetting: string;
}

export const CHAT_CLIPS_DEFAULT_SETTINGS: ChatClipsPluginSettings = {
	mySetting: "default",
};

export class ChatClipsSettingTab extends PluginSettingTab {
	plugin: ChatClipsPlugin;

	constructor(app: App, plugin: ChatClipsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
