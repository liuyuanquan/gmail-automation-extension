# Gmail Automation Chrome Extension

这是一个 Chrome 扩展程序，可以帮助您自动填写 Gmail 邮件的收件人、主题、正文并发送邮件。支持批量发送和 Excel 数据导入。

## 功能特点

- 📧 自动填写收件人、主题和邮件正文
- 📊 支持 Excel 文件导入，批量提取收件人
- 📋 支持邮件模板，快速填充邮件内容
- 🚀 批量发送邮件，自动处理多封邮件
- 🎨 现代化的 UI 界面（基于 Vue 3 + Element Plus）
- ⚡ 通过浮动按钮快速访问功能
- 🔧 模板管理功能，支持在扩展内直接管理模板
- 📎 支持附件上传和管理，附件保存到 GitHub

## 📦 项目结构

```
gmail-automation-extension/
├── src/
│   ├── components/
│   │   ├── Overlay.vue          # Dialog 覆盖层组件
│   │   ├── TemplateManager.vue  # 模板管理组件
│   │   └── FloatingButton.vue   # 浮动按钮组件
│   ├── constants/
│   │   └── index.js             # 常量定义
│   ├── stores/
│   │   └── gmailStore.js         # Gmail相关状态管理
│   ├── utils/
│   │   ├── delay.js              # 延迟函数
│   │   ├── dom.js                # DOM操作工具
│   │   ├── excel.js              # Excel处理工具
│   │   ├── gmail.js              # Gmail相关功能
│   │   ├── index.js              # 工具函数入口
│   │   ├── message.js            # 消息处理
│   │   ├── template.js           # 模板处理
│   │   ├── githubApi.js          # GitHub API 工具
│   │   └── time.js               # 时间相关工具
│   ├── assets/
│   │   ├── main.css              # 全局样式
│   │   ├── template15.html       # 邮件模板
│   │   └── template16.html       # 邮件模板
│   ├── App.vue                   # 根组件
│   └── app.js                    # 应用入口文件
├── public/                       # 静态资源目录（会被复制到 dist）
│   ├── manifest.json             # Chrome 扩展配置
│   ├── js/
│   │   ├── background.js         # 背景脚本
│   │   └── xlsx.full.min.js      # XLSX 库（外部依赖）
│   ├── icons/                    # 扩展图标
│   │   ├── icon128.png
│   │   ├── icon128.svg
│   │   ├── icon16.png
│   │   ├── icon16.svg
│   │   ├── icon48.png
│   │   └── icon48.svg
│   └── templates/                # 邮件模板文件
│       ├── README.md
│       ├── attachments/          # 模板附件
│       ├── config.json           # 模板配置
│       ├── template14.html
│       ├── template15.html
│       └── template16.html
├── package.json                  # 项目依赖
└── vite.config.js                # Vite 配置
```

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 开发模式（监听文件变化）

```bash
npm run dev
```

### 3. 构建生产版本

```bash
npm run build
```

构建完成后，文件会输出到 `dist/` 目录。

### 4. 加载扩展

## ⚠️ 重要提示

**必须在项目根目录加载扩展，而不是 dist 目录！**

### 正确步骤

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"（Developer mode）
4. 点击"加载已解压的扩展程序"（Load unpacked）
5. **选择项目根目录**：例如 `d:\code\gmail-automation-extension`
   - ✅ 正确：选择包含 `manifest.json` 的目录
   - ❌ 错误：不要选择 `dist` 目录

### 验证

加载成功后，你应该看到：

- ✅ 扩展名称：Gmail Automation
- ✅ 版本：1.0.2
- ✅ 没有错误提示

## 使用方法

1. 打开 Gmail 网站 (mail.google.com)
2. 点击页面右下角的浮动按钮（📧 图标）
3. 在弹出界面中：
   - 选择邮件模板（可选）
   - 导入 Excel 文件（包含收件人邮箱）
   - 点击"开始发送"按钮批量发送邮件
4. 可以随时点击"停止发送"按钮中断发送过程
5. 点击"模板管理"按钮可以管理邮件模板：
   - 新增、编辑、删除模板
   - 上传和管理附件
   - 所有更改自动保存到 GitHub

## 🛠️ 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Element Plus** - Vue 3 UI 组件库
- **Vite** - 下一代前端构建工具
- **Pinia** - Vue 状态管理库
- **Composition API** - Vue 3 组合式 API

## 📝 开发说明

### 状态管理

使用 Pinia 进行状态管理，主要包含一个 store：

**`gmailStore.js`** - Gmail相关状态管理，处理邮件发送、模板加载等核心功能

### 工具函数

项目中的工具函数都位于 `utils/` 目录下，包含多个专用模块：
- `template.js` - 负责加载和管理邮件模板，处理模板占位符替换
- `githubApi.js` - GitHub API 工具，处理模板和附件的上传下载
- `excel.js` - 处理Excel文件导入和数据提取
- `gmail.js` - Gmail页面操作相关功能
- 以及其他辅助工具模块

### 组件

- `App.vue` - 根组件，包含 Overlay 和 FloatingButton
- `Overlay.vue` - Dialog 组件，包含表单和操作按钮，集成模板管理入口
- `TemplateManager.vue` - 模板管理组件，支持模板的 CRUD 操作和附件管理
- `FloatingButton.vue` - 浮动按钮组件，支持拖拽和点击

## 🔧 配置说明

### Vite 配置

`vite.config.js` 中配置了：

- Vue 插件
- Element Plus 自动导入
- 构建输出目录为 `dist`
- 入口文件为 `src/app.js`

### Manifest 配置

`public/manifest.json` 中配置了：

- Content Script 指向 `js/xlsx.full.min.js` 和 `js/content.js`
- 静态资源路径（icons、templates、plugin）
- 权限和主机权限配置

## 📦 构建流程

1. Vite 会将 `src/app.js` 及其依赖打包到 `dist/js/content.js`
2. Vue 组件会被编译为 JavaScript
3. Element Plus 组件会自动导入（通过 unplugin-vue-components）
4. Pinia stores 会被包含在打包文件中
5. Composables 和工具函数会被打包
6. 所有依赖都会被打包（除了外部依赖如 XLSX）
7. CSS 会被提取到 `dist/content.css`（如果有）
8. `public/` 目录中的所有文件会自动复制到 `dist/` 目录
   - `manifest.json` → `dist/manifest.json`
   - `js/xlsx.full.min.js` → `dist/js/xlsx.full.min.js`
   - `icons/` → `dist/icons/`
   - `templates/` → `dist/templates/`
   - `plugin/` → `dist/plugin/`

## ⚠️ 注意事项

1. **XLSX 库**：`xlsx.full.min.js` 需要在 manifest.json 中单独加载，因为它是一个全局库
2. **静态资源**：所有静态资源（manifest.json、icons、templates、plugin）都放在 `public/` 目录，构建时会自动复制到 `dist/`
3. **JS 文件**：打包后的 JS 文件会输出到 `dist/js/` 目录
4. **样式隔离**：组件样式已做作用域限制，不会影响 Gmail 页面
5. **状态持久化**：当前状态存储在内存中，刷新页面会重置
6. **Excel 格式**：Excel 文件需要包含 `email` 列（不区分大小写）

## 🐛 调试

1. 打开 Chrome DevTools
2. 在 Console 中可以看到日志输出
3. 安装 Vue DevTools 扩展可以查看组件状态

## 故障排除

1. **扩展无法加载**：

   - 确保已开启开发者模式
   - 确保选择了项目根目录（包含 `manifest.json` 的目录）
   - 不要选择 `dist` 目录
   - 确保已运行 `npm run build` 构建项目
   - 确保项目根目录中包含 `manifest.json` 文件

2. **无法填充邮件字段**：

   - 确保在 Gmail 网站上使用
   - 刷新页面后重试
   - 检查 Excel 文件格式是否正确

3. **无法发送邮件**：
   - 确保所有必填字段都已填写
   - 检查网络连接
   - 确保 Gmail 账户正常登录

## 📚 相关文档

- [Vue 3 文档](https://vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)
- [Vite 文档](https://vitejs.dev/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [Chrome Extension 文档](https://developer.chrome.com/docs/extensions/)
