<template>
<div class="dataset-plot-container">
  <h3 class="dataset-plot__title">{{ dataset.name }}</h3>
  <div class="dataset-plot">
    <div v-if="datasetIsFolded" class="dataset-plot__plot dataset-plot-folded">
    <FoldedPlotlyGraph
      :datasets="[dataset.plotlyDatasets![1]]"
      :show-errors="props.showErrors"
      :colors="[(dataset.customColor ?? dataset.region.color)]"
      :data-options="ddataOptions"
      :names="[dataset.name ?? dataset.id]"
      :layout-options="dlayoutOptions"
      :fold-type="dataset.folded?.foldType"
      :timezones="[dataset.folded.timezone ?? 'UTC']"
      :config-options="dconfigOptions"
      :yaxis-title="moleculeDescriptor(dataset.molecule).unit.html"
    />
    </div>
    <div v-else class="dataset-plot__plot dataset-plot-normal">
    <PlotlyGraph
      :datasets="[userDatasetToPlotly(dataset, true)]"
      :colors="[dataset.customColor || dataset.region.color]"
      :show-errors="showErrors"
      :data-options="ddataOptions"
      :names="[dataset.name ?? dataset.id]"
      :layout-options="{
        ...dlayoutOptions,
        xaxis: {...(dlayoutOptions?.xaxis ?? {}), title: {text: 'Local Time for Region'}},
      }"
      :config-options="dconfigOptions"
      :yaxis-title="moleculeDescriptor(dataset.molecule).unit.html"
    />
    </div>
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


interface UserDatasetPlotProps extends Omit<FoldedPlotlyGraphProps, 'datasets'| 'foldType' | 'timezones'> {
  dataset: UserDataset;
  hideLegend?: boolean;
}
const props = defineProps<UserDatasetPlotProps>();


// Common layout options for all plots
const dlayoutOptions = {
  margin: { t: 20, r: 30, b: 60, l: 80 },
  autosize: false,
  ...(props.layoutOptions ?? {}),
};

// Common config options for all plots
const dconfigOptions: Partial<Config> = {
  responsive: true,
  modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d', 'select2d'] as ModeBarDefaultButtons[],
  ...(props.configOptions ?? {}),
};

const ddataOptions = computed(() => {
  const defaultOpt = {showlegend: props.hideLegend ?? false};
  if (props.dataOptions && props.dataOptions.length > 0) {
    return props.dataOptions.map((opt) => ({...opt, ...defaultOpt}));
  } else {
    return [{...defaultOpt}];
  }
});

const isFolded = (d: UserDataset) => d.folded && d.plotlyDatasets;
const datasetIsFolded = computed(() => isFolded(props.dataset));

</script>

<style>
div.dataset-plot-container {
  width: 100%;
  display: flex;
  flex-direction: column;
}

div.dataset-plot {
  width: 100%;
}

div.dataset-plot__title {
  font-size: 0.8em;
}

div.dataset-plot__plot {
  width: 100%;
  height: 100%;
  margin-block: 4px;
  padding-inline: 5px;
  border-radius: 6px;
  background-color: rgba(0 0 0 / .25);
  font-size: 0.8em;
}
</style>
