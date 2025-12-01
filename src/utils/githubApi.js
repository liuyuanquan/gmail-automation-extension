/**
 * GitHub API 工具
 * 用于将模板保存到 GitHub 仓库
 */

/**
 * GitHub 仓库配置
 */
export const GITHUB_CONFIG = {
	owner: "liuyuanquan",
	repo: "gmail-automation-extension",
	branch: "main",
	templatesPath: "public/templates",
	// 从环境变量读取 token
	token: import.meta.env.GITHUB_TOKEN,
};

/**
 * 构建 GitHub Raw 内容 URL
 * @param {string} filePath - 文件路径（相对于 templates 目录）
 * @returns {string} GitHub Raw URL
 */
export function getGitHubRawUrl(filePath) {
	return `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${GITHUB_CONFIG.templatesPath}/${filePath}`;
}

/**
 * 构建 GitHub API Contents URL
 * @param {string} filePath - 文件路径（相对于仓库根目录）
 * @returns {string} GitHub API URL
 */
function getGitHubApiUrl(filePath) {
	return `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`;
}

/**
 * 从 GitHub 获取文件内容（统一使用 API）
 * @param {string} filePath - 文件路径（相对于 templates 目录）
 * @returns {Promise<{sha: string, content: string}>} 文件信息对象，包含 SHA 和内容
 */
export async function getGitHubFileContent(filePath) {
	// 构建完整路径（相对于 templates 目录）
	const fullPath = `${GITHUB_CONFIG.templatesPath}/${filePath}`;
	const url = getGitHubApiUrl(fullPath);

	try {
		const response = await fetch(url, {
			headers: {
				Authorization: `token ${GITHUB_CONFIG.token}`,
				Accept: "application/vnd.github.v3+json",
			},
		});

		if (response.status === 404) {
			// 文件不存在，返回 null
			return null;
		}

		if (!response.ok) {
			throw new Error(`获取文件失败: ${response.statusText}`);
		}

		const data = await response.json();
		return {
			sha: data.sha,
			content: decodeFromBase64(data.content), // Base64 解码（支持 Unicode）
		};
	} catch (error) {
		// 如果是 404，返回 null（文件不存在）
		if (error.message && error.message.includes("404")) {
			return null;
		}
		console.error(`获取文件 ${filePath} 失败:`, error);
		throw error;
	}
}

/**
 * 将字符串转换为 Base64 编码（支持 Unicode）
 * @param {string} str - 要编码的字符串
 * @returns {string} Base64 编码后的字符串
 */
function encodeToBase64(str) {
	// 先将字符串转换为 UTF-8 字节数组，然后进行 Base64 编码
	const utf8Bytes = new TextEncoder().encode(str);
	// 将字节数组转换为二进制字符串
	let binaryString = "";
	for (let i = 0; i < utf8Bytes.length; i++) {
		binaryString += String.fromCharCode(utf8Bytes[i]);
	}
	return btoa(binaryString);
}

/**
 * 将 Base64 编码的字符串解码（支持 Unicode）
 * @param {string} base64 - Base64 编码的字符串
 * @returns {string} 解码后的字符串
 */
function decodeFromBase64(base64) {
	// 先进行 Base64 解码
	const binaryString = atob(base64);
	// 将二进制字符串转换为字节数组
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	// 使用 TextDecoder 将 UTF-8 字节数组转换为字符串
	return new TextDecoder().decode(bytes);
}

/**
 * 创建或更新文件到 GitHub
 * @param {string} filePath - 文件路径（相对于仓库根目录）
 * @param {string} content - 文件内容（字符串或 Base64 编码字符串）
 * @param {string} message - 提交消息
 * @param {string} [sha] - 文件 SHA（更新时需要）
 * @param {boolean} [isBase64Content=false] - 内容是否已经是 Base64 编码
 * @returns {Promise<void>}
 */
export async function createOrUpdateGitHubFile(
	filePath,
	content,
	message,
	sha = null,
	isBase64Content = false
) {
	const url = getGitHubApiUrl(filePath);

	const body = {
		message,
		content: isBase64Content ? content : encodeToBase64(content), // 根据标志判断是否需要 Base64 编码
		branch: GITHUB_CONFIG.branch,
	};

	// 如果提供了 SHA，说明是更新文件
	if (sha) {
		body.sha = sha;
	}

	try {
		const response = await fetch(url, {
			method: "PUT",
			headers: {
				Authorization: `token ${GITHUB_CONFIG.token}`,
				Accept: "application/vnd.github.v3+json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(
				`保存文件失败: ${response.statusText} - ${errorData.message || ""}`
			);
		}

		console.log(`文件已保存到 GitHub: ${filePath}`);
	} catch (error) {
		console.error("保存文件到 GitHub 失败:", error);
		throw error;
	}
}

/**
 * 删除 GitHub 文件
 * @param {string} filePath - 文件路径（相对于仓库根目录）
 * @param {string} message - 提交消息
 * @param {string} sha - 文件 SHA（删除时必须）
 * @returns {Promise<void>}
 */
export async function deleteGitHubFile(filePath, message, sha) {
	const url = getGitHubApiUrl(filePath);

	const body = {
		message,
		sha,
		branch: GITHUB_CONFIG.branch,
	};

	try {
		const response = await fetch(url, {
			method: "DELETE",
			headers: {
				Authorization: `token ${GITHUB_CONFIG.token}`,
				Accept: "application/vnd.github.v3+json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(
				`删除文件失败: ${response.statusText} - ${errorData.message || ""}`
			);
		}

		console.log(`文件已从 GitHub 删除: ${filePath}`);
	} catch (error) {
		console.error("删除文件失败:", error);
		throw error;
	}
}
