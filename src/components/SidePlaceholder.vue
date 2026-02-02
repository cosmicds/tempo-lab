<template>
  <div
    :class="['side-panel-control', open ? 'open' : 'closed']"
    :style="cssVars"
  >
    <div class="open-close-container">
      <v-icon
        :color="open ? openArrowColor : closedArrowColor"
        class="open-close-icon"
        @click="toggleOpen()"
      >
        {{ open ? openIcon : closedIcon }}
      </v-icon>
      <hr />
    </div>
    <v-slide-x-transition class="content">
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
  openArrowColor?: string;
  closedArrowColor?: string;
}

const props = withDefaults(defineProps<Props>(), {
  color: "white",
  openArrowColor: "gray",
  closedArrowColor: "gray",
});
const open = defineModel<boolean>("open", { type: Boolean, default: false });
const closeDirection = computed(() => props.openDirection === "left" ? "right" : "left");
const openIcon = computed(() => `mdi-chevron-double-${closeDirection.value}`);
const closedIcon = computed(() => `mdi-chevron-double-${props.openDirection}`);

function toggleOpen() {
  open.value = !open.value;
}

const cssVars = computed(() => ({
  "--icon-alignment": props.openDirection == "left" ? "start" : "end",
}));
</script>

<style scoped lang="less">
.side-panel-control {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

hr {
  background: white;
  margin: auto;
  width: 100%;
}

.open-close-container {
  display: flex;
  background: #222222;
  flex-direction: column;

  .open-close-icon {
    align-self: var(--icon-alignment);
  }
}

.content {
  margin-top: 10px;
}
</style>
