<template>
	<div
		ref="target"
		class="button-container"
		:style="buttonStyle"
	>
		<el-button
			class="floating-btn"
			circle
			type="primary"
			size="large"
	>
			<span class="floating-btn-icon">📧</span>
		</el-button>
	</div>
</template>

<script setup>
import { useDraggable } from "../composables/useDraggable";

const uiStore = useUIStore();
const target = ref(null);

// 使用 interact.js 实现拖拽（支持边缘回弹）
const { position, isDragging, isClick } = useDraggable(target, ({ dragDuration, dragDistance }) => {
	// 判断是否为点击，如果是则切换 Dialog
	if (isClick(dragDuration, dragDistance)) {
		uiStore.isDialogVisible = !uiStore.isDialogVisible;
	}
});

const buttonStyle = computed(() => ({
	left: `${position.x}px`,
	top: `${position.y}px`,
	cursor: isDragging.value ? "move" : "pointer",
	// 拖拽时禁用过渡，拖拽结束后启用过渡以实现平滑回弹
	transition: isDragging.value ? "none" : "left 0.3s ease-out, top 0.3s ease-out",
}));
</script>

<style scoped>
.button-container {
	position: fixed;
	z-index: 2000;
}

.floating-btn {
	width: 48px;
	height: 48px;
	box-shadow:
		0 4px 6px -1px rgba(0, 0, 0, 0.1),
		0 2px 4px -1px rgba(0, 0, 0, 0.06);
	transition: box-shadow 0.3s;
	/* 让鼠标事件穿透到父容器，以便 interact.js 可以捕获事件 */
	pointer-events: none;
}

.floating-btn:hover {
	box-shadow:
		0 10px 15px -3px rgba(0, 0, 0, 0.1),
		0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.floating-btn-icon {
	font-size: 1.5rem;
	/* 图标也需要让事件穿透 */
	pointer-events: none;
}
</style>
