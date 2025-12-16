<template>
  <div class="comparison-data-controls">
    <p class="my-3">
      Choose other datasets to view with the TEMPO Data. Drag cards to re-order data layers.
    </p>
    <div
      v-for="(map, index) in maps"
      :key="index"
    >
      <layer-order-control
        :mapRef="map"
        :order="['power-plants-layer', 'aqi-layer-aqi', 'pop-dens', 'land-use','hms-fire', 'tempo-o3', 'tempo-hcho', 'tempo-no2', 'stamen-toner-lines', 'stamen-toner-labels']"
      >
      </layer-order-control>
      <!-- center with d-block mx-auto -->
      <v-btn
        class="my-2 d-block mx-auto"
        @click="showAdvancedLayers = !showAdvancedLayers"
        @keyup.enter="showAdvancedLayers = !showAdvancedLayers"
        :text="showAdvancedLayers ? 'Show me less' : 'Show me more!'"
        density="compact"
        hide-details
        :color="accentColor2"
      >
      </v-btn>
      <v-checkbox
        v-model="showRGBMode"
        label="Use single-color TEMPO layers"
        density="compact"
        hide-details
      >
      </v-checkbox>
      <v-checkbox
        v-model="showFieldOfRegard"
        label="Show TEMPO field of regard"
        density="compact"
        hide-details
      >
      </v-checkbox>
      <power-plants-filter-control
        v-show="powerPlantsVisible[index].value"
        :map="map"
      >
      </power-plants-filter-control>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import type { Map } from "maplibre-gl";

import { useTempoStore } from "@/stores/app";
import { useMaplibreLayerVisibility } from "@/composables/useMaplibreLayerVisibility";

const store = useTempoStore();
const {
  maps,
  showFieldOfRegard,
  showAdvancedLayers,
  showRGBMode,
  accentColor2
} = storeToRefs(store);

const powerPlantsVisible = computed(() => 
  maps.value.map(map => useMaplibreLayerVisibility(map as Map, "power-plants-layer").visible)
);
console.log(powerPlantsVisible.value);
</script>

<style scoped lang="less">
.comparison-data-controls {
  font-size: 11pt !important;
}

:deep(.v-checkbox .v-label) {
  font-size: 10pt;
}
</style>
