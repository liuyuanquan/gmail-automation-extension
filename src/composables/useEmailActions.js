import { computed } from "vue";
import { useEmailStore } from "../stores/emailStore";

/**
 * 邮件操作相关的 composable
 */
export function useEmailActions() {
	const emailStore = useEmailStore();

	// 计算属性
	const canSend = computed(() => emailStore.canSend);
	const isSending = computed(() => emailStore.isSending);
	const currentSendIndex = computed(() => emailStore.currentSendIndex);
	const totalCount = computed(() => emailStore.totalCount);

	// 发送按钮文本
	const sendButtonText = computed(() => {
		if (isSending.value) {
			return `🚀 发送中 (${currentSendIndex.value}/${totalCount.value})`;
		}
		return "🚀 开始发送";
	});

	// 操作方法
	const handleSend = () => {
		emailStore.startBatchSend();
	};

	const handleStop = () => {
		emailStore.stopSending();
	};

	return {
		canSend,
		isSending,
		currentSendIndex,
		totalCount,
		sendButtonText,
		handleSend,
		handleStop,
	};
}
