// ==================== Gmail 工具函数 ====================
import { GMAIL_SELECTORS } from "../constants";
import {
	waitForElement,
	waitForElementRemoved,
	waitForElementVisible,
} from "./dom";
import { replaceTemplatePlaceholders } from "./template";
import { getAttachmentGitHubUrl } from "./templateLoader";

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
		fields.recipient.value = value ?? "";
		fields.subject.focus();
		fields.subject.blur();
	}
}

/**
 * 设置主题字段
 * @param {string|null} [value] - 主题值。如果为 null 或 undefined，则清空字段
 */
export function setSubjectField(value) {
	const fields = getComposeFields();
	if (fields.subject) {
		fields.subject.value = value ?? "";
	}
}

/**
 * 设置正文字段
 * @param {string|null} [value] - 正文值。如果为 null 或 undefined，则清空字段
 */
export function setBodyField(value) {
	const fields = getComposeFields();
	if (fields.body) {
		fields.body.innerHTML = value ?? "";
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
 * @param {Function} [onUploadingChange] - 上传状态变化回调函数，参数为 (isUploading: boolean)
 */
export async function setAttachmentsField(attachments, onUploadingChange) {
	if (!attachments || attachments.length === 0) {
		clearAttachments();
		if (onUploadingChange) {
			onUploadingChange(false);
		}
		return;
	}

	const fields = getComposeFields();
	if (!fields.Filedata) {
		if (onUploadingChange) {
			onUploadingChange(false);
		}
		return;
	}

	// 先清空附件，再添加新的附件
	clearAttachments();

	try {
		// 创建 File 对象数组（附件始终从 GitHub 加载）
		const files = await Promise.all(
			attachments.map(async (attachment) => {
				// 从 GitHub 加载附件（路径相对于 templates 目录）
				const fileUrl = getAttachmentGitHubUrl(attachment.path);

				// 获取文件内容
				const response = await fetch(fileUrl);
				if (!response.ok) {
					throw new Error(`Failed to load attachment: ${response.statusText}`);
				}
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

		// 等待附件上传完成
		const progressBar = await waitForElement(
			GMAIL_SELECTORS.ATTACHMENTS.PROGRESS_BAR,
			2000
		);
		if (progressBar) {
			// 进度条出现，设置上传状态为 true
			if (onUploadingChange) {
				onUploadingChange(true);
			}
			// 等待其消失（最多等待10分钟，确保附件上传完成）
			const progressBarRemoved = await waitForElementRemoved(
				GMAIL_SELECTORS.ATTACHMENTS.PROGRESS_BAR,
				1000 * 60 * 10 // 10分钟
			);
			if (!progressBarRemoved) {
				console.warn("附件上传超时（10分钟），但继续执行后续操作");
			} else {
				console.log("附件上传完成");
			}
			// 上传完成，设置上传状态为 false
			if (onUploadingChange) {
				onUploadingChange(false);
			}
		} else {
			// 进度条没有出现，可能文件很小或已经上传完成
			console.log("附件已处理完成（未检测到进度条）");
			if (onUploadingChange) {
				onUploadingChange(false);
			}
		}
	} catch (error) {
		console.error("添加附件时出错:", error);
		if (onUploadingChange) {
			onUploadingChange(false);
		}
	}
}

/**
 * 设置模板字段（主题、正文、附件）
 * @param {Object|null} config - 模板配置对象，包含 subject, body, attachments。如果为 null，则清空所有模板字段
 * @param {boolean} [includeAttachments=true] - 是否设置附件，默认为 true
 * @param {Function} [onUploadingChange] - 上传状态变化回调函数，参数为 (isUploading: boolean)
 */
export async function setTemplateFields(
	config,
	includeAttachments = true,
	onUploadingChange
) {
	setSubjectField(config?.subject ?? null);
	setBodyField(config?.body ?? null);
	if (includeAttachments) {
		await setAttachmentsField(config?.attachments ?? null, onUploadingChange);
	} else if (onUploadingChange) {
		onUploadingChange(false);
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
		await waitForElement(GMAIL_SELECTORS.COMPOSE.RECIPIENT, 2000);
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
			// 等待 .aSs 元素的 visibility 不为 hidden（表示全屏动画完成）
			await waitForElementVisible("div.aSs", 2000);
			// 等待收件人输入框获得焦点
			await new Promise((resolve) => {
				const handler = (e) => {
					const target = e.target;
					// 检查是否是收件人输入框
					if (
						target &&
						target.matches &&
						target.matches(GMAIL_SELECTORS.COMPOSE.RECIPIENT)
					) {
						target.blur();
						// 移除事件监听器并 resolve
						document.body.removeEventListener("focus", handler, true);
						resolve();
					}
				};
				// 在 body 上使用事件委托监听收件人输入框的 focus 事件
				document.body.addEventListener("focus", handler, true);
			});
		}
	}
}

/**
 * 发送邮件
 * @param {string} [recipient=""] - 收件人邮箱（用于日志记录和提示消息）
 * @param {boolean} [mockSend=true] - 是否模拟发送，true 为模拟发送，false 为真正发送
 * @returns {Promise<{success: boolean, message: string}>} 返回发送结果，包含 success 和 message（失败时 message 包含失败原因）
 */
export async function sendEmail(recipient = "", mockSend = true) {
	try {
		if (mockSend) {
			// 模拟发送：不真正发送邮件，只删除草稿
			await discardDraft();
			const message = recipient
				? `${recipient} 发送成功（模拟）`
				: "邮件发送成功（模拟）";
			return {
				success: true,
				message,
			};
		} else {
			// 真正发送：点击发送按钮
			const fields = getComposeFields();
			fields.sendButton?.click();

			// 检查是否出现错误提示元素（<div jscontroller="dGzwdb">）
			// 2秒内出现该元素则判定为发送失败，未出现则判定为发送成功
			const errorDiv = await waitForElement('div[jscontroller="dGzwdb"]', 2000);
			let result;
			if (errorDiv) {
				// 从 class="uW2Fw-bHk" 提取错误文本
				const errorTextEl = errorDiv.querySelector("div.uW2Fw-bHk");
				const errorText = errorTextEl?.textContent?.trim() || "检测到错误提示";
				const errorMessage = recipient
					? `${recipient} 发送失败`
					: "邮件发送失败";
				errorDiv.remove();
				result = {
					success: false,
					message: `${errorMessage}: ${errorText}`,
				};
			} else {
				const message = recipient ? `${recipient} 发送成功` : "邮件发送成功";
				result = {
					success: true,
					message,
				};
			}

			// 无论成功还是失败，统一丢弃草稿
			await discardDraft();

			return result;
		}
	} catch (error) {
		// 失败处理
		const errorMessage = recipient ? `${recipient} 发送失败` : "邮件发送失败";
		const reason = error?.message || "未知错误";
		return {
			success: false,
			message: `${errorMessage}: ${reason}`,
		};
	}
}
