<template>
  <v-list density="compact">
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
        :style="{ 'background-color': isFolded(dataset) ? '#333' : '#999', 'color': isFolded(dataset) ? '#fff' : '#000' }"
        :ripple="touchscreen"
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
            <v-chip
              class="dataset-name-chip my-2"
              size="small" 
              variant="flat"
              elevation="1"
              :color="dataset.customColor ?? dataset.region.color"
              @click="emit('editRegion', dataset)"
              >
              {{ dataset.name ?? dataset.region.name }}
            </v-chip>
            <v-expand-transition>
              <div class="d-flex flex-wrap align-center ga-2 mb-2">
                <v-chip 
                  label
                  size="small" 
                  variant="flat"  
                  :color="dataset.region.color"
                  >
                  Region: {{ dataset.region.name }}
                </v-chip>
                
                <v-chip label size="small" >
                  <span class="molecule-label">
                    <span :class="`mol-label ${dataset.molecule}-mono-svg`"></span>
                    {{ moleculeName(dataset.molecule) }}
                  </span>
                </v-chip>
                
                <div class="d-inline-block text-caption dataset-patttern-chip"
                  v-if="dataset.timeRange" 
                  >
                  <span>{{ dataset.timeRange.description }}</span>
                </div>
              </div>
            </v-expand-transition>
          </div>
          <!-- this is where the actions will go -->
          <slot name="action-row" :isHovering="isHovering ?? true" :dataset="dataset">
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

const emit = defineEmits<{
  (event: 'editRegion', value: UserDataset): void;
}>();

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

.dataset-name-chip {
  cursor:text;
}

.v-list-item--density-compact.v-list-item--one-line {
  min-height: unset;
}

.mol-label {
  --size: 3em;
  width: var(--size);
  height: var(--size);
}


</style>
