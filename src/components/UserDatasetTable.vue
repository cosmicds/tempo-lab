<template>
  <div id="user-dataset-table-container">
    <div v-if="errorMessage" id="utdc--error">
      {{ errorMessage }}
    </div>
    <div id="utdc--samples">
      <v-data-table
        v-if="samples && Object.keys(samples).length > 0"
        :items="samplesItems"
        :headers="sampleHeaders"
        @click:row="emits('rowClick', $event.item)"
        />
    </div>
    <div v-if="folded" id="utdc--folded">
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

import { samplesToCsv } from '@/utils/data_converters';
import tz_lookup from '@photostructure/tz-lookup';



const props = defineProps<{
  dataset: Prettify<UserDataset>;
}>();

const samples = props.dataset.samples;
const errors = props.dataset.errors;
const center = regionCenter(props.dataset.region);
const tz = tz_lookup(center.lat, center.lon);
console.log(samplesToCsv(props.dataset));
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
      value: item => `${item.value ? (item.value / 1e14).toFixed(2) : 'N/A'} (${item.error ? (item.error / 1e14).toFixed(2) : 'N/A'})`,
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
console.log('foldedData', foldedData);  


const foldedHeaders = [
  { 
    title: 'Bin' , 
    key: 'date',
  },
  { 
    title: 'Column Density (error)',
    children: [{
      title: '10¹⁴ molecules/cm²',
      key: 'columnDensity',
      value: item => `${item.value ? (item.value / 1e14).toFixed(2) : 'N/A'} (${item.error ? (item.error / 1e14).toFixed(2) : 'N/A'})`,
    }]
  },
];
const foldedItems = computed(() => {
  if (!foldedData) {
    return [];
  }
  return Object.entries(foldedData.values).map(([key, value]) => ({
    date: value.bin,
    value: value.value,
    error: foldedData.errors ? foldedData.errors[key]?.upper : undefined,
  }));
});

const emits = defineEmits<{
  (event: 'rowClick', value: { date: Date | number; value: number; error?: number }): void;
}>();
</script>