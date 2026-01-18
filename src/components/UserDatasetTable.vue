<template>
  <div id="user-dataset-table-container">
    <div v-if="samples && Object.keys(samples).length > 0" id="utdc--samples">
      <save-csv  :csv="samplesToCsv(dataset)" />
      <v-data-table
      :items="samplesItems"
      :headers="sampleHeaders"
      @click:row="emits('rowClick', $event.item)"
      />
    </div>
    <div v-else-if="folded" id="utdc--folded">
      <save-csv :csv="foldedSamplesToCsv(dataset)" />
      <v-data-table
        v-if="folded"
        :headers="foldedHeaders"
        :items="foldedItems"
        @click:row="emits('rowClick', $event.item)"
        />
    </div>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { computed } from 'vue';
import type { Prettify, UserDataset, UnifiedRegion } from '@/types';
import type { FoldedTimeSeriesData, } from '@/esri/services/aggregation';
import type { TimeBinOptions, FoldingPeriodOptions } from '@/utils/foldingValidation';
import { regionCenter } from '@/utils/data_converters';

import { samplesToCsv, foldedSamplesToCsv } from '@/utils/data_converters';
import tz_lookup from '@photostructure/tz-lookup';
import SaveCsv from './SaveCSV.vue';
import { formatFoldedBinValue } from '@/utils/folded_bin_processor';

const props = defineProps<{
  dataset: Prettify<UserDataset>;
}>();

const samples = props.dataset.samples;
const errors = props.dataset.errors;
const center = regionCenter(props.dataset.region);
const tz = tz_lookup(center.lat, center.lon);

const errorMessage = computed(() => {
  if (samples === undefined) {
    return 'No samples available in this dataset.';
  }
  if (Object.keys(samples).length === 0) {
    return 'Samples has length 0 for this dataset';
  }
  return null;
});

const toDate = (date: Date) => date.toLocaleDateString(undefined, {dateStyle: 'medium'});
const toTime = (date: Date) => date.toLocaleTimeString(undefined, {
  hour12:true, hour:'numeric', minute: '2-digit', second:'2-digit',
  timeZone: tz,
});
const toDateTime = (date: Date) => date.toLocaleString(undefined, {
  "dateStyle": "medium",
  "timeStyle": "short",
  timeZone: tz,
});

function formatValueError(value: number | undefined | null, error: number | undefined | null): string {
  if (!value && !error) {
    return '';
  }
  const valStr = value ? (value / 1e14).toFixed(2) : 'N/A';
  const errStr = error ? (error / 1e14).toFixed(2) : 'N/A';
  return `${valStr} (${errStr})`;
}

const sampleHeaders = [
  { 
    title: 'Date' , 
    key: 'date',
    value: item => toDate(item.date),
  },
  { 
    title: 'Local Time', 
    key: 'localTime',
    value: item => toTime(item.date) 
  },
  { 
    title: 'Column Density (error)',
    children: [{
      title: '10¹⁴ molecules/cm²',
      key: 'columnDensity',
      value: item => formatValueError(item.value, item.error),
    }]
  },
];
const samplesItems = computed(() => {
  if (!samples) {
    return [];
  }
  return Object.entries(samples).map(([key, value]) => ({
    date: value.date,
    value: value.value,
    error: errors ? errors[key]?.upper : undefined,
  }));
});


const folded = props.dataset.folded;
const timeBin = props.dataset.folded?.timeBin as TimeBinOptions | undefined; 
const foldPeriod = props.dataset.folded?.foldPeriod as FoldingPeriodOptions | undefined;
const foldedData = props.dataset.folded?.raw as FoldedTimeSeriesData | undefined;

import { foldTypeToLabel } from '@/utils/folded_bin_processor';
import { format } from 'maplibre-gl';

const foldedHeaders = [
  { 
    title: foldTypeToLabel(folded?.foldType || 'none'),
    key: 'date',
  },
  { 
    title: 'Column Density (error)',
    children: [{
      title: '10¹⁴ molecules/cm²',
      key: 'columnDensity',
      value: item => formatValueError(item.value, item.error)
    }]
  },
];
const foldedItems = computed(() => {
  if (!foldedData) {
    return [];
  }
  return Object.entries(foldedData.values).map(([key, value]) => ({
    date: foldedData.foldType.toLowerCase().endsWith('none') ? toDateTime(new Date(value.bin)).replace(', 12:00 AM', '') : formatFoldedBinValue(folded.foldType, value.bin),
    // date: formatFoldedBinValue(folded.foldType, value.bin),
    value: value.value,
    error: foldedData.errors ? foldedData.errors[key]?.upper : undefined,
  }));
});

const emits = defineEmits<{
  (event: 'rowClick', value: { date: Date | number; value: number; error?: number }): void;
}>();
</script>