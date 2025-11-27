// ==================== Gmail 工具函数 ====================

/**
 * 检测是否处于 Gmail 撰写视图
 * @returns {boolean} 如果在撰写视图中返回 true，否则返回 false
 */
export function isInComposeView() {
	return !!document.querySelector('div[role="dialog"] form');
}

/**
 * 查找并点击"写邮件"按钮
 * @returns {boolean} 成功点击返回 true，否则返回 false
 */
export function clickComposeButton() {
	const writeEmailDiv = Array.from(
		document.querySelectorAll("div.T-I.T-I-KE.L3")
	).find((div) => div.textContent === "写邮件");
	if (writeEmailDiv) {
		writeEmailDiv.click();
		return true;
	}
	return false;
}

/**
 * 填充 Gmail 撰写字段（收件人、主题、正文）
 * @param {string} recipients - 收件人邮箱地址（多个用逗号分隔）
 * @param {string} subject - 邮件主题
 * @param {string} body - 邮件正文（HTML格式）
 * @returns {boolean} 成功填充返回 true，否则返回 false
 */
export function fillComposeFields(recipients, subject, body) {
	if (!isInComposeView()) {
		console.warn("撰写界面尚未准备好");
		return false;
	}

	const fields = {
		recipients: document.querySelector('input[aria-label="发送至收件人"]'),
		subject: document.querySelector('input[name="subjectbox"]'),
		body: document.querySelector('div[aria-label="邮件正文"]'),
	};

	if (!fields.recipients || !fields.subject || !fields.body) {
		console.error("无法找到必要的输入框");
		return false;
	}

	fields.recipients.value = recipients;
	fields.subject.value = subject;
	fields.body.innerHTML = body;

	console.log("邮件字段已填充");
	return true;
}

/**
 * 发送邮件
 * @returns {boolean} 成功发送返回 true，否则返回 false
 */
export function sendEmail() {
	try {
		if (!isInComposeView()) {
			console.error("不在撰写界面，无法发送邮件");
			return false;
		}

		const sendButtons = document.querySelectorAll("div.T-I.J-J5-Ji.T-I-atl.L3");
		if (sendButtons.length > 0) {
			const sendButton = sendButtons[0];
			sendButton.click();
			console.log("邮件已发送");
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

/**
 * 打开 Gmail 撰写视图
 */
export function openComposeView() {
	if (!isInComposeView() && clickComposeButton()) {
		console.log("Opened Gmail compose view when overlay is created");
	}
}
