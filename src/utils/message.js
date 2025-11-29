// ==================== 消息提示工具函数 ====================
import { ElMessage } from "element-plus";

/**
 * 显示成功消息
 * @param {string} message - 消息内容
 * @param {number} [duration=2000] - 显示时长（毫秒），0 表示不自动关闭
 * @returns {Object} ElMessage 实例
 */
export function showSuccess(message, duration = 2000) {
	return ElMessage({
		message,
		type: "success",
		duration,
	});
}

/**
 * 显示错误消息
 * @param {string} message - 消息内容
 * @param {number} [duration=3000] - 显示时长（毫秒），0 表示不自动关闭
 * @returns {Object} ElMessage 实例
 */
export function showError(message, duration = 3000) {
	return ElMessage({
		message,
		type: "error",
		duration,
	});
}

/**
 * 显示警告消息
 * @param {string} message - 消息内容
 * @param {number} [duration=3000] - 显示时长（毫秒），0 表示不自动关闭
 * @returns {Object} ElMessage 实例
 */
export function showWarning(message, duration = 3000) {
	return ElMessage({
		message,
		type: "warning",
		duration,
	});
}

/**
 * 显示信息消息
 * @param {string} message - 消息内容
 * @param {number} [duration=2000] - 显示时长（毫秒），0 表示不自动关闭
 * @returns {Object} ElMessage 实例
 */
export function showInfo(message, duration = 2000) {
	return ElMessage({
		message,
		type: "info",
		duration,
	});
}

// ==================== 顶部常驻消息管理 ====================
// 顶部常驻消息实例
let topMessage = null;

/**
 * 更新顶部常驻消息
 * @param {string} message - 消息内容
 * @param {"info"|"success"|"warning"|"error"} [type="info"] - 消息类型
 */
export function updateTopMessage(message, type = "info") {
	// 标准化类型（warn -> warning）
	const normalizedType = type === "warn" ? "warning" : type;

	// 关闭旧消息
	if (topMessage && topMessage.close) {
		topMessage.close();
		topMessage = null;
	}

	// 根据类型创建新消息（常驻，不自动关闭）
	switch (normalizedType) {
		case "success":
			topMessage = showSuccess(message, 0);
			break;
		case "warning":
			topMessage = showWarning(message, 0);
			break;
		case "error":
			topMessage = showError(message, 0);
			break;
		case "info":
		default:
			topMessage = showInfo(message, 0);
			break;
	}
}

/**
 * 关闭顶部常驻消息
 */
export function closeTopMessage() {
	if (topMessage && topMessage.close) {
		topMessage.close();
		topMessage = null;
	}
}
