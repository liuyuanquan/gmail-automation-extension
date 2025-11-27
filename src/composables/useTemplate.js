import { useEmailStore } from "../stores/emailStore";

/**
 * 模板相关的 composable
 */
export function useTemplate() {
	const emailStore = useEmailStore();

	/**
	 * 加载邮件模板内容（JSON 和 HTML）
	 * @param {string} templateName - 模板名称（不包含扩展名）
	 */
	async function loadTemplate(templateName) {
		try {
			emailStore.setSelectedTemplate(templateName);

			const templateBase = chrome.runtime.getURL(`templates/${templateName}`);

			const [jsonData, htmlData] = await Promise.all([
				fetch(`${templateBase}.json`).then((r) => r.json()),
				fetch(`${templateBase}.html`).then((r) => r.text()),
			]);

			emailStore.setTemplate({
				subject: jsonData.subject,
				body: htmlData,
			});

			console.log("Template loaded:", templateName);

			// 检查是否可以自动填充
			checkAndAutoFill();
		} catch (error) {
			console.error("Error loading template:", error);
			emailStore.setTemplate(null);
		}
	}

	/**
	 * 检查数据是否准备好，如果准备好则自动填充第一条数据
	 */
	function checkAndAutoFill() {
		const hasTemplate = !!(
			emailStore.template?.subject && emailStore.template?.body
		);
		const hasExcelData = !!(emailStore.excelData?.length > 0);

		if (hasTemplate && hasExcelData) {
			console.log("模板和 Excel 数据都已加载完成，自动填充第一条数据");
			emailStore.triggerComposeAndFill();
		}
	}

	return {
		loadTemplate,
		checkAndAutoFill,
	};
}
