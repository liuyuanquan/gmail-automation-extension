import { ref, reactive } from "vue";

/**
 * 可拖拽功能的 composable
 * @param {Object} position - 位置对象 { x, y }
 * @param {Function} onDragEnd - 拖拽结束回调函数
 */
export function useDraggable(position, onDragEnd) {
	const isDragging = ref(false);
	const dragStartTime = ref(0);
	const dragStartPos = reactive({ x: 0, y: 0 });
	const dragOffset = reactive({ x: 0, y: 0 });

	const handleDragStart = (e) => {
		dragStartTime.value = Date.now();
		dragStartPos.x = e.clientX;
		dragStartPos.y = e.clientY;
		dragOffset.x = e.clientX - position.x;
		dragOffset.y = e.clientY - position.y;
		isDragging.value = true;
		e.preventDefault();

		const handleDrag = (e) => {
			if (isDragging.value) {
				e.preventDefault();
				requestAnimationFrame(() => {
					position.x = e.clientX - dragOffset.x;
					position.y = e.clientY - dragOffset.y;
				});
			}
		};

		const handleDragEnd = (e) => {
			const dragDuration = Date.now() - dragStartTime.value;
			const dragDistance = Math.sqrt(
				Math.pow(e.clientX - dragStartPos.x, 2) +
					Math.pow(e.clientY - dragStartPos.y, 2)
			);

			isDragging.value = false;
			document.removeEventListener("mousemove", handleDrag);
			document.removeEventListener("mouseup", handleDragEnd);

			// 调用回调函数，传递拖拽信息
			if (onDragEnd) {
				onDragEnd({ dragDuration, dragDistance, position });
			}
		};

		document.addEventListener("mousemove", handleDrag);
		document.addEventListener("mouseup", handleDragEnd);
	};

	return {
		isDragging,
		handleDragStart,
	};
}
