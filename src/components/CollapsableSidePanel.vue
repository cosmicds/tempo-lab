<template>
  <div
    class="collapsible-sheet"
    :class="{ 'collapsible-sheet--collapsed': isCollapsed }"
  >
    <v-scroll-x-transition>
      <v-sheet 
        v-if="show"
        class="collapsible-sheet__content" 
        :class="{ 'collapsible-sheet__content--hidden': isCollapsed }"
        elevation="2"
      >
        <slot />
      </v-sheet>
    </v-scroll-x-transition>

    <!-- Right-edge handle -->
    <v-tooltip
      :text="isCollapsed ? tooltipText[0] : tooltipText[1]"
      :location="isCollapsed ? 'right' : 'left'"
      transition="scale-transition"
    >
      <template #activator="{ props }">
        <button
          v-bind="props"
          type="button"
          class="collapsible-sheet__handle"
          @click.stop="toggle"
          @keyup.enter.stop="toggle"
          :aria-expanded="show"
          :aria-label="isCollapsed ? tooltipText[0] : tooltipText[1]"
          tabindex="0"
        >
          <span class="collapsible-sheet__handle-icon" aria-hidden="true">
          {{ isCollapsed ? '›' : '‹'}}
          </span>
        </button>
      </template>
      </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  /** Tooltip text for expand and collapse states */
  tooltipText?: [string, string];
}
const { tooltipText = ['Expand side panel', 'Collapse side panel'] } = defineProps<Props>();
const show = defineModel<boolean>({ default: true });
  
const isCollapsed = computed({
  get: () => !show.value,
  set: (val: boolean) => {
    show.value = !val;
  }
});

const toggle = () => {
  show.value = !show.value;
};
</script>

<style scoped>
  .collapsible-sheet {
    position: relative;
    display: inline-flex;
    flex-direction: row;
    height: 100%;
  }

  .collapsible-sheet__content {
    flex: 0 1 auto;
    overflow: auto;
    margin: 0.5em;
  }

  /* Hide content but maintain height */
  .collapsible-sheet__content--hidden {
    /* display: none; */
  }

  /* Handle on the right edge */
  .collapsible-sheet__handle {
    flex: 0 0 auto;
    border: none;
    padding: 0 2px;
    margin: 0;
    margin-left: 0.5em;
    cursor: pointer;
    background: rgb(var(--v-theme-surface-variant));
    display: flex;
    align-items: center;
    justify-content: center;
    outline: none;
    transition: background-color 0.2s ease width 0.2s ease;
    border-radius: 4px;
    width: auto;
  }
  
  .collapsible-sheet--collapsed .collapsible-sheet__handle {
    margin-left: 0;
    width: 2em;
  }

  .collapsible-sheet__handle:hover {
    background: rgb(var(--v-theme-surface-light));
  }

  .collapsible-sheet__handle-icon {
    font-size: 1.5rem;
    line-height: 1;
    user-select: none;
    color: rgb(var(--v-theme-on-surface-variant));
  }
</style>
