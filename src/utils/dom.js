// ==================== DOM 工具函数 ====================

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
 * 等待元素消失（等待所有匹配的元素都消失）
 * @param {string} selector - CSS 选择器
 * @param {number} timeout - 超时时间（毫秒），默认 5000ms
 * @returns {Promise<boolean>} 所有元素都消失返回 true，超时返回 false
 */
export function waitForElementRemoved(selector, timeout = 5000) {
	return new Promise((resolve) => {
		// 先检查元素是否已经不存在（检查所有匹配的元素）
		const existingElements = document.querySelectorAll(selector);
		if (existingElements.length === 0) {
			resolve(true);
			return;
		}

		// 使用 MutationObserver 监听 DOM 变化
		const observer = new MutationObserver((mutations, obs) => {
			const elements = document.querySelectorAll(selector);
			// 等待所有匹配的元素都消失
			if (elements.length === 0) {
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
