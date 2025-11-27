import { computed, watch } from "vue";
import { useUIStore } from "../stores/uiStore";
import { openComposeView } from "../utils/gmail";

/**
 * Dialog 相关的 composable
 */
export function useDialog() {
	const uiStore = useUIStore();

	// Dialog 显示状态
	const isVisible = computed({
		get: () => uiStore.isDialogVisible,
		set: (value) => {
			if (value) {
				uiStore.showDialog();
			} else {
				uiStore.hideDialog();
			}
		},
	});

	// 关闭 Dialog
	const close = () => {
		uiStore.hideDialog();
	};

	// 监听 Dialog 显示状态，显示时打开撰写视图
	watch(
		() => uiStore.isDialogVisible,
		(isVisible) => {
			if (isVisible) {
				openComposeView();
			}
		}
	);

	return {
		isVisible,
		close,
	};
}
