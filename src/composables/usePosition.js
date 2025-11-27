import { reactive, onMounted } from "vue";

const BUTTON_SIZE = 48;
const MARGIN = 20;
const CLICK_THRESHOLD_DURATION = 200; // 毫秒
const CLICK_THRESHOLD_DISTANCE = 5; // 像素
const STORAGE_KEY = "gmail-btn-position";

/**
 * 位置管理 composable
 * @returns {Object} 位置对象和初始化函数
 */
export function usePosition() {
	const position = reactive({ x: 0, y: 0 });

	/**
	 * 获取默认位置（右下角）
	 */
	function getDefaultPosition() {
		return {
			x: window.innerWidth - BUTTON_SIZE - MARGIN,
			y: window.innerHeight - BUTTON_SIZE - MARGIN,
		};
	}

	/**
	 * 从 localStorage 恢复位置
	 */
	function loadPosition() {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			try {
				const { x, y } = JSON.parse(saved);
				position.x = x;
				position.y = y;
				return;
			} catch (e) {
				console.error("Failed to load button position:", e);
			}
		}
		// 使用默认位置
		const defaultPos = getDefaultPosition();
		position.x = defaultPos.x;
		position.y = defaultPos.y;
	}

	/**
	 * 保存位置到 localStorage
	 */
	function savePosition() {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ x: position.x, y: position.y })
		);
	}

	/**
	 * 判断是否为点击（而非拖拽）
	 */
	function isClick(dragDuration, dragDistance) {
		return (
			dragDuration < CLICK_THRESHOLD_DURATION &&
			dragDistance < CLICK_THRESHOLD_DISTANCE
		);
	}

	onMounted(() => {
		loadPosition();
	});

	return {
		position,
		savePosition,
		isClick,
	};
}
