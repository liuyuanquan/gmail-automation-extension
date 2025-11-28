// ==================== 统一导出所有工具函数 ====================

// DOM 工具函数
export {
	waitForElement,
	waitForElementRemoved,
	watchElementsExistence,
} from "./dom";

// Gmail 工具函数
export {
	isWriteEmailOpen,
	getComposeFields,
	setRecipientField,
	setSubjectField,
	setBodyField,
	setAttachmentsField,
	setTemplateFields,
	fillEmailFields,
	discardDraft,
	openWriteEmail,
	sendEmail,
} from "./gmail";

// Excel 工具函数
export {
	parseExcel,
	writeExcelFile,
	addMissingField,
	findEmailKey,
} from "./excel";

// 模板工具函数
export { replaceTemplatePlaceholders } from "./template";

// 时间工具函数
export { formatCurrentTime } from "./time";

// 延迟工具函数
export { getFailureDelay } from "./delay";
