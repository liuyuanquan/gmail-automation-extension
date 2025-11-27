import { ref } from "vue";
import { useEmailStore } from "../stores/emailStore";
import { useTemplate } from "./useTemplate";

/**
 * 邮件表单相关的 composable
 */
export function useEmailForm() {
	const emailStore = useEmailStore();
	const { loadTemplate } = useTemplate();

	const selectedTemplate = ref("");

	/**
	 * 处理模板选择变化
	 */
	const handleTemplateChange = async (value) => {
		if (value) {
			await loadTemplate(value);
		} else {
			emailStore.setSelectedTemplate(null);
		}
	};

	return {
		selectedTemplate,
		handleTemplateChange,
	};
}
