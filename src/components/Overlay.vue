<template>
	<el-dialog
		v-model="isVisible"
		title="📧 Gmail 批量发送"
		width="550px"
		:close-on-click-modal="true"
		:close-on-press-escape="true"
		@close="close"
	>
		<el-form label-width="140px">
			<!-- 模板选择 -->
			<el-form-item label="📋 邮件模板:">
				<el-select
					v-model="selectedTemplate"
					placeholder="选择模板"
					style="width: 100%"
					@change="handleTemplateChange"
				>
					<el-option
						v-for="option in templateOptions"
						:key="option.value"
						:label="option.label"
						:value="option.value"
					/>
				</el-select>
			</el-form-item>

			<!-- Excel 文件输入 -->
			<el-form-item label="📊 导入Excel文件:">
				<el-upload
					:auto-upload="false"
					:show-file-list="false"
					accept=".xlsx, .xls"
					:on-change="handleExcelImport"
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
					⏹️ 停止发送
				</el-button>
			</div>
		</template>
	</el-dialog>
</template>

<script setup>
import { useDialog } from "../composables/useDialog";
import { useEmailForm } from "../composables/useEmailForm";
import { useEmailActions } from "../composables/useEmailActions";
import { useExcel } from "../composables/useExcel";
import { TEMPLATE_OPTIONS } from "../constants/templates";

// Dialog 相关
const { isVisible, close } = useDialog();

// 表单相关
const { selectedTemplate, handleTemplateChange } = useEmailForm();

// Excel 导入
const { handleExcelImport } = useExcel();

// 邮件操作
const { canSend, isSending, sendButtonText, handleSend, handleStop } =
	useEmailActions();

// 模板选项
const templateOptions = TEMPLATE_OPTIONS;
</script>
