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
 * 应用美观的 Excel 样式
 * @param {Object} worksheet - 工作表对象
 * @param {Array<string>} headers - 表头数组
 * @param {number} dataRowCount - 数据行数
 * @param {Array<Object>} dataArray - 数据数组（用于添加超链接和样式）
 */
function applyExcelStyles(worksheet, headers, dataRowCount, dataArray) {
	// 检查是否支持样式（xlsx-js-style）
	const hasStyleSupport =
		typeof XLSX !== "undefined" &&
		XLSX.utils &&
		typeof XLSX.utils.sheet_set_range_style === "function";

	// 设置列宽
	setColumnWidths(worksheet, headers);

	// 设置行高
	if (!worksheet["!rows"]) {
		worksheet["!rows"] = [];
	}
	worksheet["!rows"][0] = { hpt: 28 }; // 表头行高 28
	for (let i = 1; i <= dataRowCount; i++) {
		worksheet["!rows"][i] = { hpt: 22 }; // 数据行高 22
	}

	// 如果支持样式，应用完整样式
	if (hasStyleSupport) {
		applyFullStyles(worksheet, headers, dataRowCount, dataArray);
	} else {
		// 否则只应用基础格式
		applyBasicStyles(worksheet, headers, dataRowCount, dataArray);
	}
}

/**
 * 应用完整的样式（需要 xlsx-js-style 支持）
 */
function applyFullStyles(worksheet, headers, dataRowCount, dataArray) {
	// 表头样式：深蓝灰色背景、白色加粗文字、居中、边框
	const headerStyle = {
		fill: {
			fgColor: { rgb: "2F5597" }, // 深蓝灰色
		},
		font: {
			bold: true,
			color: { rgb: "FFFFFF" },
			sz: 11,
			name: "Microsoft YaHei",
		},
		alignment: {
			horizontal: "center",
			vertical: "center",
			wrapText: true,
		},
		border: {
			top: { style: "thin", color: { rgb: "1F3A5F" } },
			bottom: { style: "thin", color: { rgb: "1F3A5F" } },
			left: { style: "thin", color: { rgb: "1F3A5F" } },
			right: { style: "thin", color: { rgb: "1F3A5F" } },
		},
	};

	// 应用表头样式
	const headerRange = XLSX.utils.encode_range({
		s: { c: 0, r: 0 },
		e: { c: headers.length - 1, r: 0 },
	});
	try {
		XLSX.utils.sheet_set_range_style(worksheet, headerRange, headerStyle);
	} catch (e) {
		console.warn("应用表头样式失败:", e);
	}

	// 数据行样式（所有内容垂直居中）
	const defaultDataStyle = {
		alignment: {
			horizontal: "center",
			vertical: "center", // 垂直居中
			wrapText: true,
		},
		border: {
			top: { style: "thin", color: { rgb: "E0E0E0" } },
			bottom: { style: "thin", color: { rgb: "E0E0E0" } },
			left: { style: "thin", color: { rgb: "E0E0E0" } },
			right: { style: "thin", color: { rgb: "E0E0E0" } },
		},
		font: {
			sz: 10,
			name: "Microsoft YaHei",
		},
	};

	// 状态列样式
	const statusStyles = {
		已发送: {
			fill: { fgColor: { rgb: "E8F5E9" } }, // 浅绿色背景
			font: { color: { rgb: "2E7D32" }, bold: true }, // 深绿色加粗文字
		},
		发送失败: {
			fill: { fgColor: { rgb: "FFEBEE" } }, // 浅红色背景
			font: { color: { rgb: "C62828" }, bold: true }, // 深红色加粗文字
		},
	};

	// 应用数据行样式
	for (let row = 1; row <= dataRowCount; row++) {
		for (let col = 0; col < headers.length; col++) {
			const cellAddress = XLSX.utils.encode_cell({ c: col, r: row });
			const cell = worksheet[cellAddress];
			if (!cell) continue;

			const header = headers[col];
			let cellStyle = { ...defaultDataStyle };

			// 状态列特殊样式
			if (header === "status" && cell.v && statusStyles[cell.v]) {
				cellStyle = { ...cellStyle, ...statusStyles[cell.v] };
			}

			// Email 列：蓝色超链接（确保垂直居中）
			if (
				header?.toLowerCase() === "email" &&
				cell.v &&
				typeof cell.v === "string" &&
				cell.v.includes("@")
			) {
				// 添加超链接
				cell.l = { Target: `mailto:${cell.v}` };
				// 设置超链接样式
				cellStyle.font = {
					...cellStyle.font,
					color: { rgb: "1976D2" }, // 蓝色
					underline: true,
				};
				// 确保垂直居中
				cellStyle.alignment.vertical = "center";
			}

			// 时间列：灰色文字、右对齐（保持垂直居中）
			if (header === "time" && cell.v) {
				cellStyle.alignment.horizontal = "right";
				cellStyle.alignment.vertical = "center"; // 确保垂直居中
				cellStyle.font.color = { rgb: "757575" }; // 灰色
			}

			// 失败原因列：红色文字（保持垂直居中）
			if (header === "reason" && cell.v) {
				cellStyle.font.color = { rgb: "C62828" }; // 深红色
				cellStyle.alignment.horizontal = "left";
				cellStyle.alignment.vertical = "center"; // 确保垂直居中
			}

			// 名称列：左对齐（保持垂直居中）
			if (header?.toLowerCase() === "name") {
				cellStyle.alignment.horizontal = "left";
				cellStyle.alignment.vertical = "center"; // 确保垂直居中
			}

			// Email 列：确保垂直居中
			if (header?.toLowerCase() === "email") {
				cellStyle.alignment.vertical = "center"; // 确保垂直居中
			}

			try {
				XLSX.utils.sheet_set_cell_style(worksheet, cellAddress, cellStyle);
			} catch (e) {
				// 忽略样式设置错误
			}
		}
	}
}

/**
 * 应用基础样式（标准 XLSX 库）
 */
function applyBasicStyles(worksheet, headers, dataRowCount, dataArray) {
	// 为 Email 列添加超链接
	const emailColIndex = headers.findIndex((h) => h?.toLowerCase() === "email");
	if (emailColIndex >= 0) {
		for (let row = 0; row < dataRowCount; row++) {
			const cellAddress = XLSX.utils.encode_cell({
				c: emailColIndex,
				r: row + 1,
			});
			const cell = worksheet[cellAddress];
			if (
				cell &&
				cell.v &&
				typeof cell.v === "string" &&
				cell.v.includes("@")
			) {
				// 添加超链接
				cell.l = { Target: `mailto:${cell.v}` };
				// 设置单元格类型，确保超链接可点击
				cell.t = "s";
			}
		}
	}

	// 为所有单元格设置垂直居中（通过行高和单元格格式）
	// 注意：标准 XLSX 库不支持直接设置垂直对齐，但可以通过行高来改善视觉效果
}

/**
 * 设置列宽（优化后的宽度设置）
 * @param {Object} worksheet - 工作表对象
 * @param {Array<string>} headers - 表头数组
 */
function setColumnWidths(worksheet, headers) {
	if (!worksheet["!cols"]) {
		worksheet["!cols"] = [];
	}

	headers.forEach((header, index) => {
		let width = 12; // 默认宽度

		// 根据列类型设置不同宽度（更合理的宽度）
		const headerLower = header?.toLowerCase();
		if (headerLower === "email") {
			width = 32; // 邮箱列
		} else if (headerLower === "status" || header === "status") {
			width = 14; // 状态列
		} else if (headerLower === "time" || header === "time") {
			width = 20; // 时间列
		} else if (headerLower === "reason" || header === "reason") {
			width = 45; // 失败原因列
		} else if (headerLower === "name" || header === "name") {
			width = 20; // 名称列
		} else {
			// 根据表头文字长度设置宽度，最小12，最大30
			width = Math.min(30, Math.max(12, (header?.length || 0) * 1.3 + 4));
		}

		worksheet["!cols"][index] = { wch: width };
	});
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

	// 应用格式（列宽、行高、超链接等）
	applyExcelStyles(worksheet, headers, dataArray.length, dataArray);

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
