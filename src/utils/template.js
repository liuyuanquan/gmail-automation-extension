// ==================== 模板工具函数 ====================

import {
	getGitHubRawUrl,
	GITHUB_CONFIG,
	getGitHubFileContent,
	createOrUpdateGitHubFile,
} from "./githubApi";

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

/**
 * 从 GitHub 加载模板配置文件
 * @returns {Promise<Array>} 模板选项数组
 */
async function loadTemplateConfig() {
	try {
		const fileContent = await getGitHubFileContent("config.json");
		const config = JSON.parse(fileContent.content);
		return config.templates || [];
	} catch (error) {
		console.error("加载模板配置失败:", error);
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
		const fileContent = await getGitHubFileContent(templateFileName);
		if (!fileContent) {
			console.warn(`模板文件 ${templateFileName} 不存在`);
			return "";
		}
		return fileContent.content;
	} catch (error) {
		console.error(`加载模板文件 ${templateFileName} 失败:`, error);
		return "";
	}
}

/**
 * 加载所有模板配置和内容（始终从 GitHub 加载）
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
 * 保存模板配置到 GitHub（仅更新 config.json）
 * @param {Array} templates - 模板配置数组
 * @returns {Promise<void>}
 */
export async function saveTemplateConfigToGitHub(templates) {
	// 构建配置对象（不包含 body 字段）
	const configData = {
		templates: templates.map((template) => ({
			label: template.label,
			value: template.value,
			htmlFile: template.htmlFile,
			extra: {
				subject: template.extra?.subject || "",
				attachments: template.extra?.attachments || [],
			},
		})),
	};

	const configContent = JSON.stringify(configData, null, "\t");

	// 获取现有文件的 SHA（如果存在）
	let sha = null;
	const existingFile = await getGitHubFileContent("config.json");
	if (existingFile) {
		sha = existingFile.sha;
	}

	// 保存 config.json
	const configMessage = sha
		? `chore(templates): 更新模板配置`
		: `feat(templates): 初始化模板配置`;
	await createOrUpdateGitHubFile(
		`${GITHUB_CONFIG.templatesPath}/config.json`,
		configContent,
		configMessage,
		sha
	);

	console.log("模板配置已保存到 GitHub");
}

/**
 * 保存模板 HTML 文件到 GitHub
 * @param {Array} templates - 需要保存 HTML 文件的模板列表
 * @param {boolean} [isNew] - 是否为新增文件，如果是新增则不需要获取 SHA
 * @returns {Promise<void>}
 */
export async function saveTemplateHtmlToGitHub(templates, isNew = false) {
	// 串行保存指定模板的 HTML 文件（避免并发导致的 SHA 冲突）
	for (const template of templates) {
		if (template.htmlFile && template.extra?.body) {
			let htmlSha = null;
			let htmlMessage = `feat(templates): 新增模板文件 ${template.htmlFile}`;

			// 如果不是新增文件，需要获取 SHA 用于更新
			if (!isNew) {
				const existingHtmlFile = await getGitHubFileContent(template.htmlFile);
				htmlSha = existingHtmlFile?.sha;
				htmlMessage = htmlSha
					? `chore(templates): 更新模板文件 ${template.htmlFile}`
					: `feat(templates): 新增模板文件 ${template.htmlFile}`;
			}

			await createOrUpdateGitHubFile(
				`${GITHUB_CONFIG.templatesPath}/${template.htmlFile}`,
				template.extra.body,
				htmlMessage,
				htmlSha
			);
		}
	}

	console.log("模板 HTML 文件已保存到 GitHub");
}

/**
 * 保存模板配置和 HTML 文件到 GitHub（便捷方法）
 * @param {Array} templates - 模板配置数组
 * @param {Array} [templatesToSaveHtml] - 需要保存 HTML 文件的模板列表（如果提供，只保存这些模板的 HTML 文件）
 * @returns {Promise<void>}
 */
export async function saveTemplatesToGitHub(
	templates,
	templatesToSaveHtml = null
) {
	// 保存配置
	await saveTemplateConfigToGitHub(templates);

	// 保存 HTML 文件
	const templatesToSave = templatesToSaveHtml || templates;
	if (templatesToSave.length > 0) {
		await saveTemplateHtmlToGitHub(templatesToSave);
	}
}
