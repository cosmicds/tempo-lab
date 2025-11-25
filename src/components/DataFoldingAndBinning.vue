<template>
  <!-- <v-dialog
    v-model="dialogOpen"
    max-width="90vw"
    max-height="90vh"
    persistent
    scrollable
  > -->
    <v-card id="data-aggregation-card">
      <v-toolbar
        density="compact"
        color="var(--info-background)"
      >
        <v-toolbar-title>Data Aggregation</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          @click="closeDialog"
        ></v-btn>
      </v-toolbar>
      
      <v-card-text class="pa-4">
        <v-row>
          <!-- Left Panel: Folding Options -->
          <v-col cols="12" md="4">
            <v-card variant="outlined" class="pa-3">
              <AggregationControls
                :foldingPeriodOptions="foldingPeriodOptions"
                v-model:validFoldingForData="validFoldingForData"
                :timeBinOptions="timeBinOptions"
                v-model:validTimeBinForData="validTimeBinForData"
                v-model:isValidCombination="isValidCombination"
                v-model:useTzCenter="useTzCenter"
                v-model:tzCenter="tzCenter"
                v-model:selectedTimezone="selectedTimezone"
                :timezoneOptions="timezoneOptions"
                :methodOptions="methodOptions"
                v-model:showErrors="showErrors"
                v-model:useErrorBars="useErrorBars"
                v-model:useSEM="useSEM"
                v-model:alignDataToBinCenters="alignDataToBinCenters"
                v-model:disableIncludePhaseCheckbox="disableIncludePhaseCheckbox"
                v-model:alignToBinCenter="alignToBinCenter"
                v-model:disableBinCenterCheckbox="disableBinCenterCheckbox"
                :debugMode="debugMode"
                :originalDataPointCount="originalDataPointCount"
                v-model:foldedDataPointCount="foldedDataPointCount"
                v-model:selectedFoldType="selectedFoldType"
                v-model:canSave="canSave"
                @save="saveFolding"
                @cancel="closeDialog"
                v-model:selectedFoldingPeriod="selectedFoldingPeriod"
                v-model:selectedTimeBin="selectedTimeBin"
                v-model:selectedMethod="selectedMethod"
                v-model:foldedData="foldedData"
              />            
            </v-card>
          </v-col>
          
          <!-- Right Panel: Timeseries Graph -->
          <v-col cols="12" md="8">
            <v-card variant="outlined" class="pa-3" style="height: auto;">
              <v-card-title>
                Time Series Comparison
              </v-card-title>
              <div style="height: calc(100% - 40px);">
                <folded-plotly-graph
                  :datasets="graphData"
                  :show-errors="showErrors"
                  :fold-type="selectedFoldType"
                  :colors="[theColor, '#333']"
                  :timezones="selectedTimezone"
                  :data-options="[
                    {mode: 'markers'}, // options for the original data
                    {mode: 'markers'} // options for the folded data
                    ]"
                  :error-bar-styles="[
                    {'thickness': 1, 'width': 0}, // original data error bar style
                    { 'thickness': 3, 'width': 0 } // folded data error bar style
                  ]"
                  :config-options="{responsive: true, modeBarButtonsToRemove: ['sendDataToCloud','lasso2d', 'resetScale2d', ]}"
                  @click="handlePointClick"
                  :layout-options="{legend: {y:1.15, orientation:'h',bordercolor: '#ccc', borderwidth:1}}"
                />
              </div>
            <div id="below-graph-stuff" class="mt-2 explainer-text">
              <div v-if="aggregationWarning" id="aggregation-warning">
                {{ aggregationWarning }}
              </div>
              If you don't see any data, please press the "Autoscale" 
              <v-icon size="1.2em" style="margin-top:-0.1em;">mdi-arrow-expand-all</v-icon> 
              button on the graph menu (visible when you hover over the graph), or try clicking the 
              legend items to show/hide overlapping data. 
            </div>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  <!-- </v-dialog> -->
</template>

<script setup lang="ts">
// eslint-disable @typescript-eslint/no-unused-vars */
import { ref, computed, watch, nextTick } from 'vue';
import { storeToRefs } from "pinia";
import { v4 } from 'uuid';
import { TimeSeriesFolder, sortfoldBinContent } from '../esri/services/aggregation';
import FoldedPlotlyGraph from './FoldedPlotlyGraph.vue';
import type { Prettify, UserDataset, PlotltGraphDataSet, UnifiedRegion } from '../types';
import type { TimeRangeSelectionType } from '@/types/datetime';
import type { AggregationMethod, TimeSeriesData, FoldedTimeSeriesData , FoldType, FoldBinContent} from '../esri/services/aggregation';
import tz_lookup from '@photostructure/tz-lookup';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { useTempoStore } from '@/stores/app';
import AggregationControls from './AggregationControls.vue';
const store = useTempoStore();
const {
  debugMode,
} = storeToRefs(store);

import {
  TimeBinOptions,
  FoldingPeriodOptions,
  isValidCombination,
  getFirstValidTimeBin
} from '@/utils/foldingValidation';

interface DataFoldingProps {
  selection: UserDataset | null;
}

const props = defineProps<DataFoldingProps>();

const emit = defineEmits<{
  (event: 'save', foldedSelection: UserDataset): void;
}>();

// Dialog state
const dialogOpen = defineModel<boolean>('modelValue', { type: Boolean, required: true });

const theColor = computed(() => {
  return props.selection?.customColor ?? (props.selection?.region.color ?? 'blue');
});


const MS_IN_HOUR = 3600000;
const MS_IN_DAY = MS_IN_HOUR * 24;
const MS_IN_WEEK = MS_IN_DAY * 7;
const MS_IN_MONTH = MS_IN_DAY * 28; // to avoid invalidating February
const MS_IN_YEAR = MS_IN_DAY * 365.25;

const timeBinDurations: Record<TimeBinOptions, number> = {
  'hour': MS_IN_HOUR,
  'day': MS_IN_DAY,
  'week': MS_IN_WEEK,
  'month': MS_IN_MONTH, 
  'none': 0,
};

const foldingPeriodDurations: Record<FoldingPeriodOptions, number> = {
  'day': MS_IN_DAY,
  'week': MS_IN_WEEK,
  'month' : MS_IN_MONTH,
  'year': MS_IN_YEAR,
  'weekdayWeekend': MS_IN_WEEK, // weekend is part of week
  'none': 0,
};

const dataDuration = computed(() => {
  if (!props.selection?.samples) return 0;
  const timestamps = Object.values(props.selection.samples).map(s => s.date.getTime());
  if (timestamps.length === 0) return 0;
  // single loop to find min and max on unsorted array
  // (but it may already be sorted, but we only need to do this once so it's fine)
  const minMax = timestamps.reduce((acc, t) => {
    return {
      min: Math.min(acc.min, t),
      max: Math.max(acc.max, t)
    };
  }, { min: Infinity, max: -Infinity });
  return minMax.max - minMax.min;
});

function validTimeBinForData(timeBin: TimeBinOptions): boolean {
  if (dataDuration.value === 0) return false;

  return dataDuration.value >= timeBinDurations[timeBin];
}

function validFoldingForData(foldType: FoldingPeriodOptions): boolean {
  if (dataDuration.value === 0) return false;
  if (foldType === 'weekdayWeekend') {
    return (props.selection?.samples && Object.values(props.selection?.samples).map(s => s.date.getDay()).some(d => d === 0 || d === 6)) as boolean; // has at least one weekend day
  }
  return dataDuration.value >= foldingPeriodDurations[foldType];
}

const aggregationWarning = ref('');


// Time bin and folding period options
const timeBinOptions: {title: string, value: TimeBinOptions}[] = [
  { title: 'None', value: 'none' },
  { title: 'Hour', value: 'hour' },
  { title: 'Day', value: 'day' },
  { title: 'Week', value: 'week' },
  { title: 'Month', value: 'month' }
];

const allFoldingPeriodOptions: {title: string, value: FoldingPeriodOptions}[] = [
  { title: 'None', value: 'none' },
  { title: 'Day', value: 'day' },
  { title: 'Week', value: 'week' },
  { title: 'Month', value: 'month' },
  { title: 'Year', value: 'year' },
  { title: 'Weekend/Weekday', value: 'weekdayWeekend' },
];



// Computed property to filter valid folding periods based on selected time bin
const foldingPeriodOptions = computed(() => {
  return allFoldingPeriodOptions;
});


const methodOptions = [
  { title: 'Mean', value: 'mean' },
  { title: 'Median', value: 'median' },
  { title: 'Min', value: 'min' },
  { title: 'Max', value: 'max' }
];

const timezoneOptions = [
  { title: 'US/Eastern', value: 'US/Eastern' },
  { title: 'US/Central', value: 'US/Central' },
  { title: 'US/Mountain', value: 'US/Mountain' },
  { title: 'US/Arizona', value: 'US/Arizona' },
  { title: 'US/Pacific', value: 'US/Pacific' },
  { title: 'UTC', value: 'UTC' }
];

// Reactive state
const selectedTimeBin = ref<TimeBinOptions>('none');
const selectedFoldingPeriod = ref<FoldingPeriodOptions>('none');
const selectedMethod = ref<AggregationMethod>('mean');
const selectedTimezone = ref('US/Eastern');
const showErrors = ref(true);
const useSEM = ref(true);
const useErrorBars = ref(false);

watch(selectedFoldingPeriod, (newPeriod) => {
  if (!isValidCombination(selectedTimeBin.value, newPeriod)) {
    // Set to first valid option
    const validTimeBin = getFirstValidTimeBin(newPeriod);
    if (validTimeBin && validTimeBinForData(validTimeBin)) {
      selectedTimeBin.value = validTimeBin;
    } else {
      selectedTimeBin.value = 'hour'; // default fallback
    }
  }
});

// Computed FoldType based on time bin and folding period selections
const selectedFoldType = computed<FoldType>(() => {
  // Map the combination to the appropriate FoldType
  const timeBin = selectedTimeBin.value;
  const period = selectedFoldingPeriod.value;
    
  const foldType = `${timeBin}Of${period.charAt(0).toUpperCase()}${period.slice(1)}` as FoldType;
  console.log('Computed FoldType:', foldType, 'from', timeBin, 'and', period);
  return foldType;
});




// Check if we're using a None-period fold type (no actual folding)
const isNonePeriod = computed(() => {
  return selectedFoldingPeriod.value === 'none';
});

// Check if we're using any hour-based fold type (which is always centered)
const isHourBinned = computed(() => {
  return selectedTimeBin.value === 'hour';
});

const isFoldWithNoBin = computed(() => {
  return selectedTimeBin.value === 'none' && selectedFoldingPeriod.value !== 'none';
});

const includeBinPhase = ref(true);
// const alignToBinCenter = ref(true);
const alignToBinCenter = computed(() => {
  if (isNonePeriod.value) return true;
  if (selectedFoldingPeriod.value === 'weekdayWeekend') return false;
  if (includeBinPhase.value === false) return false;
  if (isHourBinned.value) return true;
  if (selectedTimeBin.value === 'week' && selectedFoldingPeriod.value === 'year') return false;
  return true;
});

const alignDataToBinCenters = computed({
  get() {
    return !includeBinPhase.value;
  },
  set(value: boolean) {
    includeBinPhase.value = !value;
  }
});


const disableBinCenterCheckbox = computed(() => {
  return !isNonePeriod.value && includeBinPhase.value && !isHourBinned.value;
});

const disableIncludePhaseCheckbox = computed(() => {
  return !isNonePeriod.value;
});

// Watch to ensure selected folding period is valid when time bin changes
watch(selectedTimeBin, () => {
  const validPeriods = foldingPeriodOptions.value.map(opt => opt.value);
  if (!validPeriods.includes(selectedFoldingPeriod.value)) {
    // Set to first valid option
    if (validPeriods.length > 0) {
      selectedFoldingPeriod.value = validPeriods[0];
    }
  }
});

// Watch for None-period types and reset incompatible options
watch(isNonePeriod, (isNone) => {
  if (isNone) {
    includeBinPhase.value = true;
    // alignToBinCenter.value = true;
  }
});

const regionCenter = computed(() => {
  const region = props.selection?.region as UnifiedRegion;
  
  if (region && region.geometryType === 'point') {
    return { lat: region.geometryInfo.y, lon: region.geometryInfo.x };
  }
  
  if (region && region.geometryType === 'rectangle') {
    const { xmin, ymin, xmax, ymax } = region.geometryInfo;
    return { lat: (ymin + ymax) / 2, lon: (xmin + xmax) / 2 };
  }
  
  return { lat: 0, lon: 0 };
});



const useTzCenter = ref(true);
const tzCenter = tz_lookup(regionCenter.value.lat, regionCenter.value.lon);

if (regionCenter.value.lat !== 0 || regionCenter.value.lon !== 0) {
  const tz = tz_lookup(regionCenter.value.lat, regionCenter.value.lon);
  if (tz && useTzCenter.value) {
    selectedTimezone.value = tz;
  }
}

watch(useTzCenter, (newVal) => {
  if (newVal && regionCenter.value.lat !== 0 && regionCenter.value.lon !== 0) {
    const tz = tz_lookup(regionCenter.value.lat, regionCenter.value.lon);
    if (tz) {
      selectedTimezone.value = tz;
    }
  }
});

// Computed properties
const originalDataPointCount = computed(() => {
  if (!props.selection?.samples) return 0;
  return Object.keys(props.selection.samples).length;
});

const foldedDataPointCount = computed(() => {
  if (!foldedData.value) return 0;
  return Object.keys(foldedData.value.values).length;
});

const canSave = computed(() => {
  return !!(props.selection && foldedData.value && foldedDataPointCount.value > 0);
});

const foldedDatasetName = computed(() => {
  if (!props.selection?.name) return 'Folded Data';
  return `Aggregated ${props.selection.name ?? props.selection.region.name}`;// (${selectedTimeBin.value} of ${selectedFoldingPeriod.value}, ${selectedMethod.value})`;
});

// Aggregated data
const foldedData = ref<FoldedTimeSeriesData | null>(null);
const foldedSelection = ref<null>(null);
// Graph data for display - now a ref that gets manually updated
const graphData = ref<PlotltGraphDataSet[]>([]);

watch(foldedData, (newvValue) => {
  // if there is only one bin present the user with an aggregation warning
  if (newvValue && newvValue.bins && Object.keys(newvValue.bins).length <= 1) {
    aggregationWarning.value = ("Warning: This combination of time bin and folding period results " +
      "in only one bin. Please select a smaller time bin " + 
      "or a different folding period if available. In most cases, it is recommend to select 'None' for the folding period.");
  } else {
    aggregationWarning.value = '';
  }
});


// eslint-disable-next-line @typescript-eslint/no-unused-vars
function timeseriesToDataSet(timeseries: TimeSeriesData): Omit<PlotltGraphDataSet, 'name'> {
  const x: PlotltGraphDataSet['x'] = [];
  const y: PlotltGraphDataSet['y'] = [];
  const lower: PlotltGraphDataSet['lower'] = [];
  const upper: PlotltGraphDataSet['upper'] = [];

  // tsa, tsb are the timestamps as strings
  const sortedEntries = Object.entries(timeseries.values).sort(([tsa, _a], [tsb, _b]) => parseInt(tsa) - parseInt(tsb));
  // get the first timestamp
  sortedEntries.forEach(([timestamp, aggValue]) => {
    y.push(aggValue.value);
    x.push(new Date(parseInt(timestamp)));
    const error = timeseries.errors[timestamp];
    lower.push(error?.lower ?? null);
    upper.push(error?.upper ?? null);
  });

  return { x, y, lower, upper };
}

function foldedTimesSeriesToDataSet(foldedTimeSeries: FoldedTimeSeriesData): Omit<PlotltGraphDataSet, 'name'> {
  const x: (number | Date | null)[] = [];
  const y: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const upper: (number | null)[] = [];

  // Check if this is a None-period fold type
  const isNonePeriod = ['noneOfNone','hourOfNone', 'dayOfNone', 'weekOfNone', 'monthOfNone'].includes(foldedTimeSeries.foldType);

  // tsa, tsb are the timestamps as strings
  const sortedEntries = Object.entries(foldedTimeSeries.bins).sort(([binIndexa, _a], [binIndexb, _b]) => parseInt(binIndexa) - parseInt(binIndexb));

  sortedEntries.forEach(([binIndex, _binContent]) => {
    const idx = parseInt(binIndex);
    const aggValue = foldedTimeSeries.values[idx];
    
    // Use date if available (for None-period types), otherwise use bin index
    if (isNonePeriod && aggValue.date) {
      // For None-period types with dates, center bins by adding half the bin width
      if (alignToBinCenter.value) {
        const date = new Date(aggValue.date);
        switch (foldedTimeSeries.foldType) {
        case 'hourOfNone':
          date.setMinutes(30); // Center of hour
          break;
        case 'dayOfNone':
          date.setHours(date.getHours() + 12); // local Noon
          break;
        case 'weekOfNone':
          date.setDate(date.getDate() + 3); // Middle of week (approx)
          date.setHours(date.getHours() + 12);
          break;
        case 'monthOfNone':
          date.setDate(15); // Middle of month (approx)
          break;
        }
        x.push(date);
      } else {
        x.push(aggValue.date);
      }
    } else {
      if (foldedTimeSeries.foldType !== 'hourOfDay') {
        x.push(idx + (alignToBinCenter.value ? 0.5 : 0));
      } else {
        x.push(idx);
      }
    }
    
    y.push(aggValue.value);
    const error = foldedTimeSeries.errors[idx];
    lower.push(error?.lower ?? null);
    upper.push(error?.upper ?? null);
  });

  return { x, y, lower, upper, errorType: useErrorBars.value ? 'bar' : 'band' };
}
  
function foldedTimeSeriesRawToDataSet(foldedTimeSeries: FoldedTimeSeriesData): Omit<PlotltGraphDataSet, 'name'> {
  const x: (number | Date | null)[] = [];
  const y: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const upper: (number | null)[] = [];
  const customdata: Date[] = [];

  // Check if this is a None-period fold type
  const isNonePeriod = ['hourOfNone', 'dayOfNone', 'weekOfNone', 'monthOfNone'].includes(foldedTimeSeries.foldType);

  // tsa, tsb are the timestamps as strings
  const sortedEntries = Object.entries(foldedTimeSeries.bins).sort(([binIndexa, _a], [binIndexb, _b]) => parseInt(binIndexa) - parseInt(binIndexb));

  sortedEntries.forEach(([_binIndex, binContent]) => {
    const sortedBinContent = sortfoldBinContent(binContent);
    const bins = sortedBinContent as Prettify<FoldBinContent>;
    
    bins.rawValues.forEach((rv, index) => {
      if (isNonePeriod) {
        // For None-period types, use the actual timestamp
        x.push(new Date(bins.timestamps[index]));
      } else {
        // For regular fold types, use bin index with optional phase
        x.push(bins.bin + (includeBinPhase.value ? bins.binPhase[index] : 0));
      }
      customdata.push(toZonedTime(new Date(bins.timestamps[index]), selectedTimezone.value));
      y.push(rv);
    });
    bins.lowers.forEach(low => {
      lower.push(low ?? null);
    });
    bins.uppers.forEach(up => {
      upper.push(up ?? null);
    });
  });
  // the ascii +- symbol is this characher: ±
  const hovertemplate = '%{customdata|%Y-%m-%d %H:%M}<br>%{y:0.2e}±%{error_y.array:0.2e}<extra></extra>';
  
  return { x, y, lower, upper, errorType: 'bar', datasetOptions: { customdata, hovertemplate } };
}

// Function to update graph data
function updateGraphData() {
  console.log("Updating graph data");
  if (!props.selection) {
    graphData.value = [];
    return;
  }
  
  // const data = [timeseriesToDataSet(selectionToTimeseries(props.selection))]; // Original data
  const data: PlotltGraphDataSet[] = [];
  
  if (foldedData.value) {
    const t = foldedTimeSeriesRawToDataSet(foldedData.value); // Raw folded data
    (t as PlotltGraphDataSet).name = props.selection.name || 'Original Data';
    data.push(t as PlotltGraphDataSet); // Raw folded data
    if (!isFoldWithNoBin.value) {
      const f = foldedTimesSeriesToDataSet(foldedData.value); // Summary folded data
      (f as PlotltGraphDataSet).name = foldedDatasetName.value;
      data.push(f as PlotltGraphDataSet); // Summary folded data
    }
  } else {
    // No folded data, just show original
    const original = timeseriesToDataSet(selectionToTimeseries(props.selection));
    (original as PlotltGraphDataSet).name = props.selection.name || 'Original Data';
    data.push(original as PlotltGraphDataSet);
  }
  console.log("Prepared graph data:", data);
  graphData.value = data;
  console.log("Graph data updated with", data.length, "datasets");
}

// Create a time range for the folded data
function createFoldedTimeRange() {
  if (!props.selection) {
    throw new Error('No selection available');
  }
  
  const originalRange = props.selection.timeRange.range;
  const ranges = Array.isArray(originalRange) ? originalRange : [originalRange];
  
  return {
    id: v4(),
    name: `Folded (${selectedTimeBin.value} of ${selectedFoldingPeriod.value})`,
    description: `Folded data (${selectedTimeBin.value} of ${selectedFoldingPeriod.value}) ${selectedMethod.value}`,
    range: ranges,
    type: 'folded' as TimeRangeSelectionType,
  };
}


// Only recalculate when data-affecting parameters change
watch([selectedTimeBin, selectedFoldingPeriod, selectedMethod, selectedTimezone, useSEM], 
  updateAggregatedData, { immediate: true });

// Handle display-only changes separately
watch([useErrorBars, alignToBinCenter, includeBinPhase], updateGraphData);

function selectionToTimeseries(selection: UserDataset): TimeSeriesData {
  return {
    values: selection.samples || {},
    errors: selection.errors || {},
    locations: selection.locations || [],
    geometryType: selection.region.geometryType || 'rectangle'
  };
}

// Update folded data when parameters change
function updateAggregatedData() {
  console.log("Updating folded data with time bin:", selectedTimeBin.value, "folding period:", selectedFoldingPeriod.value, "fold type:", selectedFoldType.value, "method:", selectedMethod.value, "timezone:", selectedTimezone.value);
  if (!props.selection?.samples) {
    foldedData.value = null;
    return;
  }
  
  try {
    
    // Convert the selection data to TimeSeriesData format
    const timeSeriesData = selectionToTimeseries(props.selection);
    
    let foldType = selectedFoldType.value;
    if (isFoldWithNoBin.value) {
      foldType = foldType.replace('noneOf', 'hourOf') as FoldType;
    }
    
    const grouper = new TimeSeriesFolder(
      foldType,  // Use the computed fold type
      selectedTimezone.value, 
      selectedMethod.value, 
      useSEM.value ? 'sem' : 'std', true);
    foldedData.value = grouper.foldData(timeSeriesData);
    
  } catch (error) {
    console.error('Error aggregating data:', error);
    foldedData.value = null;
    foldedSelection.value = null;
  }
  
  // Update graph data after folding
  updateGraphData();
  console.log("graphData after update:", graphData.value);
}

function handlePointClick(value: {x: Plotly.Datum, y: number, customdata: unknown}) {
  console.log("Point clicked:", value);
  console.log("Custom data Date:", value.customdata ? value.customdata as Date: value.customdata);
  // the from timezoned time is what we want to to send work with if we go back to esri stuff
  console.log("fromZonedTime", value.customdata ? fromZonedTime(value.customdata as Date, selectedTimezone.value) : value.customdata);
  return;
}

// Save the folding
function saveFolding() {
  
  if (!canSave.value || !props.selection || !foldedData.value) return;
  
  // const rawDataset = foldedTimeSeriesRawToDataSet(foldedData.value);
  // (rawDataset as PlotltGraphDataSet).name = props.selection.name || 'Original Data';
  // const summaryDataset = foldedTimesSeriesToDataSet(foldedData.value);
  // (summaryDataset as PlotltGraphDataSet).name = foldedDatasetName.value;

  const foldedSelection: UserDataset = {
    id: v4(),
    region: { ...props.selection.region, name: props.selection.region.name } as typeof props.selection.region,
    timeRange: createFoldedTimeRange(),
    molecule: props.selection.molecule,
    customColor: theColor.value,
    loading: false, // folded data is immediately available
    // samples/errors intentionally omitted for folded since bins are synthetic; rely on plotlyDatasets
    locations: foldedData.value.locations,
    name: foldedDatasetName.value,
    folded: {
      timeBin: selectedTimeBin.value,
      foldingPeriod: selectedFoldingPeriod.value,
      foldType: selectedFoldType.value,
      method: selectedMethod.value,
      timezone: selectedTimezone.value,
      useSEM: useSEM.value,
      includeBinPhase: includeBinPhase.value,
      alignToBinCenter: alignToBinCenter.value,
      useErrorBars: useErrorBars.value,
      raw: foldedData.value
    },
    plotlyDatasets: [
      {
        ...graphData.value[0],
        datasetOptions: {
          ...graphData.value[0].datasetOptions,
          mode: 'markers',
          // hovertemplate: '%{customdata|%Y-%m-%d %H:%M}<br>%{y:0.2e}±%{error_y.array:0.2e}<extra></extra>'
        }
      } as PlotltGraphDataSet,
      {
        ...graphData.value[1],
        datasetOptions: {
          mode: 'markers'
        }
      } as PlotltGraphDataSet
    ].slice(0, isFoldWithNoBin.value ? 1 : 2) // only include summary if not fold-with-no-bin
  };
  console.log(foldedSelection);
  emit('save', foldedSelection);

  closeDialog();
}

// Close dialog
function closeDialog() {
  dialogOpen.value = false;
  // Reset state
  nextTick(() => {
    foldedData.value = null;
  });
}

// Watch for selection changes
watch(() => props.selection, () => {
  if (props.selection) {
    updateAggregatedData();
  }
}, { immediate: true });
</script>

<style scoped>

#aggregation-warning {
  color: red;
  font-weight: bold;
  margin-bottom: 0.5em;
}



</style>