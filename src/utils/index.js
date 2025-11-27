// ==================== Gmail 工具函数 ====================

/**
 * 检测写邮件窗口是否已打开
 * @returns {boolean} 如果写邮件窗口已打开返回 true，否则返回 false
 */
export function isWriteEmailOpen() {
	return !!document.querySelector('div[role="dialog"] form');
}

/**
 * 打开 Gmail 撰写视图（如果不在撰写视图则点击"写邮件"按钮）
 * @returns {Promise<boolean>} 成功打开返回 true，否则返回 false
 */
export async function openWriteEmail() {
	// 如果写邮件窗口已打开，直接返回 true
	if (isWriteEmailOpen()) {
		return true;
	}

	// 查找并点击"写邮件"按钮
	const writeEmailDiv = document.querySelector("div.T-I.T-I-KE.L3");
	if (writeEmailDiv) {
		writeEmailDiv.click();
		await new Promise((resolve) => setTimeout(resolve, 500));
		return true;
	}
	return false;
}

/**
 * 发送邮件
 * @returns {Promise<boolean>} 成功发送返回 true，否则返回 false
 */
export async function sendEmail() {
	try {
		const sendButton = document.querySelector(
			"div.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3"
		);
		if (sendButton) {
			sendButton.click();
			console.log("邮件已发送");
			await new Promise((resolve) => setTimeout(resolve, 500));
			return true;
		} else {
			console.error("无法找到发送按钮");
			return false;
		}
	} catch (error) {
		console.error("发送邮件时出错:", error);
		return false;
	}
}

// ==================== Excel 工具函数 ====================

/**
 * 解析 Excel 文件，返回对象数组
 * @param {File|ArrayBuffer} file - Excel 文件对象或 ArrayBuffer
 * @returns {Promise<Array<Object>>} 解析后的对象数组，第一行为表头
 */
export function parseExcel(file) {
	return new Promise((resolve, reject) => {
		// 如果已经是 ArrayBuffer，直接解析
		if (file instanceof ArrayBuffer) {
			try {
				const data = new Uint8Array(file);
				const workbook = XLSX.read(data, { type: "array" });
				const result = parseWorkbook(workbook);
				resolve(result);
			} catch (error) {
				reject(error);
			}
			return;
		}

		// 如果是 File 对象，先读取
		if (!(file instanceof File)) {
			reject(new Error("Invalid file type"));
			return;
		}

		// 检查文件格式
		if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
			reject(new Error("请选择Excel文件 (.xlsx 或 .xls)"));
			return;
		}

		const reader = new FileReader();
		reader.onload = function (e) {
			try {
				const data = new Uint8Array(e.target.result);
				const workbook = XLSX.read(data, { type: "array" });
				const result = parseWorkbook(workbook);
				resolve(result);
			} catch (error) {
				reject(error);
			}
		};
		reader.onerror = function () {
			reject(new Error("Failed to read file"));
		};
		reader.readAsArrayBuffer(file);
	});
}

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
			obj[header] = row[index] !== undefined ? row[index] : null;
		});
		return obj;
	});

	return jsonArray;
}

// ==================== 模板工具函数 ====================

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
		// 如果找不到对应的列，保留原始占位符并警告
		console.warn(`未找到占位符 {{ ${placeholder} }} 对应的 Excel 列`);
		return match;
	});
}
