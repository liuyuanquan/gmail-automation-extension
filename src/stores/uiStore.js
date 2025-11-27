import { openWriteEmail } from "../utils";

export const useUIStore = defineStore("ui", () => {
	// UI 状态
	const isDialogVisible = ref(false);

	// 监听 Dialog 显示状态，显示时打开撰写视图
	watch(
		() => isDialogVisible.value,
		async (visible) => {
			if (visible) {
				await openWriteEmail();
			}
		}
	);

	return {
		// State
		isDialogVisible,
	};
});
