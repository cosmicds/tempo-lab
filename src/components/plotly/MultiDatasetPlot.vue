<template>
  
  <div class="dataset-plot-container">
    <div class="dataset-plot" v-if="foldedDatasets.size > 0">
      <details open :class="['dataset-plot__plot', 'dataset-plot-details', 'folded-data-details']" v-for="[foldType, datasets] in foldedDatasets" :key="foldType">
        <summary>
          <!-- {molecule} folded timeseries -->
          <div>
            {{ moleculeDescriptor(datasets.map(d => d.molecule)[0]).fullName.text }} ({{ pascalToSnake(foldType) }}) folded timeseries
          </div>
        </summary>
        <folded-plotly-graph
          :datasets="datasets.map(d => d.plotlyDatasets![1])"
          :show-errors="props.showErrors"
          :colors="datasets.map(d => (d.customColor ?? d.region.color))"
          :data-options="ddataOptions"
          :names="datasets.map(d => d.name ?? d.id)"
          :layout-options="dlayoutOptions"
          :fold-type="datasets[0].folded?.foldType"
          :timezones="datasets.map(d => d.folded.timezone ?? 'UTC')"
          :config-options="dconfigOptions"
          :yaxis-title="moleculeDescriptor(datasets[0].molecule).unit.html"
          @plot-click="(value) => emit('plot-click', value)"
        />
      </details>
    </div>
    <div class="dataset-plot" v-if="normalDatasets.length > 0">
      <details open :class="['dataset-plot__plot', 'dataset-plot-details', 'normal-data-details']" >
        <summary>
          <!-- {molecule} timeseries -->
          <div>
            {{ moleculeDescriptor(normalDatasets.map(d => d.molecule)[0]).fullName.text }} timeseries
          </div>
        </summary>
        <plotly-graph
          :datasets="normalDatasets.map(d => userDatasetToPlotly(d, true))"
          :colors="normalDatasets.map(d => (d.customColor || d.region.color))"
          :show-errors="showErrors"
          :data-options="ddataOptions"
          :names="normalDatasets.map(d => d.name ?? d.id)"
          :layout-options="{
            ...dlayoutOptions,
            xaxis: {...(dlayoutOptions?.xaxis ?? {}), title: {text: 'Local Time for Region'}},
          }"
          :config-options="dconfigOptions"
          :yaxis-title="moleculeDescriptor(normalDatasets[0].molecule).unit.html"
          @click="(value) => emit('plot-click', value)"
        />
      </details>
    </div>
      
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import FoldedPlotlyGraph from '../FoldedPlotlyGraph.vue';
import type {FoldedPlotlyGraphProps} from '../FoldedPlotlyGraph.vue';
import PlotlyGraph from './PlotlyGraph.vue';
import { userDatasetToPlotly } from '@/utils/data_converters';
import type { UserDataset } from '@/types';
import type { Config, ModeBarDefaultButtons } from 'plotly.js-dist-min';
import { moleculeDescriptor } from '@/esri/utils';
import { pascalToSnake } from '@/utils/text';


interface DatasetPlotProps extends Omit<FoldedPlotlyGraphProps, 'datasets'| 'foldType' | 'timezones'> {
  datasets: UserDataset[];
  hideLegend?: boolean;
}
const props = defineProps<DatasetPlotProps>();
const emit = defineEmits<{
  (event: "plot-click", value: {x: number | string | Date | null, y: number, customdata: unknown}): void;
}>();



// Common layout options for all plots
const dlayoutOptions = {
  margin: { t: 20, r: 30, b: 60, l: 80 },
  autosize: true,
  ...(props.layoutOptions ?? {}),
};

// Common config options for all plots
const dconfigOptions: Partial<Config> = {
  responsive: true,
  modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d', 'select2d'] as ModeBarDefaultButtons[],
  ...(props.configOptions ?? {}),
};

const ddataOptions = computed(() => {
  const defaultOpt = {showlegend: props.hideLegend ?? true};
  if (props.dataOptions && props.dataOptions.length > 0) {
    return props.dataOptions.map((opt) => ({...opt, ...defaultOpt}));
  } else {
    return [{...defaultOpt}];
  }
});

const foldedDatasets = computed(() => {
  const byGroup: Map<string, UserDataset[]> = new Map();
  props.datasets
    .forEach(d => {
      if (d.folded && d.plotlyDatasets) {
        const ft = d.folded.foldType;
        if (byGroup.has(ft)) {
          byGroup.get(ft)!.push(d);
        } else {
          byGroup.set(ft, [d]);
        }
      }
    });

  
  return byGroup;
});

const normalDatasets = computed(() => {
  return props.datasets.filter(d => !d.folded);
});


</script>

<style>
div.dataset-plot-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

div.dataset-plot {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}


details.dataset-plot__plot {
  margin-block: 4px;
  padding-inline: 5px;
  border-radius: 6px;
  background-color: rgba(0 0 0 / .25);
  font-size: 0.8em;
  width: fit-content;
}

details.dataset-plot-details:hover {
  outline: 1px solid #888;
}
details.dataset-plot-details.single-plot:hover {
  outline: none;
}

details.dataset-plot-details > summary {
  display: block;
}
details.dataset-plot-details.single-plot > summary {
  display: none;
}
details.dataset-plot-details > summary > div {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  height: 3em;
}

/* https://stackoverflow.com/a/66487919/11594175 */
details.dataset-plot-details > summary::marker,
details.dataset-plot-details > summary::-webkit-details-marker {
  display: none;
  content: "";
}

details.dataset-plot-details > summary:before {
  content: "►";
  display: inline-block;
  margin-right: 6px;
  transition: transform 50ms 0s ease-in-out;
  /*
  transition-property: transform;
  transition-duration: 50ms;
  transition-delay: 0s;
  transition-timing-function: ease-in-out;
  */
}
details[open].dataset-plot-details > summary:before {
  content: "►";
  transform: rotate(90deg);
}
</style>