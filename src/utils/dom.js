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

/**
 * 监听元素的样式变化（特别是 display 属性）
 * @param {string} selector - CSS 选择器或元素 ID（如 "#loading"）
 * @param {Function} onStyleChange - 样式变化回调函数，参数为 (element: Element|null, display: string)
 * @returns {Promise<Function>} 返回 Promise，resolve 时返回停止监听的函数
 */
export async function watchElementStyle(selector, onStyleChange) {
	let observer = null;
	let currentElement = null;

	function getElement() {
		// 支持选择器和 ID
		if (selector.startsWith("#")) {
			return document.getElementById(selector.slice(1));
		}
		return document.querySelector(selector);
	}

	function checkAndNotify() {
		const el = getElement();
		if (el) {
			// 如果元素存在，检查样式
			const display = window.getComputedStyle(el).display;
			onStyleChange(el, display);

			// 如果元素变化了，需要重新监听
			if (el !== currentElement) {
				if (currentElement && observer) {
					// 停止监听旧元素
					observer.disconnect();
				}
				currentElement = el;
				// 监听新元素的样式变化
				observer = new MutationObserver(() => {
					checkAndNotify();
				});
				observer.observe(el, {
					attributes: true,
					attributeFilter: ["style"],
				});
			}
		} else {
			// 如果元素不存在，通知回调（display 可以设为空字符串或 null）
			onStyleChange(null, "");
		}
	}

	// 等待元素出现（不超时，一直等待）
	const waitForElementPromise = new Promise((resolve) => {
		const existingElement = getElement();
		if (existingElement) {
			resolve(existingElement);
			return;
		}

		const tempObserver = new MutationObserver(() => {
			const element = getElement();
			if (element) {
				tempObserver.disconnect();
				resolve(element);
			}
		});

		tempObserver.observe(document.body, {
			childList: true,
			subtree: true,
		});
	});

	// 等待元素出现
	await waitForElementPromise;

	// 创建 MutationObserver 监听 DOM 变化（以防元素被移除后重新添加）
	observer = new MutationObserver(() => {
		checkAndNotify();
	});

	// 监听 document.body 的 DOM 变化
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
		currentElement = null;
	};
}

/**
 * 等待元素的 visibility 样式不为 hidden
 * @param {string} selector - CSS 选择器
 * @param {number} timeout - 超时时间（毫秒），默认 5000ms
 * @returns {Promise<Element|null>} 找到的元素，超时返回 null
 */
export function waitForElementVisible(selector, timeout = 5000) {
	return new Promise((resolve) => {
		function checkVisibility() {
			const element = document.querySelector(selector);
			if (element) {
				const visibility = window.getComputedStyle(element).visibility;
				if (visibility !== "hidden") {
					resolve(element);
					return true;
				}
			}
			return false;
		}

		// 先检查元素是否已经可见
		if (checkVisibility()) {
			return;
		}

		// 使用 MutationObserver 监听 DOM 和样式变化
		const observer = new MutationObserver(() => {
			if (checkVisibility()) {
				observer.disconnect();
			}
		});

		// 监听 document.body 的 DOM 变化
		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});

		// 如果元素已存在，也监听其样式变化
		const existingElement = document.querySelector(selector);
		if (existingElement) {
			observer.observe(existingElement, {
				attributes: true,
				attributeFilter: ["style", "class"],
			});
		}

		// 设置超时
		setTimeout(() => {
			observer.disconnect();
			resolve(null);
		}, timeout);
	});
}
