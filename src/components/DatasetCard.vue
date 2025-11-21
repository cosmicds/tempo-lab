<template>
  <v-list>
    <v-hover
      v-slot="{ isHovering, props }"
      v-for="dataset in datesetsWithNotFoldedFisrt"
      :key="dataset.id"
    > 
      <!-- create a checkbox input that will -->
    
      <v-list-item
        v-bind="props"
        :ref="(el) => datasetRowRefs[dataset.id] = el"
        class="selection-item my-2 rounded-lg"
        :style="{ 'background-color': isFolded(dataset) ? '#333' : '#999', 'color': isFolded(dataset) ? '#fff' : '#000', 'padding-top': '4px' }"
        :ripple="touchscreen"
        lines="two"
      >
        <template v-slot:prepend v-if="turnOnSelection">
          <v-checkbox
            v-model="selectedDatasets"
            :value="dataset.id"
            @click.stop
            hide-details
            density="compact"
          />
        </template>
        <template #default>
          <div>
            <h3 
              class="selection-item__title" 
              :style="{
                '--color': dataset.customColor ?? dataset.region.color,
                '--contrast-color': contrastingColor(dataset.customColor ?? dataset.region.color),
                }"
                >
              {{ dataset.name ?? dataset.region.name }}
            </h3>
            <div class="d-flex flex-wrap align-center ga-2 my-2">
              <v-chip 
                label
                size="small" 
                variant="flat"  
                :color="dataset.region.color"
                >
                Region: {{ dataset.region.name }}
              </v-chip>
              
              <v-chip label size="small" >
                Mol: {{ moleculeName(dataset.molecule) }}
              </v-chip>
              
              <div class="d-inline-block text-caption dataset-patttern-chip"
                v-if="dataset.timeRange" 
                >
              <span>{{ dataset.timeRange.description }}</span>
            </div>
          </div>
            
            <!-- <v-chip 
              v-if="dataset.timeRange" 
              size="small" 
              class="text-caption"
              >
              {{ dataset.timeRange?.type ?? 'no type' }}
            </v-chip> -->
          </div>
          <!-- this is where the actions will go -->
          <slot name="action-row" :isHovering="isHovering" :dataset="dataset">
          </slot>
        </template>
      </v-list-item>
    </v-hover>
  </v-list>


</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { supportsTouchscreen } from "@cosmicds/vue-toolkit";
import type { UserDataset } from "../types";
import { useTempoStore } from "../stores/app";
import { moleculeName } from "../esri/utils";
import { contrastingColor } from "@/utils/color";


const store = useTempoStore();

interface DatasetCardProps {
  datasets: UserDataset[];
  turnOnSelection?: boolean;
}
const { datasets, turnOnSelection } = defineProps<DatasetCardProps>();

// create a selectedDatasets model, to hold selectedDatsets use (defineModel). should just store the dataset.id values
const selectedDatasets = defineModel<string[]>('selectedDatasets', {
  type: Array as () => string[],
  default: () => [],
});

const touchscreen = supportsTouchscreen();


const openGraphs = ref<Record<string,boolean>>({});



const datasetRowRefs = ref({});

function isFolded(dataset: UserDataset): boolean {
  return !!(dataset.timeRange && dataset.timeRange.type === 'folded');
}


const datesetsWithNotFoldedFisrt = computed(() => {
  return [...datasets].sort((a, b) => {
    const aFolded = isFolded(a) ? 1 : 0;
    const bFolded = isFolded(b) ? 1 : 0;
    return aFolded - bFolded;
  });
});


function _removeDataset(dataset: UserDataset) {
  store.deleteDataset(dataset);

  delete openGraphs[dataset.id];
  delete datasetRowRefs[dataset.id];
}


</script>

<style scoped lang="less">
.dataset-patttern-chip {
  text-wrap: auto;
  background-color: #878787;
  border-radius: 4px;
  padding: 2px 6px;
}
.dataset-patttern-chip > span {
  opacity: 1;
  color: black;
}

h3.selection-item__title {
  background-color: var(--color);
  // contrast is a function provided by LESS
  color: var(--contrast-color);
  padding-left: 8px;
  font-size: 0.9em;
  border-radius: 4px;
}
</style>
