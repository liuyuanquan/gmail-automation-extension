import { createApp } from "vue";
import { createPinia } from "pinia";
import "./assets/main.css";
import App from "./App.vue";

/**
 * 初始化 Vue 应用
 */
function initVueApp() {
	// 检查是否已经初始化
	if (document.getElementById("gmail-automation-root")) {
		console.log("Vue app already initialized");
		return;
	}

	// 创建根容器
	const rootContainer = document.createElement("div");
	rootContainer.id = "gmail-automation-root";
	document.body.appendChild(rootContainer);

	// 创建应用实例
	const app = createApp(App);

	// 使用 Pinia
	app.use(createPinia());

	// 挂载应用
	app.mount(rootContainer);

	console.log("Vue app initialized successfully");
}

// 等待 DOM 加载完成
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initVueApp);
} else {
	initVueApp();
}
