import App from "./App.vue";
import "@/assets/main.css";
import "element-plus/es/components/message/style/css";

/**
 * 移除URL中的compose=new参数
 * 如果URL包含compose=new参数，则使用history.replaceState移除它
 */
function removeComposeParam() {
  console.log('开始检查URL参数...');
  const url = new URL(window.location.href);
  console.log('当前URL:', url.href);
  console.log('URL hash部分:', url.hash);
  
  // 处理复杂的hash格式，如#sent?compose=new
  let hashContent = url.hash.substring(1);
  let baseHash = '';
  let hashQuery = '';
  
  // 分离基础hash部分和查询参数部分
  if (hashContent.includes('?')) {
    const parts = hashContent.split('?');
    baseHash = parts[0];
    hashQuery = parts[1];
    console.log('分离后的基础hash:', baseHash);
    console.log('分离后的hash查询参数:', hashQuery);
  } else {
    hashQuery = hashContent;
  }
  
  const hashParams = new URLSearchParams(hashQuery);
  console.log('解析后的hash参数:', Object.fromEntries(hashParams.entries()));
  
  // 检查hash部分是否包含compose=new参数
  if (hashParams.has('compose') && hashParams.get('compose') === 'new') {
    console.log('找到compose=new参数，准备移除...');
    
    // 移除compose参数
    hashParams.delete('compose');
    console.log('移除后剩余的hash参数:', Object.fromEntries(hashParams.entries()));
    
    // 重建hash字符串
    let newHashContent = baseHash;
    const newQueryString = hashParams.toString();
    
    if (newQueryString) {
      newHashContent += (baseHash ? '?' : '') + newQueryString;
    }
    
    const newHash = newHashContent ? '#' + newHashContent : '';
    console.log('重建后的hash:', newHash);
    
    // 构建新的URL
    const newUrl = `${url.origin}${url.pathname}${url.search}${newHash}`;
    console.log('构建的新URL:', newUrl);
    
    // 使用replaceState修改URL，避免页面刷新
    window.history.replaceState({}, document.title, newUrl);
    console.log('已成功移除compose=new参数并更新URL');
  } else {
    console.log('URL中不包含compose=new参数，无需处理');
  }
}

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

// 移除URL中的compose=new参数
removeComposeParam();

// 等待 DOM 加载完成
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initVueApp);
} else {
	initVueApp();
}
