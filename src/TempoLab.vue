<template>
  <v-app
    id="app"
    :style="cssVars"
  >
    <header-bar />
    <div ref="root" class="layout-root">
      <side-placeholder
        ref="layers-panel"
        open-direction="right"
        icon="mdi-layers"
        color="surface-variant"
        v-model:open="layerControlsOpen"
      >
        <template #default>
          <comparison-data-controls
            class="comparison-data-controls"
          />
        </template>
      </side-placeholder>

      <div
        class="handle"
        ref="left-handle"
        aria-label="Resize left/middle"
        role="separator"
      ></div>

      <div v-if="mapTargets" class="maps">
        <teleport
          v-for="[key, target] in Object.entries(mapTargets)"
          :key="key"
          :to="target"
        >
          <map-with-controls />
        </teleport>
      </div>

      <div
        class="handle"
        ref="right-handle"
        aria-label="Resize middle/right"
        role="separator"
      ></div>

      <side-placeholder
        ref="datasets-panel"
        open-direction="left"
        icon="mdi-chart-line"
        color="surface-variant"
        v-model:open="datasetControlsOpen"
      >
        <template #default>
          <dataset-controls
           class="dataset-controls"
          />
        </template>
      </side-placeholder>
    </div>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, onMounted, nextTick, reactive, ref, useTemplateRef, watch, type Ref } from "vue";
import { storeToRefs } from "pinia";
import { v4 } from "uuid";

import { useTempoStore, updateStoreFromJSON, serializeTempoStore } from "@/stores/app";

type MaybeHTMLElement = HTMLElement | null;
const root = useTemplateRef<HTMLDivElement>("root");
const leftHandle = useTemplateRef<HTMLDivElement>("left-handle");
const rightHandle = useTemplateRef<HTMLDivElement>("right-handle");
const layersPanel = useTemplateRef<HTMLElement>("layers-panel");
const datasetsPanel = useTemplateRef<HTMLElement>("datasets-panel");
const mapTargets = reactive<Record<string, Ref<MaybeHTMLElement>>>({});


const store = useTempoStore();
const {
  accentColor,
  accentColor2,
  debugMode,
  tempoRed,
  datasetControlsOpen,
  layerControlsOpen,
} = storeToRefs(store);

const query = new URLSearchParams(window.location.search);
debugMode.value = (query.get("debug") ?? process.env.VUE_APP_TEMPO_LAB_DEBUG)?.toLowerCase() == "true";
const ignoreCache = query.get("ignorecache")?.toLowerCase() == "true";

const infoColor = "#092088";
const cssVars = computed(() => {
  return {
    "--accent-color": accentColor.value,
    "--accent-color-2": accentColor2.value,
    "--info-background": infoColor,
    "--tempo-red": tempoRed.value,
    "--handle-size": "8px",
    "--handle-color": "gray",
    "--handle-hover-color": infoColor,
  };
});

const localStorageKey = "tempods";

function setBasis(panel: HTMLElement, sizePx: number) {
  panel.style.flexBasis = `${sizePx}px`;
}

function getBasis(panel: HTMLElement): number {
  return parseFloat(getComputedStyle(panel).flexBasis);
}

onBeforeMount(() => {
  const storedState = ignoreCache ? undefined : window.localStorage.getItem(localStorageKey);
  if (storedState) {
    updateStoreFromJSON(store, storedState);
  }
});

onMounted(() => {
  const handles = [leftHandle.value, rightHandle.value];
  handles.forEach((handle) => {
    if (!handle) { return; } 

    handle.addEventListener("pointerdown", (event: PointerEvent) => {
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);

      handle.classList.add("dragging");

      const startX = event.clientX;
    });

  });
});


const DEFAULT_PANEL_WIDTH_PX = 300;
const PLACEHOLDER_WIDTH_PX = 40;



watch(datasetControlsOpen, onDatasetPanelOpenChange);
watch(layerControlsOpen, onLayersPanelOpenChange);
</script>

<style lang="less">
// NB: The styles here are NOT scoped - these are intended to apply to the overall application,
// as this component is really just a layout container.
// If we do want component-only styles, just add a <style scoped> block below this one

@font-face {
  font-family: "Highway Gothic Narrow";
  src: url("./assets/HighwayGothicNarrow.ttf");
}

// JC: This was commented out, but I put it back in because my browser (Chrome on Ubuntu) didn't already have Lexend
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap');

html, body .layout-root {
  width: 100%;
  height: 100%;
}

html, body {
  padding: 0;
  margin: 0;
}

body {
  font-family: Verdana, Arial, Helvetica, sans-serif;
}

#app {
  h1, h2, h3, h4, h5, h6, p, div {
    user-select: none;
    -webkit-user-select: none;
  }
  font-family: "Lexend", sans-serif;
}

.map-panel {
  min-width: 250px;
  display: flex;
  flex-direction: row;
  padding-left: 10px;
  gap: 5px;
}

#layers-panel {
  overflow-y: scroll;
  margin-right: 5px;

  -ms-overflow-style: none;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.lm_stack:has(.side-panel-control.closed) {
  width: 40px !important;
}

#datasets-panel {
  overflow-y: scroll;
  padding-left: 2px;
}

.comparison-data-controls,
.dataset-controls {
  width: 100%;
  padding-inline: 8px;
}

:root {
  // font-size: clamp(14px, 1.7vw, 16px);
  // --default-font-size: 1rem; // we don't use this
  font-size: 16px; // this is the standard browser default
  --default-line-height: clamp(1rem, min(2.2vh, 2.2vw), 1.6rem); // we don't use this
  --smithsonian-blue: #009ade;
  --smithsonian-yellow: #ffcc33;
  --info-background: #092088;
  --map-height: 500px;
}

@media (max-width: 750px) {
  :root {
    --map-height: 60vh;
    --map-height: 60dvh;
    --map-height: 60svh;
    font-size: 14px;
  }
}

// Some Golden Layout adjustments
.lm_content {
  background: rgb(var(--v-theme-background));
  overflow-y: auto!important;
}

.lm_splitter {
  background-color: #333333;
  opacity: 0.7;

  &.lm_dragging {
    background-color: var(--smithsonian-blue);
  }
}

.tab-content {
  padding: 0.5rem 1rem;
  border: 5px solid var(--tempo-red);
  border-radius: 10px;
  margin: 10px;
}

.handle {
  flex: 0 0 var(--handle-size);
  width: var(--handle-size);
  cursor: col-resize;
  background: var(--info-background);
  position: relative;
  touch-action: none;
}

.handle:hover {
  background: var(--info-background);
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
