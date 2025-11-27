import interact from "interactjs";

// ==================== 常量定义 ====================

/** 按钮大小（像素） */
const BUTTON_SIZE = 48;

/** 按钮距离窗口边缘的最小边距（像素） */
const MARGIN = 20;

/** 点击判断的时间阈值（毫秒），小于此时间视为点击 */
const CLICK_THRESHOLD_DURATION = 200;

/** 点击判断的距离阈值（像素），小于此距离视为点击 */
const CLICK_THRESHOLD_DISTANCE = 5;

// ==================== Composable 函数 ====================

/**
 * 可拖拽功能的 composable（使用 interact.js，支持边缘回弹）
 *
 * 功能特性：
 * - 支持拖拽移动元素
 * - 自动限制在窗口边界内
 * - 支持边缘回弹效果（通过 inertia 配置）
 * - 自动保存和恢复位置（使用 localStorage）
 * - 区分点击和拖拽操作
 *
 * @param {Object} targetRef - DOM 元素引用（Vue ref 对象）
 * @param {Function} [onDragEnd] - 拖拽结束回调函数
 * @param {Object} [options] - 配置选项
 * @param {string} [options.allowFrom] - 允许拖拽的触发区域选择器（如 ".el-dialog__header"），null 表示允许从任何地方拖拽
 * @param {Object} onDragEnd.params - 回调函数参数对象
 * @param {number} onDragEnd.params.dragDuration - 拖拽持续时间（毫秒）
 * @param {number} onDragEnd.params.dragDistance - 拖拽距离（像素）
 * @returns {Object} 返回对象
 * @returns {Object} returns.position - 位置对象 { x, y }，响应式
 * @returns {Ref<boolean>} returns.isDragging - 是否正在拖拽
 * @returns {Function} returns.isClick - 判断是否为点击的函数
 */
export function useDraggable(targetRef, onDragEnd, options = {}) {
	// ==================== 响应式状态 ====================

	/** 元素位置坐标（相对于窗口左上角） */
	const position = reactive({ x: 0, y: 0 });

	/** 是否正在拖拽 */
	const isDragging = ref(false);

	/** 拖拽开始的时间戳 */
	const dragStartTime = ref(0);

	/** 拖拽开始时鼠标的绝对位置 */
	const dragStartPos = ref({ x: 0, y: 0 });

	/** interact.js 实例，用于清理 */
	let interactInstance = null;

	/** 原生事件处理函数引用，用于清理 */
	let handleMouseDown = null;
	let handleMouseMove = null;
	let handleMouseUp = null;

	/** 点击检测相关的状态 */
	let clickStartTime = 0;
	let clickStartPos = { x: 0, y: 0 };
	let hasMoved = false;

	// ==================== 内部函数 ====================

	/**
	 * 获取元素的实际尺寸
	 * @returns {Object} 元素尺寸 { width, height }
	 */
	function getElementSize() {
		if (!targetRef.value) {
			return { width: BUTTON_SIZE, height: BUTTON_SIZE };
		}
		const rect = targetRef.value.getBoundingClientRect();
		return {
			width: rect.width || BUTTON_SIZE,
			height: rect.height || BUTTON_SIZE,
		};
	}

	/**
	 * 获取默认位置（窗口右下角）
	 * @returns {Object} 默认位置坐标 { x, y }
	 */
	function getDefaultPosition() {
		const { width, height } = getElementSize();
		return {
			x: window.innerWidth - width - MARGIN,
			y: window.innerHeight - height - MARGIN,
		};
	}

	/**
	 * 从 localStorage 恢复上一次保存的位置
	 * 如果 localStorage 中没有保存的位置，则使用默认位置（右下角）
	 */
	function loadPosition() {
		const saved = localStorage.getItem("gmail-btn-position");
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
	 * 保存当前位置到 localStorage
	 * 用于下次打开页面时恢复位置
	 */
	function savePosition() {
		localStorage.setItem(
			"gmail-btn-position",
			JSON.stringify({ x: position.x, y: position.y })
		);
	}

	/**
	 * 判断是否为点击操作（而非拖拽）
	 *
	 * 判断标准：
	 * - 拖拽持续时间小于阈值（200ms）
	 * - 拖拽距离小于阈值（5px）
	 *
	 * @param {number} dragDuration - 拖拽持续时间（毫秒）
	 * @param {number} dragDistance - 拖拽距离（像素）
	 * @returns {boolean} 如果是点击返回 true，否则返回 false
	 */
	function isClick(dragDuration, dragDistance) {
		return (
			dragDuration < CLICK_THRESHOLD_DURATION &&
			dragDistance < CLICK_THRESHOLD_DISTANCE
		);
	}

	/**
	 * 将位置回弹到边界内
	 * 如果位置超出边界，则平滑回弹到最近的边界位置
	 */
	function snapToBoundary() {
		// 获取元素实际尺寸
		const { width, height } = getElementSize();
		// 计算边界范围（position 是元素左上角坐标）
		const minX = MARGIN;
		const minY = MARGIN;
		const maxX = window.innerWidth - width - MARGIN;
		const maxY = window.innerHeight - height - MARGIN;

		let needsSnap = false;

		// 检查并修正 X 坐标
		if (position.x < minX) {
			position.x = minX;
			needsSnap = true;
		} else if (position.x > maxX) {
			position.x = maxX;
			needsSnap = true;
		}

		// 检查并修正 Y 坐标
		if (position.y < minY) {
			position.y = minY;
			needsSnap = true;
		} else if (position.y > maxY) {
			position.y = maxY;
			needsSnap = true;
		}

		// 如果位置被修正，保存新位置
		if (needsSnap) {
			savePosition();
		}
	}

	// ==================== 初始化函数 ====================

	/**
	 * 初始化拖拽功能
	 */
	function initDraggable() {
		// 如果元素引用不存在，直接返回
		if (!targetRef.value) {
			return;
		}

		// 加载上一次保存的位置
		loadPosition();

		// 添加原生事件监听来捕获纯点击（interact.js 在纯点击时不会触发 onstart）
		handleMouseDown = (e) => {
			clickStartTime = Date.now();
			clickStartPos = { x: e.clientX, y: e.clientY };
			hasMoved = false;
		};

		handleMouseMove = () => {
			hasMoved = true;
		};

		handleMouseUp = (e) => {
			// 如果鼠标没有移动，且 interact.js 没有触发拖拽，则认为是点击
			if (!hasMoved && !isDragging.value) {
				const clickDuration = Date.now() - clickStartTime;
				const clickDistance = Math.sqrt(
					Math.pow(e.clientX - clickStartPos.x, 2) +
						Math.pow(e.clientY - clickStartPos.y, 2)
				);

				// 如果是点击，调用回调
				if (onDragEnd && isClick(clickDuration, clickDistance)) {
					onDragEnd({
						dragDuration: clickDuration,
						dragDistance: clickDistance,
					});
				}
			}
		};

		targetRef.value.addEventListener("mousedown", handleMouseDown);
		targetRef.value.addEventListener("mousemove", handleMouseMove);
		targetRef.value.addEventListener("mouseup", handleMouseUp);

		// 初始化 interact.js 拖拽功能
		interactInstance = interact(targetRef.value)
			.draggable({
				// 允许从指定区域触发拖拽（options.allowFrom 或 null 表示允许从任何地方）
				allowFrom: options.allowFrom !== undefined ? options.allowFrom : null,
				// 启用惯性/弹性效果
				// 当拖拽到边界时，会产生平滑的回弹效果
				inertia: {
					resistance: 30, // 阻力系数，值越大回弹越快
					minSpeed: 100, // 最小速度阈值（像素/秒）
					endSpeed: 10, // 结束速度阈值（像素/秒）
				},
				// 限制拖拽范围在窗口边界内
				restrict: {
					restriction: () => {
						// 动态获取元素尺寸
						const { width, height } = getElementSize();
						// interact.js 的 restrict 配置中：
						// - left/top: 元素左边缘/上边缘的最小坐标
						// - right/bottom: 元素右边缘/下边缘的最大坐标
						return {
							left: MARGIN, // 元素左边缘最小 x 坐标
							top: MARGIN, // 元素上边缘最小 y 坐标
							right: window.innerWidth - MARGIN, // 元素右边缘最大 x 坐标
							bottom: window.innerHeight - MARGIN, // 元素下边缘最大 y 坐标
						};
					},
					endOnly: false, // false 表示在拖拽过程中也限制边界，true 表示只在结束时限制
				},
				// 自动滚动（禁用）
				autoScroll: false,
				// 拖拽开始事件
				onstart: (event) => {
					isDragging.value = true;
					dragStartTime.value = Date.now();
					// 记录拖拽开始时鼠标的绝对位置
					dragStartPos.value = {
						x: event.clientX,
						y: event.clientY,
					};
				},
				// 拖拽移动事件
				onmove: (event) => {
					// event.dx 和 event.dy 是相对于上一次位置的偏移量
					// 累加到当前位置上
					position.x += event.dx;
					position.y += event.dy;
				},
				// 拖拽结束事件
				onend: (event) => {
					isDragging.value = false;

					// 计算拖拽持续时间
					const dragDuration = Date.now() - dragStartTime.value;
					// 计算拖拽总距离（使用勾股定理）
					const dragDistance = Math.sqrt(
						Math.pow(event.clientX - dragStartPos.value.x, 2) +
							Math.pow(event.clientY - dragStartPos.value.y, 2)
					);

					// 回弹到边界内（如果超出边界）
					snapToBoundary();

					// 调用外部传入的回调函数，传递拖拽信息
					if (onDragEnd) {
						onDragEnd({ dragDuration, dragDistance });
					}
				},
			})
			// 禁用 interact.js 的默认光标样式
			// 我们会在组件中自定义光标样式
			.styleCursor(false);
	}

	// ==================== 生命周期 ====================

	// 监听 targetRef 变化，如果元素后来才创建，则初始化拖拽
	watch(
		() => targetRef.value,
		(newValue) => {
			if (newValue && !interactInstance) {
				initDraggable();
			}
		},
		{ immediate: true }
	);

	onUnmounted(() => {
		// 清理 interact.js 实例，移除事件监听器
		if (interactInstance) {
			interactInstance.unset();
			interactInstance = null;
		}
		// 清理原生事件监听器
		if (targetRef.value) {
			if (handleMouseDown) {
				targetRef.value.removeEventListener("mousedown", handleMouseDown);
			}
			if (handleMouseMove) {
				targetRef.value.removeEventListener("mousemove", handleMouseMove);
			}
			if (handleMouseUp) {
				targetRef.value.removeEventListener("mouseup", handleMouseUp);
			}
		}
	});

	// ==================== 返回值 ====================

	return {
		/** 位置对象（响应式），包含 x 和 y 坐标 */
		position,
		/** 是否正在拖拽（响应式） */
		isDragging,
		/** 判断是否为点击的函数 */
		isClick,
	};
}
