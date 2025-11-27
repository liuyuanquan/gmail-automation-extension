/**
 * 邮件操作相关的 composable
 */
export function useEmailActions() {
	const gmailStore = useGmailStore();

	// 计算属性
	const canSend = computed(() => gmailStore.canSend);
	const isSending = computed(() => gmailStore.isSending);
	const currentSendIndex = computed(() => gmailStore.currentSendIndex);
	const totalCount = computed(() => gmailStore.totalCount);

	// 发送按钮文本
	const sendButtonText = computed(() => {
		if (isSending.value) {
			return `发送中 (${currentSendIndex.value}/${totalCount.value})`;
		}
		return "开始发送";
	});

	// 操作方法
	const handleSend = () => {
		gmailStore.startBatchSend();
	};

	const handleStop = () => {
		gmailStore.stopSending();
	};

	return {
		canSend,
		isSending,
		totalCount,
		sendButtonText,
		handleSend,
		handleStop,
	};
}
