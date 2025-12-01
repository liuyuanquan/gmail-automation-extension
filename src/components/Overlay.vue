<template>
	<div>
		<el-dialog
			v-model="dialogVisible"
			title="Gmail 批量发送"
			width="480px"
			:close-on-click-modal="false"
			:close-on-press-escape="true"
			@close="handleDialogClose"
			class="overlay-dialog"
		>
			<template #header>
				<div class="dialog-header">
					<span>Gmail 批量发送</span>
					<el-button
						link
						type="primary"
						:icon="Setting"
						@click="isTemplateManagerVisible = true"
						style="margin-left: auto"
					>
						模板管理
					</el-button>
				</div>
			</template>
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
			<el-form label-width="100px" :disabled="isSending">
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
				<el-form-item v-if="attachments.length > 0" label="附件:">
					<div class="attachments-display">
						<div
							v-for="(attachment, index) in attachments"
							:key="index"
							class="attachment-item"
						>
							<span style="color: #409eff">📎 {{ attachment.name }}</span>
						</div>
						<span style="color: #909399; margin-top: 4px; display: block"
							>（将在发送时加载）</span
						>
					</div>
				</el-form-item>
			</el-form>
			<template #footer>
				<div class="button-group">
					<el-button
						type="primary"
						:disabled="!canSend"
						@click="startBatchSend"
					>
						{{ sendButtonText }}
					</el-button>
					<el-button type="danger" :disabled="!isSending" @click="stopSending">
						停止发送
					</el-button>
				</div>
			</template>
		</el-dialog>

		<!-- 模板管理对话框 -->
		<TemplateManager v-model="isTemplateManagerVisible" />
	</div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { Delete, Setting } from "@element-plus/icons-vue";
import { TEMPLATE_OPTIONS } from "../constants";
import { useGmailStore } from "../stores/gmailStore";
import { storeToRefs } from "pinia";
import TemplateManager from "./TemplateManager.vue";

// Props
const props = defineProps({
	modelValue: {
		type: Boolean,
		default: undefined,
	},
});

// Emits
const emit = defineEmits(["update:modelValue"]);

// Store
const gmailStore = useGmailStore();
const {
	template,
	attachmentInfo,
	templateConfig,
	excelFileName,
	totalCount,
	isUploading,
	isDialogVisible: storeIsDialogVisible,
	canSend,
	isSending,
	sendButtonText,
} = storeToRefs(gmailStore);

// 获取附件列表
const attachments = computed(() => {
	return templateConfig.value?.attachments || [];
});
const { handleTemplateChange, handleExcelChange, startBatchSend, stopSending } =
	gmailStore;

// 模板管理对话框显示状态
const isTemplateManagerVisible = ref(false);

// 对话框显示状态：如果传入了 modelValue，使用它；否则使用 store 中的状态
const dialogVisible = computed({
	get: () => {
		if (props.modelValue !== undefined) {
			return props.modelValue;
		}
		return storeIsDialogVisible.value;
	},
	set: (value) => {
		if (props.modelValue !== undefined) {
			emit("update:modelValue", value);
		} else {
			storeIsDialogVisible.value = value;
		}
	},
});

// 同步 store 状态到外部（当使用 modelValue 时）
watch(
	() => storeIsDialogVisible.value,
	(value) => {
		if (props.modelValue === undefined) {
			// 如果没有传入 modelValue，同步 store 状态
			emit("update:modelValue", value);
		}
	}
);

// 将 TEMPLATE_OPTIONS 转换为计算属性以便响应式更新
const templateOptions = computed(() => TEMPLATE_OPTIONS.value);

// 处理 dialog 关闭事件
function handleDialogClose() {
	// 如果正在发送，执行停止发送逻辑（会关闭 dialog）
	if (isSending.value) {
		stopSending();
	} else {
		// 否则直接关闭 dialog
		dialogVisible.value = false;
	}
}
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

.dialog-header {
	display: flex;
	align-items: center;
	width: 100%;
}

.attachments-display {
	width: 100%;
}

.attachment-item {
	margin-bottom: 4px;
}

.attachment-item:last-child {
	margin-bottom: 0;
}
</style>
