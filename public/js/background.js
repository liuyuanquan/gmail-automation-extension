// Background Service Worker for Chrome Extension
// 处理下载请求（因为某些 API 在 content script 中受限）

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	// 处理下载请求
	if (request.action === "downloadFile") {
		const { blobUrl, fileName } = request;

		// 下载文件
		chrome.downloads.download(
			{
				url: blobUrl,
				filename: fileName,
				saveAs: false,
				conflictAction: "uniquify",
			},
			(downloadId) => {
				if (chrome.runtime.lastError) {
					sendResponse({
						success: false,
						error: chrome.runtime.lastError.message,
					});
					return;
				}

				// 监听下载完成
				const onDownloadChanged = (downloadDelta) => {
					if (downloadDelta.id !== downloadId) return;

					if (downloadDelta.state?.current === "complete") {
						chrome.downloads.onChanged.removeListener(onDownloadChanged);
						chrome.downloads.search({ id: downloadId }, (results) => {
							sendResponse({
								success: true,
								filePath: results?.[0]?.filename || fileName,
							});
						});
					} else if (downloadDelta.state?.current === "interrupted") {
						chrome.downloads.onChanged.removeListener(onDownloadChanged);
						sendResponse({
							success: false,
							error: "下载被中断",
						});
					}
				};

				chrome.downloads.onChanged.addListener(onDownloadChanged);
			}
		);

		return true; // 异步响应
	}
});
