// ==================== Excel 工具函数 ====================

/**
 * 解析工作簿，转换为对象数组
 * @param {Object} workbook - XLSX 工作簿对象
 * @returns {Array<Object>} 对象数组
 */
function parseWorkbook(workbook) {
	// 处理工作簿以提取数据
	const sheetName = workbook.SheetNames[0];
	const sheet = workbook.Sheets[sheetName];

	// 将 Excel 表格数据转换为 JSON 对象数组格式
	const jsonData = XLSX.utils.sheet_to_json(sheet, {
		header: 1, // 使用数组格式，第一行作为表头
		defval: null, // 空单元格的默认值
	});

	// 检查是否有数据
	if (jsonData.length === 0) {
		throw new Error("Excel文件中没有数据");
	}

	// 第一行是表头
	const headers = jsonData[0];

	// 从第二行开始是数据
	const dataRows = jsonData.slice(1);

	// 转换为对象数组格式
	const jsonArray = dataRows.map((row) => {
		const obj = {};
		headers.forEach((header, index) => {
			obj[header] = row[index] ?? null;
		});
		return obj;
	});

	return { jsonArray, headers };
}

/**
 * 从 ArrayBuffer 解析工作簿
 * @param {ArrayBuffer} arrayBuffer - ArrayBuffer 数据
 * @returns {Object} 解析结果
 */
function parseFromArrayBuffer(arrayBuffer) {
	const data = new Uint8Array(arrayBuffer);
	const workbook = XLSX.read(data, { type: "array" });
	return parseWorkbook(workbook);
}

/**
 * 解析 Excel 文件，返回对象数组和表头
 * @param {File|ArrayBuffer} file - Excel 文件对象或 ArrayBuffer
 * @returns {Promise<{jsonArray: Array<Object>, headers: Array<string>}>} 解析结果，包含对象数组和表头数组
 */
export function parseExcel(file) {
	// 如果已经是 ArrayBuffer，直接解析
	if (file instanceof ArrayBuffer) {
		return Promise.resolve(parseFromArrayBuffer(file));
	}

	// 如果是 File 对象，先读取
	if (!(file instanceof File)) {
		return Promise.reject(new Error("Invalid file type"));
	}

	// 检查文件格式
	if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
		return Promise.reject(new Error("请选择Excel文件 (.xlsx 或 .xls)"));
	}

	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				resolve(parseFromArrayBuffer(e.target.result));
			} catch (error) {
				reject(error);
			}
		};
		reader.onerror = () => reject(new Error("Failed to read file"));
		reader.readAsArrayBuffer(file);
	});
}

/**
 * 生成带时间戳的文件名
 * @param {string} originalFileName - 原始文件名（如 "data.xlsx" 或 "data_20240101_120000.xlsx"）
 * @returns {string} 带时间戳的文件名（如 "data_20240101_120000.xlsx"）
 */
function generateFileNameWithTimestamp(originalFileName) {
	// 提取文件名和扩展名
	const lastDotIndex = originalFileName.lastIndexOf(".");
	const nameWithoutExt =
		lastDotIndex > 0
			? originalFileName.substring(0, lastDotIndex)
			: originalFileName;
	const extension =
		lastDotIndex > 0 ? originalFileName.substring(lastDotIndex) : "";

	// 生成时间戳（格式：YYYYMMDD_HHMMSS）
	const now = new Date();
	const timestamp = now
		.toISOString()
		.replace("T", "_")
		.replace(/[-:]/g, "")
		.replace(/\.\d{3}Z$/, "")
		.substring(0, 15); // YYYYMMDD_HHMMSS

	// 检测文件名是否已经包含时间戳格式：_YYYYMMDD_HHMMSS
	const timestampRegex = /_(\d{8}_\d{6})(?=\.[^.]+$|$)/;
	const baseName = nameWithoutExt.replace(timestampRegex, "");

	return `${baseName}_${timestamp}${extension}`;
}

/**
 * 将对象数组写回 Excel 文件（使用 Chrome Downloads API）
 * @param {Array<Object>} dataArray - 对象数组
 * @param {Array<string>} headers - 表头数组
 * @param {string} fileName - 原始文件名
 * @returns {Promise<string>} 返回保存的文件路径
 */
export async function writeExcelFile(dataArray, headers, fileName) {
	// 生成带时间戳的文件名
	const fileNameWithTimestamp = generateFileNameWithTimestamp(fileName);

	// 将对象数组转换为二维数组格式（第一行是表头）
	const worksheetData = [
		headers,
		...dataArray.map((row) => headers.map((header) => row[header] ?? null)),
	];

	// 创建工作表
	const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

	// 创建工作簿
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

	// 将工作簿转换为二进制数据
	const excelBuffer = XLSX.write(workbook, {
		type: "array",
		bookType: "xlsx",
	});

	// 创建 Blob URL
	const blob = new Blob([excelBuffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const blobUrl = URL.createObjectURL(blob);

	// 在 Manifest V3 中，content script 无法直接访问 chrome.downloads API
	// 需要通过 background service worker 来处理下载
	if (typeof chrome !== "undefined" && chrome.runtime) {
		try {
			// 发送消息到 background script 来处理下载
			return new Promise((resolve, reject) => {
				chrome.runtime.sendMessage(
					{
						action: "downloadFile",
						blobUrl: blobUrl,
						fileName: fileNameWithTimestamp,
					},
					(response) => {
						// 释放 Blob URL
						URL.revokeObjectURL(blobUrl);

						if (chrome.runtime.lastError) {
							reject(new Error(chrome.runtime.lastError.message));
							return;
						}

						if (response && response.success) {
							resolve(response.filePath);
						} else {
							reject(new Error(response?.error || "下载失败"));
						}
					}
				);
			});
		} catch (error) {
			URL.revokeObjectURL(blobUrl);
			console.error("发送下载消息失败:", error);
			throw error;
		}
	}

	// 如果不在 Chrome Extension 环境中，抛出错误
	const errorInfo = {
		chrome: typeof chrome,
		chromeRuntime: typeof chrome?.runtime,
		runtimeId: chrome?.runtime?.id,
		userAgent: navigator.userAgent,
	};
	console.error("Chrome Runtime API 不可用，详细信息:", errorInfo);
	throw new Error(`Chrome Runtime API 不可用: ${JSON.stringify(errorInfo)}`);
}

/**
 * 为 Excel 数据添加缺失的字段
 * @param {Array} jsonArray - 数据数组
 * @param {Array} headers - 表头数组
 * @param {string} fieldName - 要添加的字段名
 */
export function addMissingField(jsonArray, headers, fieldName) {
	if (!headers.includes(fieldName)) {
		headers.push(fieldName);
		jsonArray.forEach((row) => {
			if (!(fieldName in row)) {
				row[fieldName] = null;
			}
		});
	}
}

/**
 * 从 Excel 数据中查找 email 字段的键名（不区分大小写）
 * @param {Array} excelData - Excel 数据数组
 * @returns {string|null} email 字段的键名，如果不存在返回 null
 */
export function findEmailKey(excelData) {
	if (!excelData?.length) {
		return null;
	}
	return (
		Object.keys(excelData[0] || {}).find(
			(key) => key?.toLowerCase() === "email"
		) || null
	);
}
