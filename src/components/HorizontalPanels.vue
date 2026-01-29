<template>
  <div
    class="row"
    :style="cssVars"
    ref="row"
  >
    <template
      v-for="panel in panelCount"
      :key="panel"
    >
      <div
        :class="`panel panel-${panel}`"
      >
        <slot :name="`content-${panel}`" />
      </div>

      <!-- NB: Recall that Vue's `in` indices are 1-indexed -->
      <div
        v-if="panel != panelCount"
        class="handle"
        role="separator"
        @pointerdown="(event) => handlePointerDown(event, panel-1)"
      ></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";

interface Props {
  panelCount: number;
  showHandles?: number[] | boolean;
  handleColor?: string;
  handleHoverColor?: string;
  handleSize?: string;
}

const row = useTemplateRef<HTMLDivElement>("row");

const props = withDefaults(defineProps<Props>(), {
  showHandles: false,
  handleColor: "gray",
  handleHoverColor: "white",
  handleSize: "8px",
});

const cssVars = computed(() => ({
  "--handle-size": props.handleSize,
  "--handle-color": props.handleColor,
  "--handle-hover-color": props.handleHoverColor,
}));

function getPanel(index: number): Element | null {
  return row.value?.querySelectorAll(".panel")[index] ?? null;
}

function getHandle(index: number): Element | null {
  return row.value?.querySelectorAll(".handle")[index] ?? null;
}

function getBasis(index: number): number {
  const panel = getPanel(index);
  return panel ? parseFloat(getComputedStyle(panel).flexBasis) : 0;
}

function handlePointerDown(event: PointerEvent, index: number) {
  event.preventDefault();

  const rowElement = row.value;
  if (!rowElement) {
    return;
  }

  const handle = rowElement.querySelectorAll(".handle")[index];
  if (!handle) {
    return;
  }

  const startX = event.clientX;
  const startLeft = getBasis(index);
  const startRight = getBasis(index + 1);

  const rowWidth = rowElement.clientWidth;
  const handlesWidth = (props.panelCount - 1) * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue(props.handleSize)) || 8);
  const available = rowWidth - handlesWidth;

  const onMove = (event: PointerEvent) => {
  });
}
</script>

<style scoped lang="less">
:root {
  --min: 120px;
  --panel: #121a2a;
}

.row {
  height: 100%;
  display: flex;
  overflow: hidden;
  user-select: none;
}

.panel {
  flex: 0 0 auto;
  width: 0;
  min-width: var(--min);
  background: var(--panel);
  padding: 16px;
  box-sizing: border-box;
  overflow: auto;
  border: 1px solid rgba(255,255,255,0.06);
}

.panel h3 {
  margin: 0 0 8px;
  font-size: 16px;
  opacity: 0.9;
}

.handle {
  flex: 0 0 var(--handle-size);
  width: var(--handle-size);
  cursor: col-resize;
  background: var(--handle-hover);
  position: relative;
  touch-action: none;
}

.handle:hover {
  background: var(--handle-hover-color);
}

.handle::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 40px;
  border-radius: 2px;
  background: rgba(255,255,255,0.35);
  box-shadow: -6px 0 0 rgba(255,255,255,0.18), 6px 0 0 rgba(255,255,255,0.18);
}

.dragging, .dragging * {
  cursor: col-resize !important;
}
</style>
