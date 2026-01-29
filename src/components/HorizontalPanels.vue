<template>
  <div>
    <template
      v-for="panel in panelCount"
      :key="panel"
    >
      <div
        :class="`panel panel-${panel}`"
      >
      </div>
      <div
        v-if="panel != panelCount"
        class="handle"
        role="separator"
      ></div>
    </template>
  </div>
</template>

<script setup lang="ts">
interface Props {
  panelCount: number;
  showHandles?: number[] | boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showHandles: false,
});
</script>
