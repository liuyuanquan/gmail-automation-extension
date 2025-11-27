<template>
	<div class="switch-container">
		<el-switch
			v-model="isDialogVisible"
			inline-prompt
			size="large"
			style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
			active-text="关闭批量发送"
			inactive-text="打开批量发送"
		/>
	</div>
</template>

<script setup>
const gmailStore = useGmailStore();
const { isDialogVisible } = storeToRefs(gmailStore);
</script>

<style scoped>
.switch-container {
	position: fixed;
	top: 12px;
	right: 200px;
	z-index: 2000;
}
</style>
