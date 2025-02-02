/*
 * @Author       spgrvn
 * @Date         2025-01-05 21:05:37
 * @LastEditors  spgrvn
 * @LastEditTime 2025-01-05 21:05:48
 * @FilePath     \obsidian-chat-clips\common\Constants.ts
 * @Description  这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
export enum Constants {
	BASE_NAME = "chat-clips",
	CHAT_CLIPS_MARKUP_CLS = `${BASE_NAME}-start`,

	DATA_CALLOUT_COMMENTS = "comments",
	DATA_CALLOUT_COMMENT = "comment",
	DATA_CALLOUT_REPLY = "reply",
	DATA_CALLOUT_METADATA_PAGE = "page",

	EL_DIV_CLS = "el-div",
	EL_OL_CLS = "el-ol",
	CHAT_CLIPS_CONTAINER_CLS = `${BASE_NAME}-div`,
	PANE_EMPTY_CLS_FOR_RIGHT_SIDEBAR = "pane-empty",
}
