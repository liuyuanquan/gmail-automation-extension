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
		// 如果找不到对应的列，保留原始占位符（原封不动）
		return match;
	});
}
