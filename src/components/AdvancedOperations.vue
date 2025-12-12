<template>
  <cds-dialog
    v-model="dialogOpen"
    title="Time Graph"
    density="compact"
    title-color="var(--info-background)"
    max-width="90vw"
    max-height="90vh"
    persistent
    scrollable
  > 
    <new-data-generic-aggregation
      v-if="mode === 'new'"
      v-model="dialogOpen"
      :selection="selection"
      @save="saveFolded"
    />
  </cds-dialog>

  
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { UserDataset } from '../types';
import NewDataGenericAggregation from './DataFoldingAndBinning.vue';

interface DataAggregationProps {
  selection: UserDataset | null;
}

const { selection } = defineProps<DataAggregationProps>();
const dialogOpen = defineModel<boolean>('modelValue', { type: Boolean, required: true });


const mode = ref<'aggregate' | 'fold' | 'new'>('new');

const emit = defineEmits<{
  (event: 'save', aggregatedSelection: UserDataset): void;
}>();

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

.time-graph-cds-dialog .cds-dialog-card {
  align-self: auto !important;
}

.time-graph-cds-dialog .cds-dialog-v-card-text {
  max-width: none;
  max-height: none;
  height: fit-content;
}
</style>
