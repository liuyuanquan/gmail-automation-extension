# 模板配置说明

这个目录用于存放邮件模板配置和模板文件，支持从 GitHub 动态加载。

## 目录结构

```
templates/
├── config.json          # 模板配置文件
├── template15.html      # 模板15的HTML文件
├── template16.html      # 模板16的HTML文件
├── attachments/         # 附件文件目录
│   └── *.pdf           # 附件文件（PDF、图片等）
└── README.md           # 本说明文件
```

## config.json 格式

```json
{
	"templates": [
		{
			"label": "模板名称（显示在UI中）",
			"value": "模板唯一标识",
			"htmlFile": "模板HTML文件名",
			"extra": {
				"subject": "邮件主题",
				"attachments": [
					{
						"path": "attachments/附件文件名.pdf",
						"name": "附件显示名称.pdf"
					}
				]
			}
		}
	]
}
```

## 添加新模板

1. 在 `templates/` 目录下创建新的 HTML 文件（如 `template17.html`）
2. 在 `config.json` 中添加新模板配置
3. 提交到 GitHub
4. 扩展会自动从 GitHub 拉取最新配置

## GitHub Raw URL

模板文件和附件通过以下 URL 格式从 GitHub 加载：

- 配置文件: `https://raw.githubusercontent.com/liuyuanquan/gmail-automation-extension/main/templates/config.json`
- 模板文件: `https://raw.githubusercontent.com/liuyuanquan/gmail-automation-extension/main/templates/{htmlFile}`
- 附件文件: `https://raw.githubusercontent.com/liuyuanquan/gmail-automation-extension/main/templates/attachments/{fileName}`

## 附件路径说明

附件路径支持三种格式：

1. **GitHub 相对路径**（推荐）：`attachments/file.pdf`

   - 从 GitHub 的 `templates/attachments/` 目录加载
   - 示例：`"path": "attachments/Hydronova-Product Manual.pdf"`

2. **扩展内部路径**：`/plugin/file.pdf`

   - 从扩展的 `public` 目录加载
   - 示例：`"path": "/plugin/file.pdf"`

3. **完整 URL**：`https://example.com/file.pdf`
   - 直接使用完整的 HTTP/HTTPS URL
   - 示例：`"path": "https://example.com/file.pdf"`

## 添加附件

1. 将附件文件上传到 `templates/attachments/` 目录
2. 在 `config.json` 中配置附件路径（使用相对路径 `attachments/文件名`）
3. 提交到 GitHub
4. 扩展会自动从 GitHub 加载附件

## 注意事项

- 模板 HTML 文件支持占位符 `{{ columnName }}`，会在发送时替换为 Excel 数据
- 附件文件建议放在 `templates/attachments/` 目录，使用相对路径配置
- 修改配置后，用户需要刷新扩展才能看到新模板
- 附件文件大小建议控制在合理范围内，避免加载时间过长
