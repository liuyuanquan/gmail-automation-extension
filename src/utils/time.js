// ==================== 时间工具函数 ====================

/**
 * 格式化当前时间为字符串
 * @returns {string} 格式化的时间字符串 "YYYY-MM-DD HH:mm:ss"
 */
export function formatCurrentTime() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	const seconds = String(now.getSeconds()).padStart(2, "0");
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
