/*
 * @Author       sleepingraven
 * @Date         2025-02-05 16:18:48
 * @LastEditors  sleepingraven
 * @LastEditTime 2025-02-05 16:19:01
 * @FilePath     \obsidian-chat-clips\common\LeafUtil.ts
 * @Description  这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { WorkspaceLeaf, Workspace } from "obsidian";

export class LeafUtil {
	static isLeavesOfTypeVisible(type: string, workspace: Workspace): boolean {
		return workspace.getLeavesOfType(type).some(LeafUtil.isLeafVisible);
	}

	static isLeafVisible(leaf: WorkspaceLeaf): boolean {
		if (leaf.isDeferred) {
			return false;
		}
		const containerEl = leaf.view.containerEl;
		return containerEl.offsetParent !== null;
	}

	static isLeafInRootSplit(
		leaf: WorkspaceLeaf,
		workspace: Workspace
	): boolean {
		for (let p = leaf.parent; p; p = p.parent) {
			if (p === workspace.rootSplit) {
				return true;
			}
		}
		return false;
	}
}
