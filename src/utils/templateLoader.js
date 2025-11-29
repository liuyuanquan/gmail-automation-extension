// ==================== 模板加载器 ====================

/**
 * GitHub 仓库配置
 */
const GITHUB_CONFIG = {
	owner: "liuyuanquan",
	repo: "gmail-automation-extension",
	branch: "main",
	templatesPath: "public/templates",
};

/**
 * 构建 GitHub Raw 内容 URL
 * @param {string} filePath - 文件路径（相对于 templates 目录）
 * @returns {string} GitHub Raw URL
 */
function getGitHubRawUrl(filePath) {
	return `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${GITHUB_CONFIG.templatesPath}/${filePath}`;
}

/**
 * 从 GitHub 加载模板配置文件
 * @returns {Promise<Array>} 模板选项数组
 */
async function loadTemplateConfig() {
	try {
		const configUrl = getGitHubRawUrl("config.json");
		const response = await fetch(configUrl);
		if (!response.ok) {
			throw new Error(`Failed to load template config: ${response.statusText}`);
		}
		const config = await response.json();
		return config.templates || [];
	} catch (error) {
		console.error("加载模板配置失败:", error);
		// 返回空数组，避免应用崩溃
		return [];
	}
}

/**
 * 从 GitHub 加载模板 HTML 内容
 * @param {string} templateFileName - 模板文件名（如 "template15.html"）
 * @returns {Promise<string>} 模板 HTML 内容
 */
async function loadTemplateHtml(templateFileName) {
	try {
		const htmlUrl = getGitHubRawUrl(templateFileName);
		const response = await fetch(htmlUrl);
		if (!response.ok) {
			throw new Error(`Failed to load template HTML: ${response.statusText}`);
		}
		return await response.text();
	} catch (error) {
		console.error(`加载模板文件 ${templateFileName} 失败:`, error);
		return "";
	}
}

/**
 * 加载所有模板配置和内容
 * @returns {Promise<Array>} 完整的模板选项数组（包含 body 内容）
 */
export async function loadTemplates() {
	const templateConfigs = await loadTemplateConfig();

	// 并行加载所有模板的 HTML 内容
	const templatesWithContent = await Promise.all(
		templateConfigs.map(async (template) => {
			if (template.htmlFile) {
				const htmlContent = await loadTemplateHtml(template.htmlFile);
				return {
					...template,
					extra: {
						...template.extra,
						body: htmlContent,
					},
				};
			}
			return template;
		})
	);

	return templatesWithContent;
}

/**
 * 构建附件的 GitHub Raw URL
 * @param {string} filePath - 附件文件路径（相对于 templates 目录）
 * @returns {string} GitHub Raw URL
 */
export function getAttachmentGitHubUrl(filePath) {
	return getGitHubRawUrl(filePath);
}

/**
 * 获取 GitHub 配置（用于调试）
 */
export function getGitHubConfig() {
	return GITHUB_CONFIG;
}
