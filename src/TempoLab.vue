<template>
  <v-app
    id="app"
    :style="cssVars"
  >
    <header-bar />
    <div ref="root" class="layout-root"></div>

    <teleport
      v-if="layersPanelTarget"
      :to="layersPanelTarget"
    >
      <side-placeholder
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
    </teleport>

    <div v-if="mapTargets">
      <teleport
        v-for="[key, target] in Object.entries(mapTargets)"
        :key="key"
        :to="target"
      >
        <map-with-controls />
      </teleport>
    </div>

    <teleport
      v-if="datasetsPanelTarget"
      :to="datasetsPanelTarget"
    >
      <side-placeholder
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
    </teleport>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, onMounted, nextTick, reactive, ref, useTemplateRef, watch, type Ref } from "vue";
import { storeToRefs } from "pinia";
import { ComponentItemConfig, GoldenLayout, LayoutConfig, type ComponentContainer, type RowOrColumn } from "golden-layout";
import { v4 } from "uuid";

import { useTempoStore, updateStoreFromJSON, serializeTempoStore } from "@/stores/app";

type MaybeHTMLElement = HTMLElement | null;
const root = useTemplateRef("root");
const mapTargets = reactive<Record<string, Ref<MaybeHTMLElement>>>({});
const mapContainers = reactive<Record<string, ComponentContainer>>({});
const datasetsPanelTarget = ref<MaybeHTMLElement>(null);
const layersPanelTarget = ref<MaybeHTMLElement>(null);


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
    '--accent-color': accentColor.value,
    '--accent-color-2': accentColor2.value,
    '--info-background': infoColor,
    '--tempo-red': tempoRed.value,
  };
});

const localStorageKey = "tempods";

onBeforeMount(() => {
  
  const storedState = ignoreCache ? undefined : window.localStorage.getItem(localStorageKey);
  if (storedState) {
    updateStoreFromJSON(store, storedState);
  }
});

function mapConfig(width: number | null = null): ComponentItemConfig {
  const config: ComponentItemConfig = {
    type: 'component',
    componentType: 'map-panel',
    title: 'Map',
    draggable: false,
    minWidth: 500,
    width: "6fr",
  };
  if (width != null) {
    config.width = width;
  }
  return config;
}

const DEFAULT_PANEL_WIDTH_PX = 300;
const PLACEHOLDER_WIDTH_PX = 40;
function getGLPanelWidth(): string {
  const glRoot = root.value as HTMLElement;
  return `${Math.min(Math.max(DEFAULT_PANEL_WIDTH_PX * 100 / glRoot.clientWidth, 10), 25)}%`;
}

function layersPanelConfig(width: number | null = null): ComponentItemConfig {
  return {
    type: 'component',
    componentType: 'layers-panel',
    title: 'Layers',
    draggable: false,
    width: width ?? getGLPanelWidth(),
  };
}

function datasetsPanelConfig(width: number | null = null): ComponentItemConfig {
  return {
    type: 'component',
    componentType: 'datasets-panel',
    title: 'Controls',
    draggable: false,
    width: width ?? getGLPanelWidth(),
  };
}

// We'll probably be using this eventually
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function addMapPanel() {
  if (layout) {
    const config = mapConfig();
    const row = layout.rootItem as RowOrColumn;
    row.addItem(config, Object.keys(mapTargets).length);
  }
}

// And maybe this too
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function removeMapPanel(index: number) {
  if (layout) {
    const idx = Math.round(index);
    if (idx >= Object.keys(mapTargets).length) {
      throw new Error(`Index ${idx} is out of range for map panels`);
    }
    const row = layout.rootItem as RowOrColumn;
    row.contentItems[idx]?.remove();
  }
}

function glWidth(): number {
  return layout?.width ?? window.innerWidth;
}

function updateSizes(indexChanged: number | null = null) {
  if (!layout) { return; } 

  const width = glWidth();
  const row = layout.rootItem as RowOrColumn;
  if (indexChanged != null && indexChanged < 0) {
    indexChanged += row.contentItems.length;
  }
  const lastIndex = row.contentItems.length - 1;
  const layersContainer = row.contentItems[0].contentItems[0].container;
  const datasetsContainer = row.contentItems[lastIndex].contentItems[0].container;

  layersContainer._config.minSize = layerControlsOpen.value ? 300 : 40;
  datasetsContainer._config.minSize = datasetControlsOpen.value ? 300 : 40;

  const layersSize = !layerControlsOpen.value ? PLACEHOLDER_WIDTH_PX : (indexChanged == 0 ? DEFAULT_PANEL_WIDTH_PX : layersContainer.width);
  if (layersSize != layersContainer.width) {
    layersContainer.setSize(layersSize);
  }

  const datasetsSize = !datasetControlsOpen.value ? PLACEHOLDER_WIDTH_PX : (indexChanged == lastIndex ? DEFAULT_PANEL_WIDTH_PX : layersContainer.width);
  if (datasetsSize != datasetsContainer.width) {
    datasetsContainer.setSize(datasetsSize);
  }

  const mapSize = width - layersContainer.width - datasetsContainer.width;
  const mapContainer = row.contentItems[1].contentItems[0].container;
  mapContainer.setSize(mapSize);
}

function _onPanelOpenChange(open: boolean, panelIndex: number) {
  if (!layout) { return; }
  const row = layout.rootItem as RowOrColumn;
  if (panelIndex < 0) {
    panelIndex += row.contentItems.length;
  }
  const item = row.contentItems[panelIndex].contentItems[0];
  const container = item.container;
  container.setSize(open ? DEFAULT_PANEL_WIDTH_PX : PLACEHOLDER_WIDTH_PX);
}

function onDatasetPanelOpenChange(open: boolean) {
  nextTick(() => {
    updateSizes(-1);
    document.querySelectorAll(".lm_splitter.lm_horizontal")[1].style.display = open ? "unset" : "none";
  });
}

function onLayersPanelOpenChange(open: boolean) {
  nextTick(() => {
    updateSizes(0);
    document.querySelectorAll(".lm_splitter.lm_horizontal")[0].style.display = open ? "unset" : "none";
  });
}

function layoutContent(): ComponentItemConfig[] {
  const layersWidth = layerControlsOpen.value ? DEFAULT_PANEL_WIDTH_PX : PLACEHOLDER_WIDTH_PX;
  const datasetsWidth = datasetControlsOpen.value ? DEFAULT_PANEL_WIDTH_PX : PLACEHOLDER_WIDTH_PX;
  const mapWidth = glWidth() - layersWidth - datasetsWidth;
  return [layersPanelConfig(layersWidth), mapConfig(mapWidth), datasetsPanelConfig(datasetsWidth)];
}

// bind add and remove to the window for easy access from the console
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).addMapPanel = addMapPanel;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).removeMapPanel = removeMapPanel;

let layout: GoldenLayout | null = null;
onMounted(() => {
  const rootEl = root.value as HTMLElement;
  if (!rootEl) {
    return;
  }
  layout = new GoldenLayout(rootEl);

  layout.registerComponentFactoryFunction("datasets-panel", container => {
    container.element.id = "datasets-panel";
    datasetsPanelTarget.value = container.element;
  });

  layout.registerComponentFactoryFunction("layers-panel", container => {
    container.element.id = "layers-panel";
    layersPanelTarget.value = container.element;
  });

  layout.registerComponentFactoryFunction("map-panel", container => {
    container.element.classList.add("map-panel");
    const id = v4();
    const target = ref<MaybeHTMLElement>(null);
    target.value = container.element;
    mapContainers[id] = container;
    mapTargets[id] = target;
  });

  // const panelWidth = getPanelWidth();
  // const mapWidth = 100 - 2 * panelWidth;

  const config: LayoutConfig = {
    settings: {
      hasHeaders: false,
      responsiveMode: "always",
    },
    dimensions: {
      defaultMinItemWidth: `${PLACEHOLDER_WIDTH_PX}px`,
    },
    root: {
      type: 'row',
      content: layoutContent(),
      isClosable: false,
    },
  };
  layout.resizeWithContainerAutomatically = true;
  layout.loadLayout(config);
  console.log(layout);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).layout = layout;

  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && !ignoreCache) {
      const stringified = serializeTempoStore(store); 
      window.localStorage.setItem(localStorageKey, stringified);
    }
  });
});

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
</style>
