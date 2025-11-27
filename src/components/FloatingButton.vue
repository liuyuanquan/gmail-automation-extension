<template>
	<div
		ref="target"
		class="button-container"
		:style="buttonStyle"
		@mousedown="handleDragStart"
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
import { computed } from "vue";
import { useUIStore } from "../stores/uiStore";
import { useDraggable } from "../composables/useDraggable";
import { usePosition } from "../composables/usePosition";

const uiStore = useUIStore();
const { position, savePosition, isClick } = usePosition();
const { isDragging, handleDragStart } = useDraggable(position, ({ dragDuration, dragDistance }) => {
	// 保存位置
	savePosition();

	// 判断是否为点击，如果是则切换 Dialog
	if (isClick(dragDuration, dragDistance)) {
		uiStore.isDialogVisible = !uiStore.isDialogVisible;
	}
});

const buttonStyle = computed(() => ({
	left: `${position.x}px`,
	top: `${position.y}px`,
	cursor: isDragging.value ? "grabbing" : "grab",
}));
</script>

<style scoped>
.button-container {
	position: fixed;
	z-index: 10000;
}

.floating-btn {
	width: 48px;
	height: 48px;
	box-shadow:
		0 4px 6px -1px rgba(0, 0, 0, 0.1),
		0 2px 4px -1px rgba(0, 0, 0, 0.06);
	transition: box-shadow 0.3s;
}

.floating-btn:hover {
	box-shadow:
		0 10px 15px -3px rgba(0, 0, 0, 0.1),
		0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.floating-btn-icon {
	font-size: 1.5rem;
}
</style>
