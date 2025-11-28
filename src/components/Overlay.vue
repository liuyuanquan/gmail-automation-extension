<template>
	<el-dialog
		v-model="isDialogVisible"
		title="Gmail 批量发送"
		width="480px"
		:close-on-click-modal="false"
		:close-on-press-escape="true"
		@close="isDialogVisible = false"
		class="overlay-dialog"
	>
		<!-- 附件上传遮罩层 -->
		<div
			v-if="isUploading"
			v-loading="isUploading"
			element-loading-text="附件正在上传中..."
			element-loading-custom-class="upload-mask"
			element-loading-background="rgba(0, 0, 0, 0.5)"
			:style="{
				position: 'absolute',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				backdropFilter: 'blur(8px)',
				borderRadius: 'var(--el-dialog-border-radius)',
				pointerEvents: 'all',
				zIndex: 5000,
			}"
		></div>
		<el-form label-width="100px">
			<!-- 模板选择 -->
			<el-form-item label="邮件模板:">
				<div class="form-item-content">
					<el-select
						v-model="template"
						placeholder="选择模板"
						style="flex: 1"
						@change="handleTemplateChange"
					>
						<el-option
							v-for="option in templateOptions"
							:key="option.value"
							:label="option.label"
							:value="option.value"
						/>
					</el-select>
					<el-button
						v-if="template"
						link
						type="danger"
						:icon="Delete"
						@click="handleTemplateChange(null)"
					>
					</el-button>
				</div>
			</el-form-item>

			<!-- Excel 文件输入 -->
			<el-form-item label="Excel导入:">
				<div class="form-item-content">
					<el-upload
						:auto-upload="false"
						:show-file-list="false"
						accept=".xlsx, .xls"
						:on-change="handleExcelChange"
					>
						<el-button type="primary">选择文件</el-button>
					</el-upload>
					<el-button
						v-if="excelFileName"
						link
						type="danger"
						:icon="Delete"
						@click="handleExcelChange(null)"
					>
					</el-button>
				</div>
				<div v-if="excelFileName" class="file-info">
					<span>{{ excelFileName }}</span>
					<span v-if="totalCount > 0"> ，总共 {{ totalCount }} 位邮箱 </span>
				</div>
			</el-form-item>

			<!-- 附件信息 -->
			<el-form-item v-if="attachmentInfo" label="附件:">
				<div>
					<span style="color: #409eff">📎 {{ attachmentInfo }}</span>
					<span style="color: #909399; margin-left: 8px"
						>（将在发送时加载）</span
					>
				</div>
			</el-form-item>
		</el-form>
		<template #footer>
			<div class="button-group">
				<el-button type="primary" :disabled="!canSend" @click="startBatchSend">
					{{ sendButtonText }}
				</el-button>
				<el-button type="danger" :disabled="!isSending" @click="stopSending">
					停止发送
				</el-button>
			</div>
		</template>
	</el-dialog>
</template>

<script setup>
import { computed } from "vue";
import { Delete } from "@element-plus/icons-vue";
import { TEMPLATE_OPTIONS } from "../constants";
import { useGmailStore } from "../stores/gmailStore";
import { storeToRefs } from "pinia";

// Store
const gmailStore = useGmailStore();
const {
	template,
	attachmentInfo,
	excelFileName,
	totalCount,
	isUploading,
	isDialogVisible,
	canSend,
	isSending,
	sendButtonText,
} = storeToRefs(gmailStore);
const { handleTemplateChange, handleExcelChange, startBatchSend, stopSending } =
	gmailStore;

// 将 TEMPLATE_OPTIONS 转换为计算属性以便响应式更新
const templateOptions = computed(() => TEMPLATE_OPTIONS.value);
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

.form-item-content {
	width: 100%;
	display: flex;
	align-items: center;
	gap: 8px;
}

.overlay-dialog {
	position: relative;
}
</style>
