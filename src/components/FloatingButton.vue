<template>
	<div class="switch-container">
		<el-switch
			v-model="isDialogVisible"
			:disabled="isGmailLoading"
			inline-prompt
			size="large"
			style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
			active-text="关闭批量发送"
			inactive-text="打开批量发送"
		/>
	</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useGmailStore } from "../stores/gmailStore";
import { storeToRefs } from "pinia";
import { watchElementStyle } from "../utils/dom";

const gmailStore = useGmailStore();
const { isDialogVisible } = storeToRefs(gmailStore);

// Gmail loading 状态：true 表示正在加载（不可交互），false 表示已准备好（可交互）
const isGmailLoading = ref(true);

let stopWatching = null;

onMounted(async () => {
	// 使用 dom.js 封装的方法监听 loading 元素的样式变化
	stopWatching = await watchElementStyle("#loading", (element, display) => {
		// display 为 "none" 表示已准备好（可交互）
		isGmailLoading.value = display !== "none";
	});
});

onUnmounted(() => {
	if (stopWatching) {
		stopWatching();
		stopWatching = null;
	}
});
</script>

<style scoped>
.switch-container {
	position: fixed;
	top: 12px;
	right: 200px;
	z-index: 2000;
}
</style>
