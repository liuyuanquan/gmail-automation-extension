import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

export default defineConfig({
	plugins: [
		vue(),
		AutoImport({
			resolvers: [ElementPlusResolver()],
		}),
		Components({
			resolvers: [ElementPlusResolver()],
		}),
	],
	css: {
		postcss: "./postcss.config.js",
	},
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
});
