import template15Html from "../templates/template15.html?raw";
import template16Html from "../templates/template16.html?raw";

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
