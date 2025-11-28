import template15Html from "../assets/template15.html?raw";
import template16Html from "../assets/template16.html?raw";

/**
 * Gmail 页面元素选择器常量
 * 统一管理所有 Gmail DOM 选择器，方便维护和更新
 */
export const GMAIL_SELECTORS = {
	// 撰写视图字段
	COMPOSE: {
		// 收件人输入框
		RECIPIENT: "input.agP.aFw",
		// 主题输入框
		SUBJECT: "input.aoT",
		// 正文编辑区域
		BODY: "div.Am.aiL.LW-avf.tS-tW",
		// 附件文件输入
		FILE_INPUT: 'input[name="Filedata"]',
	},

	// 按钮
	BUTTONS: {
		// 写邮件按钮
		WRITE_EMAIL: "div.T-I.T-I-KE.L3",
		// 发送按钮
		SEND: "div.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3",
		// 舍弃草稿按钮
		DISCARD_DRAFT: "div.oh.J-Z-I.J-J5-Ji.T-I-ax7.T-I",
		// 全屏按钮
		FULLSCREEN: "img.Hq.aUG",
	},

	// 附件相关
	ATTACHMENTS: {
		// 附件移除按钮
		REMOVE_BUTTONS: "div.dL div.vq",
		// 附件进度条
		PROGRESS_BAR: 'div[role="progressbar"]',
	},
};

/**
 * 邮件模板选项
 */
export const TEMPLATE_OPTIONS = [
	{
		label: "模板15",
		value: "template15",
		extra: {
			subject:
				"Revolutionize Your Laboratory Research with Our Joule Heating Devices",
			attachments: [
				{
					path: "/plugin/Hydronova-Product Manual.pdf",
					name: "Hydronova-Product Manual.pdf",
				},
			],
			body: template15Html,
		},
	},
	{
		label: "模板16",
		value: "template16",
		extra: {
			subject: "Research Cloud - Live Talk Invitation",
			attachments: [],
			body: template16Html,
		},
	},
];
