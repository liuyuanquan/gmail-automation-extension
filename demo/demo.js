/**
 * Demo 入口文件
 * 模拟 Chrome Extension 环境，用于本地调试
 */

import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import DemoApp from "./DemoApp.vue";
import "../src/assets/main.css";

// Mock Gmail 相关函数，避免在 demo 环境中报错
window.mockGmailFunctions = {
	isWriteEmailOpen: () => false,
	openWriteEmail: async () => {
		console.log("📧 [Mock] 打开写邮件窗口");
		return Promise.resolve();
	},
	discardDraft: async () => {
		console.log("🗑️ [Mock] 舍弃草稿");
		return Promise.resolve();
	},
	setRecipientField: (value) => {
		console.log("👤 [Mock] 设置收件人:", value);
	},
	setTemplateFields: async () => {
		console.log("📝 [Mock] 设置模板字段");
		return Promise.resolve();
	},
	sendEmail: async () => {
		console.log("📤 [Mock] 发送邮件");
		return { success: true, message: "邮件已发送（模拟）" };
	},
};

console.log("✅ Gmail Mock 函数已设置");

// 初始化 Vue 应用
function initDemo() {
	// 创建根容器
	const rootContainer = document.getElementById("gmail-automation-root");
	if (!rootContainer) {
		console.error("找不到根容器 #gmail-automation-root");
		return;
	}

	// 创建应用实例
	const app = createApp(DemoApp);

	// 使用 Pinia
	app.use(createPinia());

	// 使用 Element Plus
	app.use(ElementPlus);

	// 注册所有图标
	for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
		app.component(key, component);
	}

	// 挂载应用
	app.mount(rootContainer);

	console.log("✅ Demo 应用已初始化");
}

// 等待 DOM 加载完成
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initDemo);
} else {
	initDemo();
}
