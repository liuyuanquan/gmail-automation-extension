import { useEmailStore } from "../stores/emailStore";

/**
 * Excel 处理相关的 composable
 */
export function useExcel() {
	const emailStore = useEmailStore();

	/**
	 * 处理 Excel 文件导入
	 * @param {Object} uploadFile - Element Plus upload 组件的文件对象
	 */
	function handleExcelImport(uploadFile) {
		const file = uploadFile?.raw || uploadFile;
		if (!file) return;

		// 检查文件是否为Excel格式
		if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
			console.error("请选择Excel文件 (.xlsx 或 .xls)");
			return;
		}

		const reader = new FileReader();
		reader.onload = function (e) {
			try {
				const data = new Uint8Array(e.target.result);
				const workbook = XLSX.read(data, { type: "array" });

				// 处理工作簿以提取电子邮件地址
				const sheetName = workbook.SheetNames[0];
				const sheet = workbook.Sheets[sheetName];

				// 将 Excel 表格数据转换为 JSON 对象数组格式
				const jsonData = XLSX.utils.sheet_to_json(sheet, {
					header: 1, // 使用数组格式，第一行作为表头
					defval: null, // 空单元格的默认值
				});

				// 检查是否有数据
				if (jsonData.length === 0) {
					console.error("Excel文件中没有数据");
					emailStore.setExcelData(null);
					emailStore.setExcelRecipients(null);
					return;
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

				// 打印 JSON 数据
				console.log("=== Excel 表格数据 ===");
				console.log(JSON.stringify(jsonArray, null, 2));
				console.table(jsonArray.slice(0, 10)); // 只显示前10条记录
				console.log(`共 ${jsonArray.length} 条记录`);

				// 存储完整的 Excel JSON 数据
				emailStore.setExcelData(jsonArray);

				// 从 JSON 数据中提取 email 字段（不区分大小写）
				const emailKey = headers.find(
					(h) => h && String(h).toLowerCase() === "email"
				);
				const emails = emailKey
					? jsonArray
							.map((row) => row[emailKey])
							.filter((email) => email?.toString().includes("@"))
							.map((email) => email.toString().trim())
					: [];

				const recipients = emails.length > 0 ? emails.join("; ") : null;
				emailStore.setExcelRecipients(recipients);

				console.log(`共提取 ${emails.length} 个邮箱地址`, recipients);

				// 检查是否可以自动填充
				emailStore.checkAndAutoFill();
			} catch (error) {
				console.error("Error processing Excel file:", error);
				emailStore.setExcelRecipients(null);
				emailStore.setExcelData(null);
			}
		};
		reader.readAsArrayBuffer(file);
	}

	return {
		handleExcelImport,
	};
}
