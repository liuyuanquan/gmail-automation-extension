<template>
	<el-dialog
		v-model="isDialogVisible"
		title="Gmail 批量发送"
		width="360px"
		:close-on-click-modal="true"
		:close-on-press-escape="true"
		@close="isDialogVisible = false"
	>
		<el-form label-width="100px">
			<!-- 模板选择 -->
			<el-form-item label="邮件模板:">
				<el-select
					v-model="template"
					placeholder="选择模板"
					style="width: 100%"
					@change="handleTemplateChange"
				>
					<el-option
						v-for="option in TEMPLATE_OPTIONS"
						:key="option.value"
						:label="option.label"
						:value="option.value"
					/>
				</el-select>
			</el-form-item>

			<!-- Excel 文件输入 -->
			<el-form-item label="Excel导入:">
				<el-upload
					:auto-upload="false"
					:show-file-list="false"
					accept=".xlsx, .xls"
					:on-change="handleExcelChange"
				>
					<el-button type="primary">选择文件</el-button>
				</el-upload>
			</el-form-item>
		</el-form>
		<!-- 按钮组 -->
		<template #footer>
			<div class="button-group">
				<el-button
					type="primary"
					:disabled="!canSend || isSending"
					@click="handleSend"
				>
					{{ sendButtonText }}
				</el-button>
				<el-button type="danger" :disabled="!isSending" @click="handleStop">
					停止发送
				</el-button>
			</div>
		</template>
	</el-dialog>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useUIStore } from "../stores/uiStore";
import { useEmailStore } from "../stores/emailStore";
import { useEmailActions } from "../composables/useEmailActions";
import { TEMPLATE_OPTIONS } from "../constants/templates";

// Dialog
const uiStore = useUIStore();
const { isDialogVisible } = storeToRefs(uiStore);

// Store
const emailStore = useEmailStore();
const { template, handleTemplateChange, handleExcelChange } = emailStore;

// 邮件操作
const { canSend, isSending, sendButtonText, handleSend, handleStop } =
	useEmailActions();
</script>

<style scoped>
.button-group {
	display: flex;
	justify-content: center;
	gap: 16px;
}

.button-group .el-button {
	flex: 1;
}
</style>
