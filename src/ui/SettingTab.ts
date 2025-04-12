/*
 * @Author       sleepingraven
 * @Date         2025-01-07 15:09:24
 * @LastEditors  sleepingraven
 * @LastEditTime 2025-02-03 21:06:52
 * @FilePath     \chat-clips\src\ui\SettingTab.ts
 * @Description  这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { App, PluginSettingTab, Setting } from "obsidian";
import { Dictionary } from "ts-essentials";
import ChatClipsPlugin from "main";
import { Constants } from "src/common/Constants";
import { ChatClipsResolver } from "src/resolver/ChatClipsResolver";

type LocatorRecordKey = keyof typeof locatorRecord;
const locatorRecord: Readonly<Dictionary<string>> = {
	tag: `tag: #${Constants.ABBREVIATION}`,
	class: `css class: span.${Constants.CHAT_CLIPS_MARKUP_CLS}`,
};
export interface ChatClipsPluginSettings {
	locator: LocatorRecordKey;
}

export const CHAT_CLIPS_DEFAULT_SETTINGS: ChatClipsPluginSettings = {
	locator: "tag",
};

export class SettingTab extends PluginSettingTab {
	readonly plugin: ChatClipsPlugin;
	readonly resolver: ChatClipsResolver;

	constructor(
		app: App,
		plugin: ChatClipsPlugin,
		resolver: ChatClipsResolver
	) {
		super(app, plugin);
		this.plugin = plugin;
		this.resolver = resolver;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const settingSupplier = () => new Setting(containerEl);
		settingSupplier()
			.setName("Locator")
			.setDesc(
				`Choose the markup expression that indicates a ${Constants.BASE_DISPLAY_TEXT} list.`
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOptions(locatorRecord)
					.setValue(this.plugin.settings.locator)
					.onChange(async (value) => {
						if (value === this.plugin.settings.locator) {
							return;
						}

						this.plugin.settings.locator =
							value as LocatorRecordKey;
						await this.resolver.clearCache();
						await this.plugin.saveSettings();
					});
			});
	}
}
