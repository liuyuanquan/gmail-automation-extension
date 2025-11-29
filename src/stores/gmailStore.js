import { ref, computed, watch } from "vue";
import { defineStore } from "pinia";
import {
	sendEmail,
	parseExcel,
	setRecipientField,
	setTemplateFields,
	fillEmailFields,
	discardDraft,
	openWriteEmail,
	writeExcelFile,
	isWriteEmailOpen,
	formatCurrentTime,
	addMissingField,
	findEmailKey,
	replaceTemplatePlaceholders,
	updateTopMessage,
	closeTopMessage,
	showInfo,
} from "../utils";
import { TEMPLATE_OPTIONS } from "../constants";
import { loadTemplates } from "../utils/templateLoader";

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
			} else {
				// 清空模板和 Excel 数据、舍弃当前草稿
				await setTemplateFields(null, false, (uploading) => {
					isUploading.value = uploading;
				});
				await handleExcelChange(null);
				await discardDraft();
			}
		}
	);

	// ==================== Template ====================
	// 当前选择的邮件模板名称
	const template = ref(null);

	// 初始化加载模板
	(async () => {
		try {
			const templates = await loadTemplates();
			TEMPLATE_OPTIONS.value = templates;
			// 如果有模板，默认选择第一个
			if (templates.length > 0) {
				template.value = templates[0].value;
			}
		} catch (error) {
			console.error("初始化模板失败:", error);
		}
	})();

	// 根据 template 从 TEMPLATE_OPTIONS 中获取对应的 extra 配置
	const templateConfig = computed(() => {
		if (!template.value) {
			return null;
		}
		const templateOption = TEMPLATE_OPTIONS.value.find(
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
		await setTemplateFields(templateConfig.value, false, (uploading) => {
			isUploading.value = uploading;
		});
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

	// 统计成功的数量
	const successCount = computed(() => {
		if (!excelData.value) return 0;
		return excelData.value.filter((row) => row.status === "已发送" && row.time)
			.length;
	});

	// 统计失败的数量
	const failCount = computed(() => {
		if (!excelData.value) return 0;
		return excelData.value.filter((row) => row.status === "发送失败").length;
	});

	// 统计跳过的数量
	const skipCount = computed(() => {
		if (!excelData.value) return 0;
		return excelData.value.filter((row) => row.status === "已发送" && !row.time)
			.length;
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
				false,
				(uploading) => {
					isUploading.value = uploading;
				}
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

			// 添加缺失的字段（status、time 和 reason）
			addMissingField(jsonArray, headers, "status");
			addMissingField(jsonArray, headers, "time");
			addMissingField(jsonArray, headers, "reason");

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
				false,
				(uploading) => {
					isUploading.value = uploading;
				}
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
				false,
				(uploading) => {
					isUploading.value = uploading;
				}
			);
		}
	}

	// ==================== Sending ====================
	// 是否正在批量发送邮件
	const isSending = ref(false);

	// 是否模拟发送（不真正发送邮件）
	const isMockSend = ref(false);

	// 是否正在上传附件（由 setAttachmentsField 控制）
	const isUploading = ref(false);

	// 当前发送的数据索引（从 0 开始）
	const currentSendIndex = ref(0);

	// 是否可以开始发送邮件（需要满足：模板配置存在、有收件人邮箱、当前未在发送中、未在上传附件、未发送到最后一个）
	const canSend = computed(() => {
		return (
			templateConfig.value?.subject &&
			recipientEmails.value &&
			recipientEmails.value.length > 0 &&
			currentSendIndex.value < recipientEmails.value.length &&
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
			onUploadingChange: (uploading) => {
				isUploading.value = uploading;
			},
		});
	}

	/**
	 * 检查是否已停止发送，如果已停止则清理并返回 true
	 * @returns {boolean} 如果已停止返回 true，否则返回 false
	 */
	function checkIfStopped() {
		if (!isSending.value) {
			console.log("批量发送已停止");
			closeTopMessage();
			return true;
		}
		return false;
	}

	/**
	 * 统一处理批量发送结束（完成或停止）
	 * @param {"complete"|"stop"} type - 结束类型：complete 表示完成，stop 表示停止
	 * @param {number} [processedCount] - 已处理的条数（停止时使用），完成时使用 totalCount
	 */
	async function handleBatchSendEnd(type, processedCount) {
		isSending.value = false;
		currentSendIndex.value = 0;

		// 构建统计消息（使用 computed 属性）
		const parts = [];
		if (successCount.value > 0) parts.push(`成功 ${successCount.value}`);
		if (failCount.value > 0) parts.push(`失败 ${failCount.value}`);
		if (skipCount.value > 0) parts.push(`跳过 ${skipCount.value}`);
		const statsText = parts.length > 0 ? `（${parts.join("，")}）` : "";

		// 根据类型设置不同的消息内容和类型
		const isComplete = type === "complete";
		const count = isComplete
			? totalCount.value
			: processedCount ?? currentSendIndex.value;
		const message = isComplete
			? `批量发送完成，共处理 ${count} 条数据${statsText}`
			: `批量发送已停止，已处理 ${count} 条数据${statsText}`;
		const messageType = isComplete ? "success" : "warning";

		updateTopMessage(message, messageType);

		// 3秒后自动关闭消息和 dialog
		setTimeout(() => {
			closeTopMessage();
			isDialogVisible.value = false;
		}, 3000);

		// 保存 Excel 文件
		await writeExcelFile(
			excelData.value,
			excelHeaders.value,
			excelFileName.value
		);
	}

	/**
	 * 处理下一条邮件
	 */
	async function processNextEmail() {
		if (checkIfStopped()) return;

		// 跳过已发送的记录，找到下一个未发送的记录
		let dataIndex = currentSendIndex.value;
		while (dataIndex < excelData.value.length) {
			const dataRow = excelData.value[dataIndex];
			if (dataRow.status === "已发送") {
				const recipient = dataRow.email || "未知邮箱";
				showInfo(
					`${recipient} 已发送（${dataIndex + 1}/${excelData.value.length}）`
				);
				dataIndex++;
				currentSendIndex.value = dataIndex;
				continue;
			}
			break;
		}

		// 如果所有记录都已处理完
		if (dataIndex >= excelData.value.length) {
			await handleBatchSendEnd("complete");
			return;
		}

		currentSendIndex.value = dataIndex;
		const dataRow = excelData.value[dataIndex];

		// 再次检查是否已停止发送（防止在递归调用过程中停止）
		if (checkIfStopped()) return;

		console.log(
			`\n========== 处理第 ${dataIndex + 1}/${
				excelData.value.length
			} 条数据 ==========`
		);
		console.log("数据内容:", JSON.stringify(dataRow, null, 2));
		const recipient = dataRow.email || "未知邮箱";
		updateTopMessage(
			`${recipient} 正在处理（${dataIndex + 1}/${excelData.value.length}）`
		);

		// 检查撰写窗口是否已打开，如果没有打开则先打开（发送完上一封邮件后 Gmail 会关闭窗口）
		if (!isWriteEmailOpen()) {
			await openWriteEmail();
		}
		if (checkIfStopped()) return;

		// 填充数据（发送时设置附件）
		await fillEmailFields({
			config: templateConfig.value,
			dataRow,
			includeAttachments: true,
			onUploadingChange: (uploading) => {
				isUploading.value = uploading;
			},
		});

		// 如果没有附件，添加最小等待时间，确保用户能看到撰写弹窗
		const hasAttachments =
			templateConfig.value?.attachments &&
			templateConfig.value.attachments.length > 0;
		if (!hasAttachments) {
			await new Promise((resolve) => setTimeout(resolve, 1500));
		}
		if (checkIfStopped()) return;

		// 发送邮件（根据 isMockSend 决定是否真正发送）
		const result = await sendEmail(recipient, isMockSend.value);

		if (result.success) {
			updateTopMessage(result.message, "success");
			dataRow.status = "已发送";
			dataRow.time = formatCurrentTime();
			dataRow.reason = ""; // 成功时清空失败原因
		} else {
			updateTopMessage(result.message, "error");
			dataRow.status = "发送失败";
			dataRow.time = formatCurrentTime();
			dataRow.reason = result.message; // 保存失败原因（使用 message）
		}

		currentSendIndex.value++;

		// 如果不是最后一条，暂停5秒
		if (currentSendIndex.value < excelData.value.length) {
			showInfo("休息5秒后继续...");
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
		if (checkIfStopped()) return;

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
		updateTopMessage(
			`开始批量发送，共 ${excelData.value.length} 条数据`,
			"info"
		);

		// 处理下一条邮件
		await processNextEmail();
	}

	/**
	 * 停止批量发送
	 */
	async function stopSending() {
		const processedCount = currentSendIndex.value; // 保存已处理的条数
		await handleBatchSendEnd("stop", processedCount);
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
		isMockSend,
		currentSendIndex,
		// Computed
		templateConfig,
		attachmentInfo,
		recipientEmails,
		totalCount,
		successCount,
		failCount,
		skipCount,
		canSend,
		sendButtonText,
		// Actions
		previewEmailData,
		handleTemplateChange,
		handleExcelChange,
		startBatchSend,
		stopSending,
	};
});
