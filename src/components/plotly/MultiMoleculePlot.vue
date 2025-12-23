<template>    
    <div :class="['multi-plot-container', { 'single-plot': isSingle }]">
      <div v-if="isSingle" class="multi-plot-container__plot">
        <UserDatasetPlot
          :dataset="datasets[0]"
          :show-errors="true"
          :data-options="[{mode: 'markers'}]"
          :layout-options="commonLayoutOptions"
          :config-options="commonConfigOptions"
          @plot-click="(value) => emit('plot-click', value)"
        />
      </div>
      
      <div v-else class="multi-plot-container__plot"  v-for="group in datasetsGroupedByMolecule" :key="group[0]">
        <MultiDatasetPlot
          :datasets="group[1]"
          :show-errors="true"
          :data-options="[{mode: 'markers'}]"
          :layout-options="commonLayoutOptions"
          :config-options="commonConfigOptions"
          @plot-click="(value) => emit('plot-click', value)"
        />
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { UserDataset } from '@/types';
import type { Config } from 'plotly.js-dist-min';
import MultiDatasetPlot from './MultiDatasetPlot.vue';
import UserDatasetPlot from './UserDatasetPlot.vue';
import { DEFAULT_PLOT_CONFIG, DEFAULT_PLOT_LAYOUT } from "@/components/plotly/defaults";

interface MultiPlotProps {
  datasets: UserDataset[];
}

const isSingle = computed(() => {return datasets.length === 1;});

const { datasets } = defineProps<MultiPlotProps>();
  
const emit = defineEmits<{
  (event: "plot-click", value: {x: number | string | Date | null, y: number, customdata: unknown}): void;
}>();

const _showErrorBands = ref(datasets.map((d) => d.folded ? true : false));

// Common layout options for all plots
const commonLayoutOptions = {
  ...DEFAULT_PLOT_LAYOUT,
  autosize: false,
  height: 250,
  width: Math.floor(700 * 250 / 400),
  xaxis: {
    automargin: false,
    gridcolor: 'rgba(128, 128, 128, 0.3)',
    title: {
      standoff: 10,
    },
  },
  yaxis: {
    automargin: false,
    gridcolor: 'rgba(128, 128, 128, 0.3)',
    title: {
      standoff: 10,
    },
  },
  legend: {
    yanchor: 'top',
    yref: 'paper',
    y: 1.3,
    orientation:'h' as |'h' | 'v',
    bordercolor: '#ccc', 
    borderwidth:1,
    entrywidthmode: 'pixels',
    entrywidth: 0, // fit the text
  }
} as Partial<Plotly.Layout>;

// Common config options for all plots
const commonConfigOptions: Partial<Config> = {
  ...DEFAULT_PLOT_CONFIG,
  responsive: true,
};

// const groupByMolecule = ref(false);

const datasetsGroupedByMolecule = computed(() => {
  const groups = new Map<string, UserDataset[]>();
  datasets.forEach((dataset) => {
    const molecule = dataset.molecule || 'Unknown Molecule';
    if (!groups.has(molecule)) {
      groups.set(molecule, []);
    }
    groups.get(molecule)!.push(dataset);
  });
  return groups;
});


</script>

<style>
div.multi-plot-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
  overflow-y: auto;
  max-height: calc(90vh - 100px);
  align-items: center;
  width: 100%;
}

div.multi-plot-container__plot {
  width: 100%;
  display: flex;
  flex-direction: column;
  min-width: 438px;
}

div.multi-plot-container.isSingle div.multi-plot-container__plot {
  width: auto;
}
</style>
