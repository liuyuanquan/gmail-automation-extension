// ==================== Gmail 工具函数 ====================

/**
 * 等待元素出现
 * @param {string} selector - CSS 选择器
 * @param {number} timeout - 超时时间（毫秒），默认 5000ms
 * @returns {Promise<Element|null>} 找到的元素，超时返回 null
 */
export function waitForElement(selector, timeout = 5000) {
	return new Promise((resolve) => {
		// 先检查元素是否已经存在
		const existingElement = document.querySelector(selector);
		if (existingElement) {
			resolve(existingElement);
			return;
		}

		// 使用 MutationObserver 监听 DOM 变化
		const observer = new MutationObserver((mutations, obs) => {
			const element = document.querySelector(selector);
			if (element) {
				obs.disconnect();
				resolve(element);
			}
		});

		// 开始观察
		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});

		// 设置超时
		setTimeout(() => {
			observer.disconnect();
			resolve(null);
		}, timeout);
	});
}

/**
 * 等待元素消失
 * @param {string} selector - CSS 选择器
 * @param {number} timeout - 超时时间（毫秒），默认 5000ms
 * @returns {Promise<boolean>} 元素消失返回 true，超时返回 false
 */
export function waitForElementRemoved(selector, timeout = 5000) {
	return new Promise((resolve) => {
		// 先检查元素是否已经不存在
		const existingElement = document.querySelector(selector);
		if (!existingElement) {
			resolve(true);
			return;
		}

		// 使用 MutationObserver 监听 DOM 变化
		const observer = new MutationObserver((mutations, obs) => {
			const element = document.querySelector(selector);
			if (!element) {
				obs.disconnect();
				resolve(true);
			}
		});

		// 开始观察
		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});

		// 设置超时
		setTimeout(() => {
			observer.disconnect();
			resolve(false);
		}, timeout);
	});
}

/**
 * 监听元素集合的存在状态变化
 * @param {string} selector - CSS 选择器
 * @param {Function} onStateChange - 状态变化回调函数，参数为 (exists: boolean)
 * @returns {Function} 返回停止监听的函数
 */
export function watchElementsExistence(selector, onStateChange) {
	let observer = null;

	function checkAndNotify() {
		const elements = document.querySelectorAll(selector);
		const exists = elements.length > 0;
		onStateChange(exists);
	}

	observer = new MutationObserver(() => {
		checkAndNotify();
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});

	// 初始检查
	checkAndNotify();

	// 返回停止监听的函数
	return () => {
		if (observer) {
			observer.disconnect();
			observer = null;
		}
	};
}

/**
 * 检测写邮件窗口是否已打开
 * @returns {boolean} 如果写邮件窗口已打开返回 true，否则返回 false
 */
export function isWriteEmailOpen() {
	return !!document.querySelector('input[aria-label="发送至收件人"]');
}

/**
 * 获取 Gmail 撰写视图的字段元素
 * @returns {Object} 包含 recipients, subject, body 字段的对象
 */
export function getComposeFields() {
	return {
		recipients: document.querySelector('input[aria-label="发送至收件人"]'),
		subject: document.querySelector('input[aria-label="主题"]'),
		body: document.querySelector('div[aria-label="邮件正文"]'),
		Filedata: document.querySelector('input[name="Filedata"]'),
	};
}

/**
 * 设置 Gmail 撰写视图的字段值
 * @param {Object} values - 要设置的字段值
 * @param {string} [values.recipients] - 收件人
 * @param {string} [values.subject] - 主题
 * @param {string} [values.body] - 正文
 * @param {Array<Object>} [values.attachments] - 附件数组，每个对象包含 { path, name }
 */
export async function setComposeFields(values = {}) {
	// 先清空所有的字段值，再赋值
	clearComposeFields();

	const fields = getComposeFields();

	if (values.recipients !== undefined && fields.recipients) {
		fields.recipients.value = values.recipients;
	}
	if (values.subject !== undefined && fields.subject) {
		fields.subject.value = values.subject;
		nextTick(() => {
			fields.subject.dispatchEvent(new Event("input"));
		});
	}
	if (values.body !== undefined && fields.body) {
		fields.body.innerHTML = values.body;
	}
	if (
		values.attachments !== undefined &&
		values.attachments.length > 0 &&
		fields.Filedata
	) {
		try {
			// 获取扩展的 base URL
			const extensionId = chrome.runtime.id;
			const baseUrl = `chrome-extension://${extensionId}`;

			// 创建 File 对象数组
			const files = await Promise.all(
				values.attachments.map(async (attachment) => {
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

			// 等待附件上传完成，需要等待页面上 div[role="progressbar"] 消失，才能继续后面的操作，此时整个Dialog，都不允许交互
			// 先等待进度条出现（如果存在），然后等待其消失
			const progressBar = await waitForElement('div[role="progressbar"]', 2000);
			if (progressBar) {
				// 进度条出现，等待其消失
				const progressBarRemoved = await waitForElementRemoved(
					'div[role="progressbar"]',
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
}

/**
 * 清空附件（文件输入框和已上传的附件）
 */
export function clearAttachments() {
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
		'div[aria-label*="按 Delete 键可将其移除"] div[aria-label="移除附件"]'
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
 * 清空模板相关字段（主题、正文、附件）
 */
export function clearTemplateFields() {
	const fields = getComposeFields();

	if (fields.subject) {
		fields.subject.value = "";
	}
	if (fields.body) {
		fields.body.innerHTML = "";
	}

	// 清空附件
	clearAttachments();
}

/**
 * 清空所有的字段值
 */
export function clearComposeFields() {
	const fields = getComposeFields();

	if (fields.recipients) {
		fields.recipients.value = "";
	}

	// 清空模板相关字段
	clearTemplateFields();
}

/**
 * 舍弃当前草稿
 * @returns {Promise<boolean>} 成功舍弃返回 true，否则返回 false
 */
export async function discardDraft() {
	const discardDraftButton = document.querySelector(
		'div[aria-label="舍弃草稿 ‪(⌘⇧D)‬"]'
	);
	if (discardDraftButton) {
		discardDraftButton.click();
		// 等待撰写视图关闭（等待收件人输入框消失）
		await waitForElementRemoved('input[aria-label="发送至收件人"]', 5000);
		return true;
	}
	return false;
}

/**
 * 打开 Gmail 撰写视图（如果不在撰写视图则点击"写邮件"按钮）
 * @returns {Promise<boolean>} 成功打开返回 true，否则返回 false
 */
export async function openWriteEmail() {
	// 如果撰写视图已打开，舍弃草稿
	if (isWriteEmailOpen()) {
		await discardDraft();
	}

	// 查找并点击"写邮件"按钮
	const writeEmailDiv = document.querySelector("div.T-I.T-I-KE.L3");
	if (writeEmailDiv) {
		writeEmailDiv.click();
		// 等待撰写视图出现（等待收件人输入框出现）
		const recipientInput = await waitForElement(
			'input[aria-label="发送至收件人"]',
			5000
		);
		if (!recipientInput) {
			return false;
		}
		// 全屏
		const fullScreenButton = document.querySelector(
			'img[aria-label*="全屏模式"]'
		);
		if (fullScreenButton) {
			// 手动触发mouseup
			const mouseUpEvent = new MouseEvent("mouseup", {
				bubbles: true,
				cancelable: true,
				view: window,
			});
			fullScreenButton.dispatchEvent(mouseUpEvent);
		}
		return true;
	}
	return false;
}

/**
 * 发送邮件
 * @returns {Promise<boolean>} 成功发送返回 true，否则返回 false
 */
export async function sendEmail() {
	try {
		const sendButton = document.querySelector(
			"div.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3"
		);
		if (sendButton) {
			sendButton.click();
			console.log("邮件已发送");
			// 等待撰写视图关闭（等待收件人输入框消失）
			await waitForElementRemoved('input[aria-label="发送至收件人"]', 5000);
			return true;
		} else {
			console.error("无法找到发送按钮");
			return false;
		}
	} catch (error) {
		console.error("发送邮件时出错:", error);
		return false;
	}
}

// ==================== Excel 工具函数 ====================

/**
 * 解析 Excel 文件，返回对象数组
 * @param {File|ArrayBuffer} file - Excel 文件对象或 ArrayBuffer
 * @returns {Promise<Array<Object>>} 解析后的对象数组，第一行为表头
 */
export function parseExcel(file) {
	return new Promise((resolve, reject) => {
		// 如果已经是 ArrayBuffer，直接解析
		if (file instanceof ArrayBuffer) {
			try {
				const data = new Uint8Array(file);
				const workbook = XLSX.read(data, { type: "array" });
				const result = parseWorkbook(workbook);
				resolve(result);
			} catch (error) {
				reject(error);
			}
			return;
		}

		// 如果是 File 对象，先读取
		if (!(file instanceof File)) {
			reject(new Error("Invalid file type"));
			return;
		}

		// 检查文件格式
		if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
			reject(new Error("请选择Excel文件 (.xlsx 或 .xls)"));
			return;
		}

		const reader = new FileReader();
		reader.onload = function (e) {
			try {
				const data = new Uint8Array(e.target.result);
				const workbook = XLSX.read(data, { type: "array" });
				const result = parseWorkbook(workbook);
				resolve(result);
			} catch (error) {
				reject(error);
			}
		};
		reader.onerror = function () {
			reject(new Error("Failed to read file"));
		};
		reader.readAsArrayBuffer(file);
	});
}

/**
 * 解析工作簿，转换为对象数组
 * @param {Object} workbook - XLSX 工作簿对象
 * @returns {Array<Object>} 对象数组
 */
function parseWorkbook(workbook) {
	// 处理工作簿以提取数据
	const sheetName = workbook.SheetNames[0];
	const sheet = workbook.Sheets[sheetName];

	// 将 Excel 表格数据转换为 JSON 对象数组格式
	const jsonData = XLSX.utils.sheet_to_json(sheet, {
		header: 1, // 使用数组格式，第一行作为表头
		defval: null, // 空单元格的默认值
	});

	// 检查是否有数据
	if (jsonData.length === 0) {
		throw new Error("Excel文件中没有数据");
	}

	// 第一行是表头
	const headers = jsonData[0];

	// 从第二行开始是数据
	const dataRows = jsonData.slice(1);

	// 转换为对象数组格式
	const jsonArray = dataRows.map((row) => {
		const obj = {};
		headers.forEach((header, index) => {
			obj[header] = row[index] !== undefined ? row[index] : null;
		});
		return obj;
	});

	return jsonArray;
}

// ==================== 模板工具函数 ====================

/**
 * 将模板中的 {{ xxx }} 占位符替换为 Excel 数据中对应列的值
 * @param {string} template - 包含占位符的模板字符串
 * @param {Object} dataRow - Excel 数据行对象
 * @returns {string} 替换后的模板字符串
 */
export function replaceTemplatePlaceholders(template, dataRow) {
	if (!template || !dataRow) {
		return template;
	}

	// 使用正则表达式匹配 {{ xxx }} 格式的占位符
	return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, placeholder) => {
		// 在 Excel 数据行中查找对应的列（不区分大小写）
		const key = Object.keys(dataRow).find(
			(k) => k && k.toString().toLowerCase() === placeholder.toLowerCase()
		);

		if (key && dataRow[key] !== null && dataRow[key] !== undefined) {
			// 找到对应的值，进行替换
			return String(dataRow[key]);
		}
		// 如果找不到对应的列，保留原始占位符并警告
		console.warn(`未找到占位符 {{ ${placeholder} }} 对应的 Excel 列`);
		return match;
	});
}
