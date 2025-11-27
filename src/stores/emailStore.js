import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
	openWriteEmail,
	isWriteEmailOpen,
	sendEmail,
	parseExcel,
	replaceTemplatePlaceholders,
} from "../utils";
import { TEMPLATE_OPTIONS } from "../constants/templates";

export const useEmailStore = defineStore("email", () => {
	// 状态 - 默认选中第一个模板
	const template = ref(
		TEMPLATE_OPTIONS.length > 0 ? TEMPLATE_OPTIONS[0].value : null
	);
	const excelData = ref(null);
	const isSending = ref(false);
	const currentSendIndex = ref(0);

	// 计算属性
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

	const canSend = computed(() => {
		return (
			template.value &&
			templateConfig.value?.subject &&
			templateConfig.value?.body &&
			excelRecipients.value &&
			!isSending.value
		);
	});

	const totalCount = computed(() => {
		return excelData.value?.length || 0;
	});

	// Actions
	/**
	 * 填充邮件数据到 Gmail 撰写界面
	 * @param {number} dataIndex - 数据索引，默认为 0
	 * @returns {boolean} 成功返回 true，否则返回 false
	 */
	function fillEmailData(dataIndex = 0) {
		const dataRow = excelData.value[dataIndex];
		if (!dataRow) {
			console.warn(`数据索引 ${dataIndex} 不存在`);
			return false;
		}

		const recipient = dataRow.email;
		const subject = templateConfig.value.subject;
		let body = templateConfig.value.body;
		body = replaceTemplatePlaceholders(body, dataRow);

		const fields = {
			recipients: document.querySelector('input[aria-label="发送至收件人"]'),
			subject: document.querySelector('input[name="subjectbox"]'),
			body: document.querySelector('div[aria-label="邮件正文"]'),
		};

		if (!fields.recipients || !fields.subject || !fields.body) {
			console.error("无法找到必要的输入框");
			return false;
		}

		fields.recipients.value = recipient;
		fields.subject.value = subject;
		fields.body.innerHTML = body;

		console.log("邮件字段已填充");
		return true;
	}

	/**
	 * 检查数据是否准备好，如果准备好则自动填充第一条数据
	 */
	function checkAndAutoFill() {
		const hasTemplate = !!(
			templateConfig.value?.subject && templateConfig.value?.body
		);
		const hasExcelData = !!(excelData.value?.length > 0);

		if (hasTemplate && hasExcelData) {
			console.log("模板和 Excel 数据都已加载完成，自动填充第一条数据");
			fillEmailData();
		}
	}

	/**
	 * 处理模板选择变化
	 * @param {string} value - 模板名称
	 */
	function handleTemplateChange(value) {
		if (!value) {
			template.value = null;
			return;
		}

		try {
			// 从 TEMPLATE_OPTIONS 中查找对应的模板配置
			const templateOption = TEMPLATE_OPTIONS.find(
				(opt) => opt.value === value
			);

			if (!templateOption || !templateOption.extra) {
				throw new Error(`Template ${value} not found in TEMPLATE_OPTIONS`);
			}

			// 设置模板值
			template.value = value;

			// 检查是否可以自动填充
			checkAndAutoFill();
		} catch (error) {
			console.error("Error loading template:", error);
			template.value = null;
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
			return;
		}

		try {
			// 解析 Excel 文件
			const jsonArray = await parseExcel(file);

			// 打印 JSON 数据
			console.log("=== Excel 表格数据 ===");
			console.log(JSON.stringify(jsonArray, null, 2));
			console.table(jsonArray.slice(0, 10)); // 只显示前10条记录
			console.log(`共 ${jsonArray.length} 条记录`);

			// 设置 Excel 数据
			excelData.value = jsonArray;

			// 检查是否可以自动填充
			checkAndAutoFill();
		} catch (error) {
			console.error("Error processing Excel file:", error);
			excelData.value = null;
		}
	}

	/**
	 * 处理下一条邮件
	 */
	function processNextEmail() {
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
		if (!fillEmailData(dataIndex)) {
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
		openWriteEmail().then((success) => {
			if (success) {
				setTimeout(() => processNextEmail(), 500);
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

	return {
		// State
		template,
		excelData,
		isSending,
		currentSendIndex,
		// Computed
		templateConfig,
		excelRecipients,
		canSend,
		totalCount,
		// Actions
		handleTemplateChange,
		handleExcelChange,
		checkAndAutoFill,
		startBatchSend,
		stopSending,
		fillEmailData,
	};
});
