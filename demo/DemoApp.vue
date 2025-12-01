<template>
	<div class="demo-app">
		<!-- 控制面板 -->
		<div class="control-panel">
			<el-card>
				<template #header>
					<div class="card-header">
						<span>控制面板</span>
					</div>
				</template>
				<div class="controls">
					<el-button type="primary" @click="isOverlayVisible = true">
						打开批量发送对话框
					</el-button>
					<el-button type="success" @click="isTemplateManagerVisible = true">
						打开模板管理
					</el-button>
				</div>
				<div
					class="info"
					style="
						margin-top: 16px;
						padding-top: 16px;
						border-top: 1px solid #eee;
					"
				>
					<p><strong>当前模板数量：</strong>{{ templateCount }}</p>
				</div>
			</el-card>
		</div>

		<!-- 批量发送对话框 -->
		<Overlay v-model="isOverlayVisible" />

		<!-- 模板管理对话框 -->
		<TemplateManager
			v-model="isTemplateManagerVisible"
			@update:modelValue="handleTemplateManagerUpdate"
		/>
	</div>
</template>

<script setup>
import { ref, computed } from "vue";
import Overlay from "../src/components/Overlay.vue";
import TemplateManager from "../src/components/TemplateManager.vue";
import { TEMPLATE_OPTIONS } from "../src/constants";

const isOverlayVisible = ref(false);
const isTemplateManagerVisible = ref(false);

const templateCount = computed(() => TEMPLATE_OPTIONS.value?.length || 0);

// 监听模板管理更新
function handleTemplateManagerUpdate(value) {
	// 对话框关闭时的处理
}
</script>

<style scoped>
.demo-app {
	padding: 20px;
}

.control-panel {
	margin-bottom: 20px;
}

.card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.controls {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
}

.info p {
	margin: 8px 0;
	color: #666;
	font-size: 14px;
}
</style>
