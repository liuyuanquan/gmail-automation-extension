import { defineStore } from "pinia";
import { ref } from "vue";

export const useUIStore = defineStore("ui", () => {
	// UI 状态
	const isDialogVisible = ref(false);

	// Actions
	function toggleDialog() {
		isDialogVisible.value = !isDialogVisible.value;
	}

	function showDialog() {
		isDialogVisible.value = true;
	}

	function hideDialog() {
		isDialogVisible.value = false;
	}

	return {
		// State
		isDialogVisible,
		// Actions
		toggleDialog,
		showDialog,
		hideDialog,
	};
});
