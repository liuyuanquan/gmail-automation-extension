# Gmail Automation Chrome Extension

这是一个 Chrome 扩展程序，可以帮助您自动填写 Gmail 邮件的收件人、主题、正文并发送邮件。支持批量发送和 Excel 数据导入。

## 功能特点

- 📧 自动填写收件人、主题和邮件正文
- 📊 支持 Excel 文件导入，批量提取收件人
- 📋 支持邮件模板，快速填充邮件内容
- 🚀 批量发送邮件，自动处理多封邮件
- 🎨 现代化的 UI 界面（基于 Vue 3 + Element Plus）
- ⚡ 通过浮动按钮快速访问功能

## 📦 项目结构

```
gmail-automation-extension/
├── src/
│   ├── components/
│   │   ├── Overlay.vue          # Dialog 覆盖层组件
│   │   └── FloatingButton.vue   # 浮动按钮组件
│   ├── composables/
│   │   ├── useDialog.js          # Dialog 显示/隐藏逻辑
│   │   ├── useDraggable.js       # 拖拽功能逻辑
│   │   ├── useEmailActions.js    # 邮件发送操作逻辑
│   │   ├── useEmailForm.js       # 邮件表单逻辑
│   │   ├── useExcel.js           # Excel 处理逻辑
│   │   ├── usePosition.js        # 位置管理逻辑
│   │   └── useTemplate.js        # 模板相关逻辑
│   ├── constants/
│   │   └── templates.js          # 模板选项常量
│   ├── stores/
│   │   ├── emailStore.js         # 邮件业务状态管理
│   │   └── uiStore.js            # UI 状态管理
│   ├── utils/
│   │   ├── gmail.js              # Gmail 工具函数
│   │   └── template.js           # 模板工具函数
│   ├── assets/
│   │   └── main.css              # 全局样式
│   ├── App.vue                   # 根组件
│   └── app.js                    # 应用入口文件
├── templates/                    # 邮件模板文件
├── icons/                        # 扩展图标
├── dist/                         # 构建输出目录
├── manifest.json                 # Chrome 扩展配置
├── package.json                  # 项目依赖
├── vite.config.js               # Vite 配置
└── xlsx.full.min.js             # XLSX 库（外部依赖）
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
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

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目根目录

## 使用方法

1. 打开 Gmail 网站 (mail.google.com)
2. 点击页面右下角的浮动按钮（📧 图标）
3. 在弹出界面中：
   - 选择邮件模板（可选）
   - 导入 Excel 文件（包含收件人邮箱）
   - 点击"开始发送"按钮批量发送邮件
4. 可以随时点击"停止发送"按钮中断发送过程

## 🛠️ 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Element Plus** - Vue 3 UI 组件库
- **Vite** - 下一代前端构建工具
- **Pinia** - Vue 状态管理库
- **Composition API** - Vue 3 组合式 API

## 📝 开发说明

### 状态管理

使用 Pinia 进行状态管理，分为两个 store：

**`emailStore.js`** - 邮件业务状态：
- `selectedTemplate` - 选中的模板名称
- `excelData` - Excel 数据数组
- `excelRecipients` - 提取的收件人列表
- `template` - 当前加载的模板对象
- `isSending` - 是否正在发送
- `currentSendIndex` - 当前处理的邮件索引

**`uiStore.js`** - UI 状态：
- `isDialogVisible` - Dialog 显示/隐藏状态

### Composables

- `useDialog()` - Dialog 显示/隐藏逻辑，自动打开撰写视图
- `useDraggable()` - 可拖拽功能逻辑
- `useEmailActions()` - 邮件发送操作相关逻辑
- `useEmailForm()` - 邮件表单状态和逻辑
- `useExcel()` - Excel 文件处理逻辑
- `usePosition()` - 位置管理和持久化逻辑
- `useTemplate()` - 模板加载相关逻辑

### 组件

- `App.vue` - 根组件，包含 Overlay 和 FloatingButton
- `Overlay.vue` - Dialog 组件，包含表单和操作按钮
- `FloatingButton.vue` - 浮动按钮组件，支持拖拽和点击

## 🔧 配置说明

### Vite 配置

`vite.config.js` 中配置了：

- Vue 插件
- Element Plus 自动导入
- 构建输出目录为 `dist`
- 入口文件为 `src/app.js`

### Manifest 配置

`manifest.json` 中配置了：

- Content Script 指向构建后的 `dist/content.js`
- 需要加载 `xlsx.full.min.js`（在 content.js 之前）

## 📦 构建流程

1. Vite 会将 `src/app.js` 及其依赖打包到 `dist/content.js`
2. Vue 组件会被编译为 JavaScript
3. Element Plus 组件会自动导入（通过 unplugin-vue-components）
4. Pinia stores 会被包含在打包文件中
5. Composables 和工具函数会被打包
6. 所有依赖都会被打包（除了外部依赖如 XLSX）
7. CSS 会被提取到 `dist/content.css`

## ⚠️ 注意事项

1. **XLSX 库**：`xlsx.full.min.js` 需要在 manifest.json 中单独加载，因为它是一个全局库
2. **样式隔离**：组件样式已做作用域限制，不会影响 Gmail 页面
3. **状态持久化**：当前状态存储在内存中，刷新页面会重置
4. **Excel 格式**：Excel 文件需要包含 `email` 列（不区分大小写）

## 🐛 调试

1. 打开 Chrome DevTools
2. 在 Console 中可以看到日志输出
3. 安装 Vue DevTools 扩展可以查看组件状态

## 故障排除

1. **扩展无法加载**：

   - 确保已开启开发者模式
   - 确保选择了正确的文件夹（包含 manifest.json）
   - 确保已运行 `npm run build` 构建项目

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
