<template>
	<el-dialog
		v-model="isVisible"
		title="模板管理"
		width="900px"
		:close-on-click-modal="false"
		@close="handleClose"
		class="template-manager-dialog"
	>
		<div class="template-manager">
			<!-- 工具栏 -->
			<div class="toolbar">
				<el-button type="primary" :icon="Plus" @click="handleAdd">
					新增模板
				</el-button>
			</div>

			<!-- 模板列表 -->
			<div
				class="template-list"
				v-loading="loading"
				element-loading-custom-class="upload-mask"
				element-loading-background="rgba(0, 0, 0, 0.5)"
			>
				<el-table :data="TEMPLATE_OPTIONS" border stripe style="width: 100%">
					<el-table-column prop="label" label="模板名称" width="150" />
					<el-table-column label="主题" min-width="200">
						<template #default="{ row }">
							<span :title="row.extra?.subject">
								{{ row.extra?.subject || "-" }}
							</span>
						</template>
					</el-table-column>
					<el-table-column label="附件数量" width="100" align="center">
						<template #default="{ row }">
							{{ row.extra?.attachments?.length || 0 }}
						</template>
					</el-table-column>
					<el-table-column label="操作" width="100" fixed="right">
						<template #default="{ row, $index }">
							<div class="action-buttons">
								<el-button
									link
									type="primary"
									size="small"
									@click="handleEdit(row, $index)"
								>
									编辑
								</el-button>
								<el-button
									link
									type="danger"
									size="small"
									@click="handleDelete($index)"
								>
									删除
								</el-button>
							</div>
						</template>
					</el-table-column>
				</el-table>
			</div>
		</div>

		<!-- 编辑/新增模板对话框 -->
		<el-dialog
			v-model="isEditDialogVisible"
			:title="editingIndex === null ? '新增模板' : '编辑模板'"
			width="800px"
			:close-on-click-modal="false"
			@close="handleEditDialogClose"
			append-to-body
		>
			<el-form
				ref="editFormRef"
				:model="editingTemplate"
				:rules="editFormRules"
				label-width="120px"
				:disabled="saving"
			>
				<el-form-item label="模板名称" prop="label">
					<el-input
						v-model="editingTemplate.label"
						placeholder="例如：模板15"
					/>
				</el-form-item>
				<el-form-item label="邮件主题" prop="extra.subject">
					<el-input
						v-model="editingTemplate.extra.subject"
						placeholder="邮件主题"
					/>
				</el-form-item>
				<el-form-item label="HTML内容" prop="extra.body">
					<el-input
						v-model="editingTemplate.extra.body"
						type="textarea"
						:rows="10"
						placeholder="输入HTML内容，支持 {{ 变量名 }} 占位符"
					/>
				</el-form-item>
				<el-form-item label="附件">
					<div class="attachments-editor">
						<!-- 文件上传 -->
						<el-upload
							:auto-upload="false"
							:on-change="handleFileChange"
							:file-list="attachmentFileList"
							multiple
							:disabled="saving"
							:show-file-list="false"
						>
							<el-button type="primary" :icon="Plus" :disabled="saving">
								选择文件
							</el-button>
						</el-upload>

						<!-- 附件列表 -->
						<div class="attachment-list" v-if="allAttachments.length > 0">
							<div
								v-for="(attachment, index) in allAttachments"
								:key="index"
								class="attachment-item"
							>
								<span class="file-name" :title="attachment.name">
									{{ attachment.name }}
								</span>
								<span class="file-size" v-if="attachment.size">
									{{ formatFileSize(attachment.size) }}
								</span>
								<span class="file-tag" v-if="attachment.isExisting"
									>已存在</span
								>
								<el-button
									link
									type="danger"
									:icon="Delete"
									:disabled="saving"
									@click="removeAttachment(index, attachment.isExisting)"
								/>
							</div>
						</div>
					</div>
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button :disabled="saving" @click="handleEditDialogClose"
					>取消</el-button
				>
				<el-button type="primary" :loading="saving" @click="handleSave"
					>保存</el-button
				>
			</template>
		</el-dialog>
	</el-dialog>
</template>

<script setup>
// ==================== Imports ====================
import { ref, computed, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Delete } from "@element-plus/icons-vue";
import { TEMPLATE_OPTIONS } from "../constants";
import {
	loadTemplates,
	saveTemplateConfigToGitHub,
	saveTemplateHtmlToGitHub,
} from "../utils/template";
import {
	createOrUpdateGitHubFile,
	getGitHubFileContent,
	GITHUB_CONFIG,
} from "../utils/githubApi";

// ==================== Props & Emits ====================
const props = defineProps({
	modelValue: {
		type: Boolean,
		default: false,
	},
});

const emit = defineEmits(["update:modelValue"]);

// ==================== Computed ====================
const isVisible = computed({
	get: () => props.modelValue,
	set: (val) => emit("update:modelValue", val),
});

// ==================== Reactive State ====================
// 加载状态
const loading = ref(false);

// 保存状态
const saving = ref(false);

// 编辑对话框状态
const isEditDialogVisible = ref(false);
const editingIndex = ref(null);
const editingTemplate = ref({
	label: "",
	value: "",
	htmlFile: "",
	extra: {
		subject: "",
		body: "",
		attachments: [],
	},
});
// 保存原始模板的 HTML 内容，用于比较是否有变化
const originalTemplateBody = ref("");

// 保存原始模板数据，用于比较是否有变化（编辑时）
const originalTemplate = ref(null);

// 附件文件列表（用于上传）
const attachmentFileList = ref([]);

// 已存在的附件列表（编辑时显示）
const existingAttachments = ref([]);

// ==================== Form Refs & Rules ====================
const editFormRef = ref(null);

// 表单验证规则
const editFormRules = {
	label: [{ required: true, message: "请输入模板名称", trigger: "blur" }],
	"extra.subject": [
		{ required: true, message: "请输入邮件主题", trigger: "blur" },
	],
	"extra.body": [
		{ required: true, message: "请输入HTML内容", trigger: "blur" },
	],
};

// ==================== Computed ====================
// 所有附件列表（包括已存在的和新选择的）
const allAttachments = computed(() => {
	const existing = existingAttachments.value.map((att) => ({
		name: att.name,
		path: att.path,
		isExisting: true,
	}));
	const newFiles = attachmentFileList.value.map((file) => ({
		name: file.name,
		size: file.size,
		isExisting: false,
		file: file, // 保留原始文件对象，用于上传
	}));
	return [...existing, ...newFiles];
});

// ==================== Watchers ====================
// 监听标识符变化，自动生成 HTML 文件名
watch(
	() => editingTemplate.value.value,
	(newValue, oldValue) => {
		// 只在新增模板时自动生成（编辑时不允许修改标识符）
		if (editingIndex.value === null && newValue) {
			const currentHtmlFile = editingTemplate.value.htmlFile;
			// 如果 HTML 文件名为空，自动生成
			if (!currentHtmlFile) {
				editingTemplate.value.htmlFile = `${newValue}.html`;
			}
			// 如果 HTML 文件名等于旧的标识符+".html"，则自动更新为新标识符+".html"
			else if (oldValue && currentHtmlFile === `${oldValue}.html`) {
				editingTemplate.value.htmlFile = `${newValue}.html`;
			}
		}
	}
);

// 监听对话框显示，加载模板列表
watch(isVisible, (visible) => {
	if (visible) {
		loadTemplatesList();
	}
});

// ==================== Utility Functions ====================
// 生成唯一标识符
function generateUniqueIdentifier() {
	// 基于时间戳生成唯一标识符
	const timestamp = Date.now();
	const random = Math.floor(Math.random() * 1000);
	return `template${timestamp}${random}`;
}

// ==================== Template List Functions ====================
// 加载模板列表
async function loadTemplatesList() {
	loading.value = true;
	try {
		// 从 GitHub 加载模板
		const loadedTemplates = await loadTemplates();
		TEMPLATE_OPTIONS.value = loadedTemplates || [];
	} catch (error) {
		console.error("加载模板失败:", error);
		ElMessage.error("加载模板失败");
		TEMPLATE_OPTIONS.value = [];
	} finally {
		loading.value = false;
	}
}

// ==================== Template CRUD Functions ====================
// 新增模板
function handleAdd() {
	editingIndex.value = null;
	const identifier = generateUniqueIdentifier();
	editingTemplate.value = {
		label: "",
		value: identifier,
		htmlFile: `${identifier}.html`,
		extra: {
			subject: "",
			body: "",
			attachments: [],
		},
	};
	// 新增时清空原始内容
	originalTemplateBody.value = "";
	originalTemplate.value = null;
	// 清空附件文件列表
	attachmentFileList.value = [];
	// 清空已存在的附件列表
	existingAttachments.value = [];
	isEditDialogVisible.value = true;
}

// 编辑模板
function handleEdit(row, index) {
	editingIndex.value = index;
	editingTemplate.value = JSON.parse(JSON.stringify(row));
	// 保存原始 HTML 内容，用于后续比较
	originalTemplateBody.value = row.extra?.body || "";
	// 保存原始模板数据，用于比较是否有变化
	originalTemplate.value = JSON.parse(JSON.stringify(row));
	// 重置附件文件列表
	attachmentFileList.value = [];
	// 设置已存在的附件列表
	existingAttachments.value = row.extra?.attachments || [];
	isEditDialogVisible.value = true;
}

// 删除模板
async function handleDelete(index) {
	const templatesToSave = TEMPLATE_OPTIONS.value.filter(
		(_, idx) => idx !== index
	);
	try {
		// 等待用户确认，使用 beforeClose 钩子在删除完成后再关闭对话框
		await ElMessageBox.confirm("确定要删除这个模板吗？", "提示", {
			type: "warning",
			confirmButtonText: "确定",
			cancelButtonText: "取消",
			beforeClose: async (action, instance, done) => {
				if (action === "confirm") {
					// 用户点击确认，显示 loading
					instance.confirmButtonLoading = true;
					instance.confirmButtonText = "删除中...";

					try {
						// 更新 config.json（移除模板配置）
						await saveTemplateConfigToGitHub(templatesToSave);

						// 直接更新全局模板选项，避免重新加载所有数据
						TEMPLATE_OPTIONS.value = templatesToSave;

						// 删除成功后关闭对话框
						done();
						ElMessage.success("删除成功");
					} catch (error) {
						// 删除失败，恢复按钮状态，不关闭对话框
						instance.confirmButtonLoading = false;
						instance.confirmButtonText = "确定";
						ElMessage.error(`删除失败: ${error.message || "未知错误"}`);
					}
				} else {
					// 用户取消，直接关闭
					done();
				}
			},
		});
	} catch (error) {
		// 用户取消时不显示任何提示
	}
}

// 保存模板
async function handleSave() {
	if (!editFormRef.value) return;

	try {
		// 1. 表单验证
		await editFormRef.value.validate();

		// 2. 准备编辑后的模板数据（不包含新附件）
		const editedTemplate = JSON.parse(JSON.stringify(editingTemplate.value));
		editedTemplate.extra.attachments = existingAttachments.value;

		// 3. 编辑时先检查是否有变化（在附件上传前检查，避免不必要的上传）
		if (editingIndex.value !== null) {
			// 比较附件列表（排序后比较，避免顺序不同导致的误判）
			const compareAttachments = (attachments1, attachments2) => {
				const sorted1 = [...(attachments1 || [])].sort((a, b) =>
					a.name.localeCompare(b.name)
				);
				const sorted2 = [...(attachments2 || [])].sort((a, b) =>
					a.name.localeCompare(b.name)
				);
				return JSON.stringify(sorted1) === JSON.stringify(sorted2);
			};

			// 检查是否有新附件
			const hasNewAttachments = attachmentFileList.value.length > 0;

			// 比较模板配置是否有变化
			const configChanged =
				originalTemplate.value.label !== editedTemplate.label ||
				originalTemplate.value.value !== editedTemplate.value ||
				originalTemplate.value.htmlFile !== editedTemplate.htmlFile ||
				(originalTemplate.value.extra?.subject || "") !==
					(editedTemplate.extra?.subject || "") ||
				!compareAttachments(
					originalTemplate.value.extra?.attachments,
					editedTemplate.extra?.attachments
				);
			const htmlContentChanged =
				editedTemplate.extra?.body !== originalTemplateBody.value;

			// 如果没有变化且没有新附件，直接返回
			if (!configChanged && !htmlContentChanged && !hasNewAttachments) {
				ElMessage.info("没有修改内容");
				isEditDialogVisible.value = false;
				return;
			}
		}

		// 4. 确认有变化后，设置保存状态
		saving.value = true;

		// 5. 如果有新选择的附件文件，先上传附件（只处理新增的附件）
		if (attachmentFileList.value.length > 0) {
			try {
				ElMessage.info("正在上传附件...");
				const uploadedAttachments = await uploadAttachmentsToGitHub(
					attachmentFileList.value
				);
				// 合并已存在的附件和新上传的附件
				editedTemplate.extra.attachments = [
					...existingAttachments.value,
					...uploadedAttachments,
				];
			} catch (error) {
				// 附件上传失败，重置保存状态并抛出错误
				saving.value = false;
				throw error;
			}
		}

		// 6. 保存到 GitHub
		try {
			ElMessage.info("正在保存到 GitHub...");

			// 准备要保存的模板列表
			let templatesToSave = [...TEMPLATE_OPTIONS.value];
			if (editingIndex.value === null) {
				// 新增
				templatesToSave.push(editedTemplate);
			} else {
				// 编辑
				templatesToSave[editingIndex.value] = editedTemplate;
			}

			// 保存配置（一次性保存，包含所有附件信息）
			await saveTemplateConfigToGitHub(templatesToSave);

			// 判断是否需要保存 HTML 文件
			const isNewTemplate = editingIndex.value === null;
			const htmlContentChanged =
				isNewTemplate ||
				editedTemplate.extra?.body !== originalTemplateBody.value;

			if (htmlContentChanged) {
				// HTML 内容有变化，保存 HTML 文件
				await saveTemplateHtmlToGitHub([editedTemplate], isNewTemplate);
			}

			// 直接更新全局模板选项，避免重新加载所有数据
			TEMPLATE_OPTIONS.value = templatesToSave;

			ElMessage.success("保存成功");
			isEditDialogVisible.value = false;
		} catch (error) {
			console.error("保存到 GitHub 失败:", error);
			ElMessage.error(`保存失败: ${error.message || "未知错误"}`);
		} finally {
			// 恢复保存状态
			saving.value = false;
		}
	} catch (error) {
		if (error !== false) {
			// false 表示验证失败，不需要显示错误
			console.error("保存模板失败:", error);
			ElMessage.error("保存失败");
		}
	}
}

// ==================== Attachment Functions ====================
// 文件选择变化处理
function handleFileChange(file, fileList) {
	attachmentFileList.value = fileList.map((f) => f.raw || f);
}

// 删除附件
function removeAttachment(index, isExisting) {
	if (isExisting) {
		// 删除已存在的附件
		existingAttachments.value.splice(index, 1);
	} else {
		// 删除新选择的文件
		// 需要找到在新文件列表中的实际索引
		const newFileIndex = index - existingAttachments.value.length;
		attachmentFileList.value.splice(newFileIndex, 1);
	}
}

// 格式化文件大小
function formatFileSize(bytes) {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// 读取文件为 Base64
function readFileAsBase64(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			// FileReader 返回的是 data:xxx;base64,xxx 格式，需要提取 base64 部分
			const base64 = reader.result.split(",")[1];
			resolve(base64);
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

// 上传附件到 GitHub（只处理新增的附件）
async function uploadAttachmentsToGitHub(files) {
	if (!files || files.length === 0) return [];

	const uploadedAttachments = [];

	for (const file of files) {
		try {
			// 构建附件路径：attachments/文件名
			const attachmentPath = `attachments/${file.name}`;
			const fullPath = `${GITHUB_CONFIG.templatesPath}/${attachmentPath}`;

			// 检查文件是否已存在（可能之前上传过但被删除了配置）
			const existingFile = await getGitHubFileContent(attachmentPath);
			const sha = existingFile?.sha;

			// 读取文件为 Base64
			const fileContentBase64 = await readFileAsBase64(file);

			// 使用统一的 GitHub API 函数上传文件
			const message = sha
				? `chore(attachments): 更新附件文件 ${file.name}`
				: `feat(attachments): 新增附件文件 ${file.name}`;

			await createOrUpdateGitHubFile(
				fullPath,
				fileContentBase64,
				message,
				sha,
				true // 标记内容已经是 Base64
			);

			uploadedAttachments.push({
				path: attachmentPath,
				name: file.name,
			});
		} catch (error) {
			console.error(`上传附件 ${file.name} 失败:`, error);
			throw new Error(`上传附件 ${file.name} 失败: ${error.message}`);
		}
	}

	return uploadedAttachments;
}

// ==================== Dialog Functions ====================
// 关闭编辑对话框
function handleEditDialogClose() {
	isEditDialogVisible.value = false;
	editingIndex.value = null;
	saving.value = false;
	originalTemplateBody.value = "";
	originalTemplate.value = null;
	attachmentFileList.value = [];
	existingAttachments.value = [];
	editFormRef.value?.resetFields();
}

// 关闭对话框
function handleClose() {
	isEditDialogVisible.value = false;
	// 关闭模板管理对话框后，重新加载页面以确保模板列表是最新的
	window.location.reload();
}
</script>

<style scoped>
.template-manager {
	padding: 0;
}

.toolbar {
	display: flex;
	gap: 8px;
	margin-bottom: 16px;
}

.template-list {
	margin-top: 16px;
	min-height: 200px;
	position: relative;
}

.attachments-editor {
	width: 100%;
}

.attachment-list {
	margin-top: 12px;
}

.attachment-item {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 8px;
	padding: 8px;
	background-color: #f5f7fa;
	border-radius: 4px;
}

.file-name {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: #606266;
}

.file-size {
	color: #909399;
	font-size: 12px;
}

.file-tt {
	color: #409eff;
	font-size: 12px;
	padding: 2px 6px;
	background-color: #ecf5ff;
	border-radius: 2px;
}

.template-manager-dialog :deep(.el-dialog__body) {
	padding: 20px;
}

.action-buttons {
	white-space: nowrap;
	display: inline-flex;
}
</style>
