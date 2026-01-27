<template>
  <div
    :class="['side-panel-control', open ? 'open' : 'closed']"
  >
    <div class="open-close-container">
      <v-icon
        :color="color"
        :style="`float: ${openDirection};`"
        @click="toggleOpen()"
      >
        {{ open ? openIcon : closedIcon }}
      </v-icon>
    </div>
    <v-slide-x-transition>
      <div v-if="open">
        <slot></slot>
      </div>
      <div v-else>
        <v-icon
          :color="color"
          @click="toggleOpen()"
        >
          {{ props.icon }}
        </v-icon>
      </div>
    </v-slide-x-transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  openDirection: "left" | "right";
  icon: string;
  color?: string;
}

const props = withDefaults(defineProps<Props>(), {
  color: "white",
});
const open = defineModel<boolean>("open", { type: Boolean, default: false });
const closeDirection = computed(() => props.openDirection === "left" ? "right" : "left");
const openIcon = computed(() => `mdi-chevron-double-${closeDirection.value}`);
const closedIcon = computed(() => `mdi-chevron-double-${props.openDirection}`);

function toggleOpen() {
  open.value = !open.value;
}
</script>

<style scoped lang="less">
.side-panel-control {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
</style>
