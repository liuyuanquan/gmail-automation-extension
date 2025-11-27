import { ref, computed, watch } from "vue";
import { defineStore } from "pinia";
import {
	openWriteEmail,
	sendEmail,
	parseExcel,
	replaceTemplatePlaceholders,
	setComposeFields,
	getComposeFields,
	clearTemplateFields,
	discardDraft,
	watchElementsExistence,
} from "../utils";
import { TEMPLATE_OPTIONS } from "../constants/templates";

export const useGmailStore = defineStore("gmail", () => {
	// ==================== State ====================
	// UI 状态
	const isDialogVisible = ref(false);
	const isUploading = ref(false);

	// 模板和 Excel 数据
	const template = ref(
		TEMPLATE_OPTIONS.length > 0 ? TEMPLATE_OPTIONS[0].value : null
	);
	const excelData = ref(null);
	const excelFileName = ref(null);

	// 发送状态
	const isSending = ref(false);
	const currentSendIndex = ref(0);

	// ==================== Computed ====================
	/**
	 * 根据 template 从 TEMPLATE_OPTIONS 中获取对应的 extra 配置
	 */
	const templateConfig = computed(() => {
		if (!template.value) {
			return null;
		}
		const templateOption = TEMPLATE_OPTIONS.find(
			(opt) => opt.value === template.value
		);
		return templateOption?.extra || null;
	});

	/**
	 * 从 Excel 数据中提取所有邮箱地址，格式化为字符串
	 */
	const excelRecipients = computed(() => {
		if (!excelData.value || excelData.value.length === 0) {
			return null;
		}

		// 查找 email 字段（不区分大小写）
		const emailKey = Object.keys(excelData.value[0] || {}).find(
			(key) => key && String(key).toLowerCase() === "email"
		);

		if (!emailKey) {
			return null;
		}

		const emails = excelData.value
			.map((row) => row[emailKey])
			.filter((email) => email?.toString().includes("@"))
			.map((email) => email.toString().trim());

		return emails.length > 0 ? emails.join("; ") : null;
	});

	const totalCount = computed(() => {
		return excelData.value?.length || 0;
	});

	const canSend = computed(() => {
		return (
			template.value &&
			templateConfig.value?.subject &&
			templateConfig.value?.body &&
			excelRecipients.value &&
			!isSending.value
		);
	});

	// ==================== Actions ====================
	/**
	 * 填充邮件数据到 Gmail 撰写界面
	 * @param {number} dataIndex - 数据索引，默认为 0
	 * @returns {Promise<boolean>} 成功返回 true，否则返回 false
	 */
	async function fillEmailData(dataIndex = 0) {
		const fields = getComposeFields();

		// 检查模板配置是否存在
		if (!templateConfig.value?.subject || !templateConfig.value?.body) {
			// 模板配置不存在时，清空主题、正文和附件
			clearTemplateFields();
			return false;
		}

		// 检查 Excel 数据是否存在
		if (!excelData.value || excelData.value.length === 0) {
			// Excel 数据不存在时，只清空收件人字段，但填充模板相关字段
			if (fields.recipients) {
				fields.recipients.value = "";
			}
			// 填充模板相关字段（主题、正文、附件）
			const subject = templateConfig.value.subject;
			const attachments = templateConfig.value.attachments || [];
			const body = templateConfig.value.body;

			await setComposeFields({
				recipients: "",
				subject,
				body,
				attachments,
			});

			return false;
		}

		const dataRow = excelData.value[dataIndex];
		const recipient = dataRow.email;
		const subject = templateConfig.value.subject;
		const attachments = templateConfig.value.attachments || [];
		let body = templateConfig.value.body;
		body = replaceTemplatePlaceholders(body, dataRow);

		// 设置字段值
		await setComposeFields({
			recipients: recipient,
			subject,
			body,
			attachments,
		});

		console.log("邮件字段已填充");
		return true;
	}

	/**
	 * 处理模板选择变化
	 * @param {string} value - 模板名称
	 */
	async function handleTemplateChange(value) {
		if (!value) {
			template.value = null;
			// 调用 fillEmailData 统一处理清空模板相关字段
			await fillEmailData();
			return;
		}

		try {
			const templateOption = TEMPLATE_OPTIONS.find(
				(opt) => opt.value === value
			);

			if (!templateOption || !templateOption.extra) {
				throw new Error(`Template ${value} not found in TEMPLATE_OPTIONS`);
			}

			template.value = value;

			// 尝试自动填充第一条数据
			await fillEmailData();
		} catch (error) {
			template.value = null;
			// 调用 fillEmailData 统一处理清空模板相关字段
			await fillEmailData();
		}
	}

	/**
	 * 处理 Excel 文件变化
	 * @param {Object} uploadFile - Element Plus upload 组件的文件对象
	 */
	async function handleExcelChange(uploadFile) {
		const file = uploadFile?.raw || uploadFile;
		if (!file) {
			excelData.value = null;
			excelFileName.value = null;
			// 调用 fillEmailData 统一处理清空收件人
			await fillEmailData();
			return;
		}

		try {
			// 保存文件名
			excelFileName.value = file.name;

			// 解析 Excel 文件
			const jsonArray = await parseExcel(file);

			// 打印 JSON 数据
			console.table(jsonArray.slice(0, 10)); // 只显示前10条记录
			console.log(`共 ${jsonArray.length} 条记录`);

			// 设置 Excel 数据
			excelData.value = jsonArray;

			// 尝试自动填充第一条数据
			await fillEmailData();
		} catch (error) {
			excelData.value = null;
			excelFileName.value = null;
			// 调用 fillEmailData 统一处理清空收件人
			await fillEmailData();
		}
	}

	/**
	 * 处理下一条邮件
	 */
	async function processNextEmail() {
		if (!isSending.value) {
			console.log("批量发送已停止");
			return;
		}

		if (currentSendIndex.value >= excelData.value.length) {
			isSending.value = false;
			console.log(`\n✅ 批量发送完成！共处理 ${excelData.value.length} 条数据`);
			return;
		}

		const dataIndex = currentSendIndex.value;
		const dataRow = excelData.value[dataIndex];

		console.log(
			`\n========== 处理第 ${dataIndex + 1}/${
				excelData.value.length
			} 条数据 ==========`
		);
		console.log("数据内容:", dataRow);

		// 填充数据
		if (!(await fillEmailData(dataIndex))) {
			console.log(`❌ 第 ${dataIndex + 1} 条数据处理失败，跳过`);
			currentSendIndex.value++;
			setTimeout(() => processNextEmail(), 500);
			return;
		}

		// 等待填充完成，然后发送
		setTimeout(async () => {
			if (!isSending.value) return;

			if (await sendEmail()) {
				console.log(`✅ 第 ${dataIndex + 1} 条数据已发送成功`);
			} else {
				console.error(`❌ 第 ${dataIndex + 1} 条数据发送失败`);
			}

			currentSendIndex.value++;

			// 等待邮件发送完成，然后处理下一条
			setTimeout(() => {
				if (isSending.value) {
					processNextEmail();
				}
			}, 1500);
		}, 500);
	}

	/**
	 * 开始批量发送
	 */
	function startBatchSend() {
		if (!excelData.value || excelData.value.length === 0) {
			console.error("没有可发送的数据");
			return;
		}

		if (!templateConfig.value?.subject || !templateConfig.value?.body) {
			console.error("模板未加载");
			return;
		}

		isSending.value = true;
		currentSendIndex.value = 0;
		console.log(`开始批量发送，共 ${excelData.value.length} 条数据`);

		// 确保在撰写视图
		openWriteEmail().then(async (success) => {
			if (success) {
				// 等待撰写视图完全加载后再处理下一条
				await processNextEmail();
			} else {
				console.error("无法打开撰写视图");
				isSending.value = false;
			}
		});
	}

	/**
	 * 停止批量发送
	 */
	function stopSending() {
		isSending.value = false;
		console.log(`批量发送已停止，已处理 ${currentSendIndex.value} 条数据`);
	}

	// ==================== Watchers ====================
	// 监听 Dialog 显示状态，显示时打开撰写视图
	watch(
		() => isDialogVisible.value,
		async (visible) => {
			if (visible) {
				await openWriteEmail();
				// 调用 fillEmailData 统一处理填充或清空字段
				await fillEmailData();
			} else {
				// 舍弃当前草稿
				await discardDraft();
			}
		}
	);

	// ==================== Upload Progress Observer ====================
	let stopWatchProgress = null;

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
		excelRecipients,
		totalCount,
		canSend,
		// Actions
		fillEmailData,
		handleTemplateChange,
		handleExcelChange,
		startBatchSend,
		stopSending,
		watchUploadProgress,
		stopWatchUploadProgress,
	};
});
