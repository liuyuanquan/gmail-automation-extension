// ==================== 延迟工具函数 ====================

/**
 * 计算处理失败时的延迟时间（毫秒）
 * @param {number} sendDelay - 发送延迟配置（秒）
 * @returns {number} 延迟时间（毫秒）
 */
export function getFailureDelay(sendDelay) {
	return Math.max(500, (sendDelay * 1000) / 2);
}
