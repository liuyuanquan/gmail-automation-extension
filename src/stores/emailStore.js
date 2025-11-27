import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
	clickComposeButton,
	isInComposeView,
	fillComposeFields,
	sendEmail,
} from "../utils/gmail";
import { replaceTemplatePlaceholders } from "../utils/template";
import { TEMPLATE_OPTIONS } from "../constants/templates";

export const useEmailStore = defineStore("email", () => {
	// 状态 - 默认选中第一个模板
	const selectedTemplate = ref(
		TEMPLATE_OPTIONS.length > 0 ? TEMPLATE_OPTIONS[0].value : null
	);
	// 当前选中的模板配置（包含 JSON 数据）
	const selectedTemplateConfig = ref(null);
	const excelData = ref(null);
	const excelRecipients = ref(null);
	const template = ref(null); // { subject: string, body: string }
	const isSending = ref(false);
	const currentSendIndex = ref(0);

	// 计算属性
	const canSend = computed(() => {
		return selectedTemplate.value && excelRecipients.value && !isSending.value;
	});

	const totalCount = computed(() => {
		return excelData.value?.length || 0;
	});

	// Actions
	function setSelectedTemplate(name) {
		selectedTemplate.value = name;
	}

	/**
	 * 加载邮件模板内容
	 * 所有数据（JSON 和 HTML）都从 TEMPLATE_OPTIONS 中获取，无需异步加载
	 * @param {string} templateName - 模板名称（不包含扩展名）
	 */
	function loadTemplate(templateName) {
		try {
			setSelectedTemplate(templateName);

			// 从 TEMPLATE_OPTIONS 中查找对应的模板配置
			const templateOption = TEMPLATE_OPTIONS.find(
				(opt) => opt.value === templateName
			);

			if (!templateOption || !templateOption.extra) {
				throw new Error(
					`Template ${templateName} not found in TEMPLATE_OPTIONS`
				);
			}

			selectedTemplateConfig.value = templateOption;

			// 直接从配置中获取所有数据
			setTemplate({
				subject: templateOption.extra.subject,
				body: templateOption.extra.body,
			});

			console.log("Template loaded:", templateName);

			// 检查是否可以自动填充
			checkAndAutoFill();
		} catch (error) {
			console.error("Error loading template:", error);
			setTemplate(null);
		}
	}

	/**
	 * 检查数据是否准备好，如果准备好则自动填充第一条数据
	 */
	function checkAndAutoFill() {
		const hasTemplate = !!(template.value?.subject && template.value?.body);
		const hasExcelData = !!(excelData.value?.length > 0);

		if (hasTemplate && hasExcelData) {
			console.log("模板和 Excel 数据都已加载完成，自动填充第一条数据");
			triggerComposeAndFill();
		}
	}

	/**
	 * 处理模板选择变化
	 */
	function handleTemplateChange(value) {
		if (value) {
			loadTemplate(value);
		} else {
			setSelectedTemplate(null);
		}
	}

	/**
	 * 用于 v-model 双向绑定的 computed 属性（将空字符串转换为 null）
	 */
	const selectedTemplateForInput = computed({
		get: () => selectedTemplate.value || "",
		set: (value) => {
			setSelectedTemplate(value || null);
		},
	});

	function setExcelData(data) {
		excelData.value = data;
	}

	function setExcelRecipients(recipients) {
		excelRecipients.value = recipients;
	}

	function setTemplate(templateData) {
		template.value = templateData;
	}

	function startBatchSend() {
		if (!excelData.value || excelData.value.length === 0) {
			console.error("没有可发送的数据");
			return;
		}

		if (!template.value?.subject || !template.value?.body) {
			console.error("模板未加载");
			return;
		}

		isSending.value = true;
		currentSendIndex.value = 0;
		console.log(`开始批量发送，共 ${excelData.value.length} 条数据`);

		// 确保在撰写视图
		if (!isInComposeView()) {
			if (clickComposeButton()) {
				setTimeout(() => processNextEmail(), 1000);
			} else {
				console.error("无法打开撰写视图");
				isSending.value = false;
			}
		} else {
			processNextEmail();
		}
	}

	function stopSending() {
		isSending.value = false;
		console.log(`批量发送已停止，已处理 ${currentSendIndex.value} 条数据`);
	}

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
		setTimeout(() => {
			if (!isSending.value) return;

			if (sendEmail()) {
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
			}, 2000);
		}, 500);
	}

	function fillEmailData(dataIndex = 0) {
		const dataRow = excelData.value?.[dataIndex];
		if (!dataRow) {
			console.warn(`数据索引 ${dataIndex} 不存在`);
			return false;
		}

		const emailKey = Object.keys(dataRow).find(
			(key) => key && String(key).toLowerCase() === "email"
		);
		const recipients = emailKey && dataRow[emailKey]?.toString().trim();

		if (!recipients?.includes("@")) {
			console.warn(`第 ${dataIndex + 1} 条数据：未找到有效的邮箱地址`);
			return false;
		}

		let subject = template.value?.subject || "";
		let body = template.value?.body || "";

		subject = replaceTemplatePlaceholders(subject, dataRow);
		body = replaceTemplatePlaceholders(body, dataRow);

		if (recipients && subject && body) {
			fillComposeFields(recipients, subject, body);
			return true;
		} else {
			console.warn(`第 ${dataIndex + 1} 条数据：缺少必要的数据`, {
				recipients: !!recipients,
				subject: !!subject,
				body: !!body,
			});
			return false;
		}
	}

	function triggerComposeAndFill() {
		if (!isInComposeView()) {
			if (clickComposeButton()) {
				console.log("Clicked on '写邮件' div");
				setTimeout(() => fillEmailData(), 1000);
			} else {
				console.error("Could not find '写邮件' div");
			}
		} else {
			fillEmailData();
		}
	}

	return {
		// State
		selectedTemplate,
		selectedTemplateConfig,
		excelData,
		excelRecipients,
		template,
		isSending,
		currentSendIndex,
		// Computed
		canSend,
		totalCount,
		selectedTemplateForInput,
		// Actions
		setSelectedTemplate,
		handleTemplateChange,
		loadTemplate,
		checkAndAutoFill,
		setExcelData,
		setExcelRecipients,
		setTemplate,
		startBatchSend,
		stopSending,
		triggerComposeAndFill,
		fillEmailData,
	};
});
