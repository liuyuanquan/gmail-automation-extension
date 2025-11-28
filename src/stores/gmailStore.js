import { ref, computed, watch } from "vue";
import { defineStore } from "pinia";
import {
	sendEmail,
	parseExcel,
	setRecipientField,
	setTemplateFields,
	fillEmailFields,
	discardDraft,
	watchElementsExistence,
	openWriteEmail,
	writeExcelFile,
	isWriteEmailOpen,
	formatCurrentTime,
	addMissingField,
	findEmailKey,
	replaceTemplatePlaceholders,
} from "../utils";
import { TEMPLATE_OPTIONS } from "../constants";

export const useGmailStore = defineStore("gmail", () => {
	// ==================== Dialog ====================
	// 对话框是否可见
	const isDialogVisible = ref(false);

	// 监听 Dialog 显示状态，显示时打开撰写视图
	watch(
		() => isDialogVisible.value,
		async (visible) => {
			if (visible) {
				// 如果撰写视图已打开，则舍弃草稿
				if (isWriteEmailOpen()) {
					await discardDraft();
				}
				// 打开撰写视图
				await openWriteEmail();
				// 预览填充邮件数据（不加载附件）
				previewEmailData();
				// 开始监听上传进度
				watchUploadProgress();
			} else {
				// 清空模板和 Excel 数据、舍弃当前草稿、停止监听上传进度
				await setTemplateFields(null, false);
				await handleExcelChange(null);
				await discardDraft();
				stopWatchUploadProgress();
			}
		}
	);

	// ==================== Template ====================
	// 当前选择的邮件模板名称
	const template = ref(
		TEMPLATE_OPTIONS.length > 0 ? TEMPLATE_OPTIONS[0].value : null
	);

	// 根据 template 从 TEMPLATE_OPTIONS 中获取对应的 extra 配置
	const templateConfig = computed(() => {
		if (!template.value) {
			return null;
		}
		const templateOption = TEMPLATE_OPTIONS.find(
			(opt) => opt.value === template.value
		);
		return templateOption?.extra || null;
	});

	// 附件信息（用于在UI中显示）
	const attachmentInfo = computed(() => {
		const attachments = templateConfig.value?.attachments;
		if (!attachments || attachments.length === 0) {
			return null;
		}
		return attachments.map((att) => att.name).join(", ");
	});

	/**
	 * 处理模板选择变化
	 * @param {string} value - 模板名称
	 */
	async function handleTemplateChange(value) {
		template.value = value || null;
		// 切换模板时不设置附件，避免loading
		await setTemplateFields(templateConfig.value, false);
	}

	// ==================== Excel ====================
	// Excel 文件解析后的数据数组，每行数据为一个对象
	const excelData = ref(null);

	// Excel 文件名
	const excelFileName = ref(null);

	// 从 Excel 数据中提取表头（列名）
	const excelHeaders = computed(() => {
		if (!excelData.value || excelData.value.length === 0) {
			return null;
		}
		// 从第一行数据中获取所有键作为表头
		return Object.keys(excelData.value[0]);
	});

	// 从 Excel 数据中提取所有邮箱地址，格式化为字符串
	const recipientEmails = computed(() => {
		const emailKey = findEmailKey(excelData.value);
		if (!emailKey) {
			return null;
		}

		const emails = excelData.value
			.map((row) => row[emailKey])
			.filter((email) => email?.toString().includes("@"))
			.map((email) => email.toString().trim());

		return emails.length > 0 ? emails.join("; ") : null;
	});

	// Excel 数据总条数
	const totalCount = computed(() => {
		return excelData.value?.length || 0;
	});

	/**
	 * 处理 Excel 文件变化
	 * @param {Object} uploadFile - Element Plus upload 组件的文件对象
	 */
	async function handleExcelChange(uploadFile) {
		const file = uploadFile?.raw || uploadFile;
		if (!file) {
			excelData.value = null;
			excelFileName.value = null;
			setRecipientField(null);
			// 清空Excel时不设置附件，避免loading
			await setTemplateFields(
				{
					...(templateConfig.value || {}),
					body: (templateConfig.value || {}).body,
				},
				false
			);
			return;
		}

		try {
			// 保存文件名
			excelFileName.value = file.name;

			// 解析 Excel 文件
			const { jsonArray, headers } = await parseExcel(file);

			// 打印 JSON 数据
			console.table(jsonArray.slice(0, 10)); // 只显示前10条记录
			console.log(`共 ${jsonArray.length} 条记录`);

			// 添加缺失的字段（status 和 time）
			addMissingField(jsonArray, headers, "status");
			addMissingField(jsonArray, headers, "time");

			// 设置 Excel 数据（表头通过计算属性自动获取）
			excelData.value = jsonArray;

			setRecipientField(excelData.value[0].email);
			// 切换Excel时不设置附件，避免loading
			await setTemplateFields(
				{
					...templateConfig.value,
					body: replaceTemplatePlaceholders(
						templateConfig.value.body,
						excelData.value[0]
					),
				},
				false
			);
		} catch (error) {
			console.log("解析 Excel 文件失败", error);
			excelData.value = null;
			excelFileName.value = null;
			setRecipientField(null);
			// 清空Excel时不设置附件，避免loading
			await setTemplateFields(
				{
					...(templateConfig.value || {}),
					body: (templateConfig.value || {}).body,
				},
				false
			);
		}
	}

	// ==================== Sending ====================
	// 是否正在批量发送邮件
	const isSending = ref(false);

	// 当前发送的数据索引（从 0 开始）
	const currentSendIndex = ref(0);

	// 是否可以开始发送邮件（需要满足：模板配置存在、有收件人邮箱、当前未在发送中、未在上传附件）
	const canSend = computed(() => {
		return (
			templateConfig.value?.subject &&
			recipientEmails.value &&
			!isSending.value &&
			!isUploading.value
		);
	});

	// 发送按钮显示的文本（发送中时显示进度，否则显示"开始发送"）
	const sendButtonText = computed(() => {
		if (isSending.value) {
			return `发送中 (${currentSendIndex.value}/${totalCount.value})`;
		}
		return "开始发送";
	});

	/**
	 * 预览填充邮件数据到 Gmail 撰写界面（不加载附件）
	 */
	async function previewEmailData() {
		const config = templateConfig.value;
		const dataRow =
			excelData.value && excelData.value.length > 0 ? excelData.value[0] : null;

		await fillEmailFields({
			config,
			dataRow,
			includeAttachments: false, // 预览时不加载附件
		});
	}

	/**
	 * 处理下一条邮件
	 */
	async function processNextEmail() {
		if (!isSending.value) {
			console.log("批量发送已停止");
			return;
		}

		// 跳过已发送的记录，找到下一个未发送的记录
		let dataIndex = currentSendIndex.value;
		while (dataIndex < excelData.value.length) {
			const dataRow = excelData.value[dataIndex];
			if (dataRow.status === "已发送") {
				console.log(`⏭️  第 ${dataIndex + 1} 条数据已发送，跳过`);
				dataIndex++;
				currentSendIndex.value = dataIndex;
				continue;
			}
			break;
		}

		// 如果所有记录都已处理完
		if (dataIndex >= excelData.value.length) {
			isSending.value = false;
			currentSendIndex.value = 0;
			console.log(`\n✅ 批量发送完成！共处理 ${excelData.value.length} 条数据`);
			// 批量发送完成，保存 Excel 文件
			await writeExcelFile(
				excelData.value,
				excelHeaders.value,
				excelFileName.value
			);
			return;
		}

		currentSendIndex.value = dataIndex;
		const dataRow = excelData.value[dataIndex];

		console.log(
			`\n========== 处理第 ${dataIndex + 1}/${
				excelData.value.length
			} 条数据 ==========`
		);
		console.log("数据内容:", dataRow);

		// 检查撰写窗口是否已打开，如果没有打开则先打开（发送完上一封邮件后 Gmail 会关闭窗口）
		if (!isWriteEmailOpen()) {
			await openWriteEmail();
		}

		// 填充数据（发送时设置附件）
		await fillEmailFields({
			config: templateConfig.value,
			dataRow,
			includeAttachments: true,
		});

		// 直接发送邮件
		await sendEmail(dataRow.email || "");
		console.log(`✅ 第 ${dataIndex + 1} 条数据已发送成功`);
		dataRow.status = "已发送";
		dataRow.time = formatCurrentTime();

		currentSendIndex.value++;

		// 处理下一条邮件
		processNextEmail();
	}

	/**
	 * 开始批量发送
	 */
	async function startBatchSend() {
		isSending.value = true;
		currentSendIndex.value = 0;
		console.log(`开始批量发送，共 ${excelData.value.length} 条数据`);

		// 处理下一条邮件
		await processNextEmail();
	}

	/**
	 * 停止批量发送
	 */
	async function stopSending() {
		const processedCount = currentSendIndex.value; // 保存已处理的条数
		isSending.value = false;
		currentSendIndex.value = 0;
		console.log(`批量发送已停止，已处理 ${processedCount} 条数据`);
		// 停止时保存已处理的数据
		await writeExcelFile(
			excelData.value,
			excelHeaders.value,
			excelFileName.value
		);
		// 清除 Excel 文件选择
		await handleExcelChange(null);
	}

	// ==================== Upload Progress ====================
	// 是否正在上传附件
	const isUploading = ref(false);

	/**
	 * 停止监听上传进度的函数句柄
	 */
	let stopWatchProgress = null;

	/**
	 * 开始监听上传进度条的存在状态
	 * 当进度条出现时，设置 isUploading 为 true；消失时设置为 false
	 */
	function watchUploadProgress() {
		// 如果已有监听器，先停止
		if (stopWatchProgress) {
			stopWatchProgress();
		}

		// 使用工具函数监听进度条的存在状态
		stopWatchProgress = watchElementsExistence(
			'div[role="progressbar"]',
			(exists) => {
				isUploading.value = exists;
			}
		);
	}

	/**
	 * 停止监听上传进度，并重置上传状态
	 */
	function stopWatchUploadProgress() {
		if (stopWatchProgress) {
			stopWatchProgress();
			stopWatchProgress = null;
		}
		isUploading.value = false;
	}

	// ==================== Return ====================
	return {
		// State
		isDialogVisible,
		isUploading,
		template,
		excelData,
		excelFileName,
		isSending,
		currentSendIndex,
		// Computed
		templateConfig,
		attachmentInfo,
		recipientEmails,
		totalCount,
		canSend,
		sendButtonText,
		// Actions
		previewEmailData,
		handleTemplateChange,
		handleExcelChange,
		startBatchSend,
		stopSending,
		watchUploadProgress,
		stopWatchUploadProgress,
	};
});
