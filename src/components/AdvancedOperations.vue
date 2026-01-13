<template>
  <cds-dialog
    v-model="dialogOpen"
    title="Time Graph"
    density="compact"
    title-color="var(--info-background)"
    max-width="90vw"
    max-height="90vh"
    height="fit-content"
    persistent
    draggable
  > 
    <new-data-generic-aggregation
      v-if="mode === 'new'"
      v-model="dialogOpen"
      v-model:show-controls="aggControlsVisible"
      :selection="selection"
      @save="saveFolded"
      @plot-click="handlePlotClick"
    />
  </cds-dialog>

  
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { UserDataset, UnifiedRegion, MoleculeType} from '../types';
import NewDataGenericAggregation from './DataFoldingAndBinning.vue';



interface DataAggregationProps {
  selection: UserDataset | null;
}

const { selection } = defineProps<DataAggregationProps>();
const dialogOpen = defineModel<boolean>('modelValue', { type: Boolean, required: true });
const aggControlsVisible = ref(false);

const mode = ref<'aggregate' | 'fold' | 'new'>('new');

const emit = defineEmits<{
  (event: 'save', aggregatedSelection: UserDataset): void;
  (event: "plot-click", value: {x: number | string | Date | null, y: number, customdata: unknown, molecule: MoleculeType, region: UnifiedRegion}): void;
}>();


function handlePlotClick(value: {x: number | string | Date | null, y: number, customdata: unknown, molecule: MoleculeType, region: UnifiedRegion}) {
  emit('plot-click', value);
}
// Save the aggregation
// function saveAggregation(selection: UserDataset) {
//   emit('save', selection);
// }

function saveFolded(selection: UserDataset) {
  // Reuse same save channel for folded selections
  emit('save', selection);
}



</script>

<style>


</style>
