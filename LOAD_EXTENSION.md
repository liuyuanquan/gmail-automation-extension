# 如何加载 Chrome 扩展

## ⚠️ 重要提示

**必须在项目根目录加载扩展，而不是 dist 目录！**

## 正确步骤

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"（Developer mode）
4. 点击"加载已解压的扩展程序"（Load unpacked）
5. **选择项目根目录**：`/Users/user/code/test/gmail-automation-extension`
   - ✅ 正确：选择包含 `manifest.json` 的目录
   - ❌ 错误：不要选择 `dist` 目录

## 目录结构

```
gmail-automation-extension/          ← 选择这个目录！
├── manifest.json                   ← 清单文件必须在这里
├── dist/
│   ├── content.js                 ← 构建后的文件
│   └── content.css
├── icons/
├── templates/
├── xlsx.full.min.js
└── ...
```

## 验证

加载成功后，你应该看到：

- ✅ 扩展名称：Gmail Automation
- ✅ 版本：1.0.0
- ✅ 没有错误提示

## 常见错误

### 错误：清单文件缺失或不可读取

**原因**：在错误的目录加载扩展

**解决方法**：

1. 确保选择的是项目根目录（包含 manifest.json 的目录）
2. 不要选择 dist 目录
3. 检查 manifest.json 文件是否存在
