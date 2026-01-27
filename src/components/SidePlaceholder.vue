<template>
  <div class="side-panel-control">
    <div class="open-close-container">
      <v-icon
        style="`float: ${closeDirection};`"
        @click="open = !open"
      >
        {{ open ? openIcon : closedIcon }}
      </v-icon>
    </div>
    <slot
      v-if="open"
    ></slot>
    <div v-else>
      <v-icon>{{ props.icon }}</v-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  openDirection: "left" | "right";
  icon: string;
}

const props = defineProps<Props>();
const open = defineModel<boolean>("open", { type: Boolean, default: false });
const closeDirection = computed(() => props.openDirection === "left" ? "right" : "left");
const openIcon = computed(() => `chevron-double-${props.openDirection}`);
const closedIcon = computed(() => `chevron-double-${closeDirection.value}`);
</script>

<style scoped lang="less">
.side-panel-control {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
</style>
