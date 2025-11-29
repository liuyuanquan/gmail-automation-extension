import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import fs from "fs";
import path from "path";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

// 自定义插件：复制public目录但排除templates目录
function copyPublicWithoutTemplates() {
	return {
		name: 'copy-public-without-templates',
		writeBundle() {
			const publicDir = resolve(__dirname, 'public');
			const distDir = resolve(__dirname, 'dist');
			const templatesDir = 'templates';

			// 递归复制函数
			function copyRecursive(source, target) {
				if (!fs.existsSync(source)) return;

				if (!fs.existsSync(target)) {
					fs.mkdirSync(target, { recursive: true });
				}

				const entries = fs.readdirSync(source, { withFileTypes: true });
				for (const entry of entries) {
					const sourcePath = path.join(source, entry.name);
					const targetPath = path.join(target, entry.name);

					// 跳过templates目录
					if (entry.isDirectory() && entry.name === templatesDir) {
						continue;
					}

					if (entry.isDirectory()) {
						copyRecursive(sourcePath, targetPath);
					} else {
						fs.copyFileSync(sourcePath, targetPath);
					}
				}
			}

			// 执行复制
			copyRecursive(publicDir, distDir);
		}
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
					"@element-plus/icons-vue": [
						"Delete",
						// 可以在这里添加更多需要自动导入的图标
					],
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
		// 使用 esbuild 压缩（Vite 默认，更快）
		minify: "esbuild",
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "src"),
		},
	},
	// 禁用默认的public目录复制行为，使用自定义插件处理
	publicDir: false,
});
