<template>
  <draggable 
    v-model="displayOrder" 
    handle=".drag-handle"
    class="layer-order"
    :item-key="(item) => item"
  >
    <template #item="{ element }">
      <div class="layer-order-row">
        <div class="drag-handle">
          <v-icon size="x-small">mdi-menu</v-icon>
        </div>
        <layer-control-item
          :map="mapRef"
          :layer-id="element"
          :display-name="displayNameTransform(element)"
        >
          <template #info
            v-if="layerInfo[element]"
          >
            <div v-html="layerInfo[element]"></div>
          </template>
          <template #extras="{ visible }"
            v-if="element.startsWith(tempoPrefix)"
          >
            <local-scope
              :cbar="colorbarOptions[element.slice(tempoPrefix.length)]"
            >
              <template #default="{ cbar }">
                <colorbar-horizontal
                  v-show="visible"
                  :cmap-name="showRGBMode ? cbar.rgbcolormap : cbar.colormap"
                  :cmap="colormapFunction(showRGBMode ? cbar.rgbcolormap : cbar.colormap)"
                  background-color="transparent"
                  height="15px"
                  font-size="9pt"
                  :nsteps="255"
                  :start-value="String((showRGBMode ? cbar.rgbstretch : cbar.stretch)[0] / cbar.cbarScale)"
                  :end-value="String((showRGBMode ? cbar.rgbstretch : cbar.stretch)[1] / cbar.cbarScale)"
                  :extend="false"
                >
                  <template #label>
                    <span v-html="cbarLabel(cbar.cbarScale, cbar.unit)"></span>
                  </template>
                </colorbar-horizontal>
              </template>
            </local-scope>
          </template>
        </layer-control-item>
      </div>
    </template>
  </draggable>
</template>


<script setup lang="ts">
import { computed, type MaybeRef,  toValue, toRef } from 'vue';
import { storeToRefs } from "pinia";
import draggable from 'vuedraggable';
import M from 'maplibre-gl';

import { useMaplibreLayerOrderControl } from "@/composables/useMaplibreLayerOrderControl";
import { capitalizeWords } from "@/utils/names";
import { colorbarOptions } from "@/esri/ImageLayerConfig";
import { colormapFunction } from "@/colormaps/utils";
import { useTempoStore } from "@/stores/app";

const store = useTempoStore();
const { showRGBMode } = storeToRefs(store);

interface Props {
  mapRef: M.Map | null;
  order: MaybeRef<string[]>;
}

const props = defineProps<Props>();
const mapRef = toRef(() => props.mapRef);

// https://vuejs.org/guide/typescript/composition-api.html#typing-component-emits

interface Emits {
  (e: 'change', newOrder: string[]): void;
}
const _emit = defineEmits<Emits>();
const { 
  currentOrder, 
  controller 
} = useMaplibreLayerOrderControl(mapRef, toValue(props.order), true);

const tempoPrefix = "tempo-";

const displayOrder = computed({
  get(): string[] {
    return currentOrder.value.slice().reverse();
  },
  set(value: string[]) {
    controller?.setOrder(value.slice().reverse());
  }
});

const layerNames: Record<string, string | undefined> = {
  "tempo-no2": "TEMPO NO2",
  "aqi-layer-aqi": "Air Quality Index",
  "power-plants-heatmap": "Power Plants",
  "power-plants-layer": "Power Plants",
  "stamen-toner-lines": "Roads",
  "pop-dens": "Population Density",
  "land-use": "Land Use",
  "hms-fire": "Fire Detections",
  'tempo-hcho': "TEMPO HCHO",
  'tempo-o3': "TEMPO Ozone",
};

const layerInfo: Record<string, string | undefined> = {
  "aqi-layer-aqi": 'From <a href="https://www.airnow.gov/aqi/aqi-basics/">EPA</a>; taken once per day',
};

function displayNameTransform(layerId: string): string {
  return layerNames[layerId] ?? capitalizeWords(layerId.replace(/-/g, " "));
}

function cbarLabel(cbarScale: number, unit: string) {
  const power = cbarScale > 1 ? `10<sup>${Math.round(Math.log10(cbarScale))}</sup>` : "";
  return `${power} ${unit}`;
}
</script>


<style scoped>
ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
  margin-left: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  height: fit-content;
}

li {
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
  cursor: move;
  margin: 10px 0;
}

.drag-handle {
  font-size: 20pt;

  &:hover {
    cursor: grab;
  }
}

.layer-order {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.layer-order-row {
  background: #404040;
  border: 1px solid white;
  border-radius: 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 5px;
}

.mlc-layer-item {
  border-left: 1px solid white;
  padding: 2px;
}
</style>
