// ==================== Gmail 工具函数 ====================
import { ElMessage } from "element-plus";
import { GMAIL_SELECTORS } from "../constants";
import { waitForElement, waitForElementRemoved } from "./dom";
import { replaceTemplatePlaceholders } from "./template";

/**
 * 获取 Gmail 撰写视图的字段元素
 * @returns {Object} 包含 recipient, subject, body, Filedata, discardDraftButtons, writeEmailButton, fullScreenButton, sendButton 字段的对象
 */
export function getComposeFields() {
	return {
		recipient: document.querySelector(GMAIL_SELECTORS.COMPOSE.RECIPIENT),
		subject: document.querySelector(GMAIL_SELECTORS.COMPOSE.SUBJECT),
		body: document.querySelector(GMAIL_SELECTORS.COMPOSE.BODY),
		Filedata: document.querySelector(GMAIL_SELECTORS.COMPOSE.FILE_INPUT),
		discardDraftButtons: document.querySelectorAll(
			GMAIL_SELECTORS.BUTTONS.DISCARD_DRAFT
		),
		writeEmailButton: document.querySelector(
			GMAIL_SELECTORS.BUTTONS.WRITE_EMAIL
		),
		fullScreenButton: document.querySelector(
			GMAIL_SELECTORS.BUTTONS.FULLSCREEN
		),
		sendButton: document.querySelector(GMAIL_SELECTORS.BUTTONS.SEND),
	};
}

/**
 * 检测写邮件窗口是否已打开
 * @returns {boolean} 如果写邮件窗口已打开返回 true，否则返回 false
 */
export function isWriteEmailOpen() {
	const fields = getComposeFields();
	return !!fields.recipient;
}

// ==================== Set 方法 ====================
/**
 * 设置收件人字段
 * @param {string|null} [value] - 收件人值。如果为 null 或 undefined，则清空字段
 */
export function setRecipientField(value) {
	const fields = getComposeFields();
	if (fields.recipient) {
		fields.recipient.focus();
		fields.recipient.value = value ?? "";
		fields.recipient.blur();
	}
}

/**
 * 设置主题字段
 * @param {string|null} [value] - 主题值。如果为 null 或 undefined，则清空字段
 */
export function setSubjectField(value) {
	const fields = getComposeFields();
	if (fields.subject) {
		fields.subject.focus();
		fields.subject.value = value ?? "";
		fields.subject.blur();
	}
}

/**
 * 设置正文字段
 * @param {string|null} [value] - 正文值。如果为 null 或 undefined，则清空字段
 */
export function setBodyField(value) {
	const fields = getComposeFields();
	if (fields.body) {
		fields.body.focus();
		fields.body.innerHTML = value ?? "";
		fields.body.blur();
	}
}

/**
 * 清空附件（文件输入框和已上传的附件）
 */
function clearAttachments() {
	const fields = getComposeFields();

	// 清空文件输入框
	if (fields.Filedata) {
		const dataTransfer = new DataTransfer();
		fields.Filedata.files = dataTransfer.files;
		const changeEvent = new Event("change", { bubbles: true });
		fields.Filedata.dispatchEvent(changeEvent);
	}

	// 手动清除已经上传的附件（如果存在）
	const attachmentRemoveButtons = document.querySelectorAll(
		GMAIL_SELECTORS.ATTACHMENTS.REMOVE_BUTTONS
	);
	if (attachmentRemoveButtons.length > 0) {
		attachmentRemoveButtons.forEach((button) => {
			// 触发 mousedown 事件来移除附件
			const mouseDownEvent = new MouseEvent("mousedown", {
				bubbles: true,
				cancelable: true,
				view: window,
			});
			button.dispatchEvent(mouseDownEvent);
		});
	}
}

/**
 * 设置附件字段
 * @param {Array<Object>|null} [attachments] - 附件数组，每个对象包含 { path, name }。如果为 null、undefined 或空数组，则清空附件
 */
export async function setAttachmentsField(attachments) {
	if (!attachments || attachments.length === 0) {
		clearAttachments();
		return;
	}

	const fields = getComposeFields();
	if (!fields.Filedata) {
		return;
	}

	// 先清空附件，再添加新的附件
	clearAttachments();

	try {
		// 获取扩展的 base URL
		const extensionId = chrome.runtime.id;
		const baseUrl = `chrome-extension://${extensionId}`;

		// 创建 File 对象数组
		const files = await Promise.all(
			attachments.map(async (attachment) => {
				// 构建文件的完整 URL
				const fileUrl = `${baseUrl}${attachment.path}`;
				// 获取文件内容
				const response = await fetch(fileUrl);
				const blob = await response.blob();
				// 创建 File 对象
				return new File([blob], attachment.name, { type: blob.type });
			})
		);

		// 创建 DataTransfer 对象来模拟文件选择
		const dataTransfer = new DataTransfer();
		files.forEach((file) => {
			dataTransfer.items.add(file);
		});

		// 设置文件输入框的 files 属性（使用 DataTransfer API）
		fields.Filedata.files = dataTransfer.files;

		// 触发 change 事件，让 Gmail 识别文件
		const changeEvent = new Event("change", { bubbles: true });
		fields.Filedata.dispatchEvent(changeEvent);

		console.log(`已添加 ${files.length} 个附件`);

		// 等待附件上传完成，需要等待页面上进度条消失，才能继续后面的操作，此时整个Dialog，都不允许交互
		const progressBar = await waitForElement(
			GMAIL_SELECTORS.ATTACHMENTS.PROGRESS_BAR,
			2000
		);
		if (progressBar) {
			// 进度条出现，等待其消失
			const progressBarRemoved = await waitForElementRemoved(
				GMAIL_SELECTORS.ATTACHMENTS.PROGRESS_BAR,
				1000 * 60 // 60秒
			);
			if (!progressBarRemoved) {
				console.warn("附件上传超时，但继续执行后续操作");
			} else {
				console.log("附件上传完成");
			}
		} else {
			// 进度条没有出现，可能文件很小或已经上传完成
			console.log("附件已处理完成（未检测到进度条）");
		}
	} catch (error) {
		console.error("添加附件时出错:", error);
	}
}

/**
 * 设置模板字段（主题、正文、附件）
 * @param {Object|null} config - 模板配置对象，包含 subject, body, attachments。如果为 null，则清空所有模板字段
 * @param {boolean} [includeAttachments=true] - 是否设置附件，默认为 true
 */
export async function setTemplateFields(config, includeAttachments = true) {
	setSubjectField(config?.subject ?? null);
	setBodyField(config?.body ?? null);
	if (includeAttachments) {
		await setAttachmentsField(config?.attachments ?? null);
	}
}

/**
 * 填充邮件字段
 * @param {Object} options - 填充选项
 * @param {Object|null} options.config - 模板配置对象，包含 subject, body, attachments
 * @param {Object} [options.dataRow] - Excel 数据行对象，如果提供则替换占位符
 * @param {boolean} [options.includeAttachments=true] - 是否设置附件，默认为 true
 * @returns {Promise<boolean>} 成功返回 true，否则返回 false
 */
export async function fillEmailFields({
	config,
	dataRow,
	includeAttachments = true,
}) {
	if (!config?.subject) {
		setRecipientField(null);
		await setTemplateFields(null, includeAttachments);
		return false;
	}

	setRecipientField(dataRow?.email ?? null);
	await setTemplateFields(
		{
			...config,
			body: dataRow
				? replaceTemplatePlaceholders(config.body, dataRow)
				: config.body,
		},
		includeAttachments
	);

	return !!dataRow;
}

// ==================== 操作函数 ====================
/**
 * 舍弃当前草稿
 */
export async function discardDraft() {
	const fields = getComposeFields();
	const discardDraftButtons = fields.discardDraftButtons;
	if (discardDraftButtons && discardDraftButtons.length > 0) {
		// 对每个按钮都触发点击
		discardDraftButtons.forEach((button) => button.click());
		// 等待撰写视图关闭（等待收件人输入框消失）
		await waitForElementRemoved(GMAIL_SELECTORS.COMPOSE.RECIPIENT, 5000);
	}
}

/**
 * 打开 Gmail 撰写视图（如果不在撰写视图则点击"写邮件"按钮）
 */
export async function openWriteEmail() {
	// 查找并点击"写邮件"按钮
	const fields = getComposeFields();
	const writeEmailDiv = fields.writeEmailButton;
	if (writeEmailDiv) {
		writeEmailDiv.click();
		// 等待撰写视图出现（等待收件人输入框出现）
		await waitForElement(GMAIL_SELECTORS.COMPOSE.RECIPIENT, 5000);
		// 全屏（重新获取字段，因为撰写视图已加载）
		const composeFields = getComposeFields();
		const fullScreenButton = composeFields.fullScreenButton;
		if (fullScreenButton) {
			// 手动触发mouseup
			const mouseUpEvent = new MouseEvent("mouseup", {
				bubbles: true,
				cancelable: true,
				view: window,
			});
			fullScreenButton.dispatchEvent(mouseUpEvent);
		}
	}
}

/**
 * 发送邮件
 * @param {string} [recipient=""] - 收件人邮箱（用于日志记录和提示消息）
 */
export async function sendEmail(recipient = "") {
	// 查找 Gmail 发送按钮并点击
	const fields = getComposeFields();
	fields.sendButton?.click();

	// 等待 2 秒，确保邮件发送完成
	await new Promise((resolve) => setTimeout(resolve, 2000));

	// 显示成功消息
	ElMessage({
		message: recipient ? `${recipient} 发送成功` : "邮件发送成功",
		type: "success",
		duration: 2000,
	});
}
