import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
	clickComposeButton,
	isInComposeView,
	fillComposeFields,
	sendEmail,
} from "../utils/gmail";
import { replaceTemplatePlaceholders } from "../utils/template";

export const useEmailStore = defineStore("email", () => {
	// 状态
	const selectedTemplate = ref(null);
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
		excelData,
		excelRecipients,
		template,
		isSending,
		currentSendIndex,
		// Computed
		canSend,
		totalCount,
		// Actions
		setSelectedTemplate,
		setExcelData,
		setExcelRecipients,
		setTemplate,
		startBatchSend,
		stopSending,
		triggerComposeAndFill,
		fillEmailData,
	};
});
