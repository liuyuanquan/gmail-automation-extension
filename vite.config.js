import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { readdirSync, copyFileSync, mkdirSync, existsSync } from "fs";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

// 使用 import.meta.url 获取当前文件目录（ES 模块方式）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 自定义插件：复制 public 目录但排除 templates 目录
 * templates 目录不需要复制到 dist，因为模板是从 GitHub 动态加载的
 */
function copyPublicWithoutTemplates() {
	return {
		name: "copy-public-without-templates",
		writeBundle() {
			const publicDir = resolve(__dirname, "public");
			const distDir = resolve(__dirname, "dist");
			const excludeDir = "templates";

			if (!existsSync(publicDir)) return;

			/**
			 * 递归复制目录，排除指定目录
			 */
			function copyRecursive(source, target) {
				if (!existsSync(source)) return;

				if (!existsSync(target)) {
					mkdirSync(target, { recursive: true });
				}

				const entries = readdirSync(source, { withFileTypes: true });
				for (const entry of entries) {
					// 跳过 templates 目录
					if (entry.isDirectory() && entry.name === excludeDir) {
						continue;
					}

					const sourcePath = join(source, entry.name);
					const targetPath = join(target, entry.name);

					if (entry.isDirectory()) {
						copyRecursive(sourcePath, targetPath);
					} else {
						copyFileSync(sourcePath, targetPath);
					}
				}
			}

			copyRecursive(publicDir, distDir);
		},
	};
}

export default defineConfig({
	plugins: [
		vue(),
		copyPublicWithoutTemplates(),
		AutoImport({
			imports: [
				"vue", // 自动导入 Vue API（ref, computed, watch, onMounted 等）
				"pinia", // 自动导入 Pinia API（defineStore, storeToRefs 等）
				{
					"@/stores/gmailStore": ["useGmailStore"],
					"@element-plus/icons-vue": ["Delete"],
				},
			],
			resolvers: [ElementPlusResolver()],
			dts: false, // 不生成类型声明文件（JS 项目）
		}),
		Components({
			resolvers: [
				ElementPlusResolver({
					importStyle: "css", // 按需导入 CSS 样式
				}),
			],
		}),
	],
	build: {
		outDir: "dist",
		emptyOutDir: true,
		rollupOptions: {
			input: {
				content: resolve(__dirname, "src/app.js"),
			},
			output: {
				format: "iife",
				name: "GmailAutomation",
				entryFileNames: "js/[name].js",
				chunkFileNames: "js/[name].js",
				assetFileNames: "[name].[ext]",
			},
		},
		minify: "esbuild", // 使用 esbuild 压缩（Vite 默认，更快）
		chunkSizeWarningLimit: 1000, // 增加 chunk 大小警告限制
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "src"),
		},
	},
	// 禁用默认的 public 目录复制行为，使用自定义插件处理
	publicDir: false,
	// 优化依赖预构建
	optimizeDeps: {
		include: ["vue", "pinia", "element-plus"],
	},
});
