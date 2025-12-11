<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<template>
  <div
    ref="graph"
    :id="id"
    class="timeseries"
  >
  </div>
</template>


<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { onMounted, onBeforeUnmount, ref, watch, nextTick, onUnmounted, computed } from "vue";
import { v4 } from "uuid";
import Plotly, { PlotlyHTMLElement, newPlot, purge, restyle, relayout, type Data, type Datum, type PlotMouseEvent } from "plotly.js-dist-min";
import type { PlotlyGraphDataSet } from '../../types';
import { createErrorBands, filterNullValues, splitDatasetByGap, createErrorBars } from "./plotly_graph_elements";
import { cycle } from "@/utils/array_operations/array_math";

// https://stackoverflow.com/a/7616484
const generateHash = (string) => {
  let hash = 0;
  for (const char of string) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0; // Constrain to 32bit integer
  }
  return hash;
};

const hashDataset = (data: PlotlyGraphDataSet) => {
  const hash = JSON.stringify(data.x) + JSON.stringify(data.y); 
  //JSON.stringify(data.lower) + JSON.stringify(data.upper); // + JSON.stringify(data.errorType);
  return generateHash(hash).toString();
};

export interface PlotlyGraphProps {
  datasets: PlotlyGraphDataSet[];
  colors?: string[];
  showErrors?: boolean;
  dataOptions?: Partial<Data>[];
  errorBarStyles?: (Partial<Plotly.ErrorOptions> | null)[];
  names?: string[];
  layoutOptions?: Partial<Plotly.Layout>;
  configOptions?: Partial<Plotly.Config>;
  showZero?: boolean;
  xaxisTitle?: string;
  yaxisTitle?: string;
}

const props = withDefaults(defineProps<PlotlyGraphProps>(), {
  showZero: true,
});

const id = `timeseries-${v4()}`;

const plot = ref<PlotlyHTMLElement | null>(null);
const graph = ref<HTMLDivElement | null>(null);
let resizeObserver: ResizeObserver | null = null; // eslint-disable-line prefer-const

const emit = defineEmits<{
  // Datum is from type of x in DataSet
  (event: "click", value: {x: Datum, y: number, customdata: unknown}): void;
}>();

function datumToDate(datum: Datum): Date | null {
  if (datum === null) { return null; }
  if (datum instanceof Date) { return datum; }
  return new Date(datum);
}

const legendGroups: Record<string, string> = {};
let errorTraces: number[] = [];
const traceVisible = ref<Map<string, boolean>>(new Map());


const filterNulls = ref(true);  


const plotlyData = computed<Plotly.PlotData[]>(() => {
  errorTraces = [];
  
  const _plotlyData: Plotly.PlotData[] = [];
  if (props.datasets.length === 0) {
    console.error("No data provided for timeseries graph");
    return _plotlyData;
  }
  

  let max = 0;
  let min = Infinity;
  
  const datasets = props.datasets;
  
  // split into multiple traces if error bands are requested
  // the split should be per dataset, and the split should be on the day
  
  
  datasets.forEach((data, index) => {
    // create a hash from the data.x and data.y to be it's "id"
    data = filterNulls.value ? filterNullValues(data) : data;
    
    // check x, and have same length y
    if (!data.x || !data.y || data.x.length !== data.y.length) {
      console.error("Invalid dataset, skipping", data);
      return;
      // throw new Error(`Invalid dataset: x and y must be non-null and of same length. Lengths: x=${data.x?.length}, y=${data.y?.length}`);
    }
    
    const id = hashDataset(data);
    
    const validY = data.y.filter((v): v is number => v !== null);
    max = Math.max(max, Math.max(...validY));
    min = Math.min(min, Math.min(...validY));

    const legendGroup = v4();
    if (!traceVisible.value.has(id)) {
      traceVisible.value.set(id, true);
    }
    legendGroups[id] = legendGroup;
    
    const useErrorBands = data.errorType == 'band' && props.showErrors;
    
    (useErrorBands ? splitDatasetByGap(data) : [data]).forEach((data, jindex) => {
    
      /* start of plotly element creation */
      const errorOptions = {} as Record<'error_y',Plotly.ErrorBar>;
      
      // https://plotly.com/javascript/error-bars/
      if (props.showErrors && data.errorType === 'bar') {
        /* we cycle the styles if it is shorter, like matplotlib does */
        const style = cycle(index, props.errorBarStyles) || {};

        const options = {
          thickness: 1.5,
          width: 0,
          ...style,
        };
        const _e = createErrorBars(data, cycle(index, props.colors) ?? 'red', options);
        if (_e) {
          errorOptions['error_y'] = _e;
        } else {
          console.error(`No errors set for dataset index ${index} and name ${data.name}`,);
        } 
        
      }
      const datasetName = data.name || props.names?.[index] || `Dataset ${index + 1}`;
      
      const dataTraceOptions = {
        mode: "lines+markers",
        legendgroup: legendGroup,
        showlegend: jindex === 0,
        name: datasetName,
        marker: { color: cycle(index, props.colors) ?? 'red'},
        visible: traceVisible.value.get(id) ? true : "legendonly",
        ...errorOptions,
        ...(cycle(index, props.dataOptions) ?? {}),
        ...(data.datasetOptions ?? {}), // allow per-dataset options override
      };

      _plotlyData.push({
        x: data.x,
        y: data.y,
        ...dataTraceOptions
      } as Plotly.PlotData);
      
      const hasErrors = data.lower && data.upper && data.lower.length === data.y.length && data.upper.length === data.y.length;
      // double checking to have valid types
      if (hasErrors && data.errorType == 'band' && props.showErrors) {
        
        const {lower, upper, max: newMax, min: newMin} = createErrorBands(
          data,
          props.colors ? props.colors[index % props.colors.length] : 'red',
          datasetName,
          legendGroup,
        );

        max = Math.max(max, newMax);
        min = Math.min(min, newMin);

        if (lower === null || upper === null) {
          console.error("Error creating error bands for dataset", index, data);
          return;
        }
        
        const errorBandsVisible = traceVisible.value.get(id) ? true : "legendonly";
        lower['visible'] = errorBandsVisible;
        upper['visible'] = errorBandsVisible;
        
        _plotlyData.push(lower);
        errorTraces.push(_plotlyData.length - 1);

        _plotlyData.push(upper);
        errorTraces.push(_plotlyData.length - 1);
      }
      /* end of plotly element creation */
    });
    
    
  });
  console.log("legendGroups:", legendGroups);
  return _plotlyData;
});


const layout = computed<Partial<Plotly.Layout>>(() => {
  let max = 0;
  let min = Infinity;
  
  plotlyData.value.forEach((trace) => {
    const yValues = trace.y as (number | null)[];
    const validY = yValues.filter((v): v is number => v !== null);
    if (validY.length > 0) {
      max = Math.max(max, Math.max(...validY));
      min = Math.min(min, Math.min(...validY));
    }
  });

  const paddingFactor = 1.1;
  const axisMax = Math.max(1, paddingFactor * max);
  const axisMin = props.showZero ? Math.min(0, min) : min;

  return {
    ...(props.layoutOptions || {}),
    xaxis: {
      ...(props.layoutOptions?.xaxis || {}),
      ...(props.xaxisTitle ? {title: { text: props.xaxisTitle }} : {}),
    },
    yaxis: {
      range: [axisMin, axisMax],
      autorange: false,
      ...(props.layoutOptions?.yaxis || {}),
      ...(props.yaxisTitle ? {title: { text: props.yaxisTitle }} : {}),
    },
  };
});

function renderPlot() {
  newPlot(graph.value ?? id, plotlyData.value, layout.value, {...props.configOptions}).then((el: PlotlyHTMLElement) => {
    plot.value = el;
    el.on("plotly_click", (data: PlotMouseEvent) => {
      data.points.forEach(point => {
        const traceIndex = point.curveNumber;
        if (traceIndex !== 0 || point.x == null || point.y == null) {
          return;
        }
        const date = datumToDate(point.x);
        if (date !== null) {
          emit("click", {x: point.x, y: point.y as number, customdata: point.customdata} );
        }
      });
    });
    el.on('plotly_legendclick', (data) => {
      const trace = plotlyData.value[data.curveNumber];
      if (!trace) { 
        console.error("No trace for legend click", data);
        return true; 
      }
      // eslint-disable-next-line 
      // @ts-ignore legend group should exist. but guard anyway
      const group = trace.legendgroup as string;
      if (!group) { 
        console.error("No legend group for trace", trace);
        return true; 
      }
      const dataId = Object.keys(legendGroups).find(key => legendGroups[key] === group);
      if (!dataId) { 
        console.error("Could not find data ID for legend group", group);
        return true; 
      }
      const currentlyVisible = traceVisible.value.get(dataId) ?? true;
      traceVisible.value.set(dataId, !currentlyVisible);
      // if currently visible and errors are visible set stlye the error traces too
      nextTick(() => { // next tick so that updated traceVisible is available
        if (props.showErrors) {
          updateErrorDisplay(!currentlyVisible, group);
        }
      });
      return true;
    });
  });
}

function updateErrorDisplay(visible: boolean, legendGroup?: string) {
  if (graph.value) {
    errorTraces.forEach((traceIndex) => {
      const trace = plot.value?.data[traceIndex];
      if (!trace) return;
      if (!graph.value) return;
      // eslint-disable-next-line 
      // @ts-ignore legend group should exist. but guard anyway
      const group = trace.legendgroup as string;
      if (group === undefined) return;
      if (legendGroup && group !== legendGroup) return;
      const dataId = Object.keys(legendGroups).find(key => legendGroups[key] === group);
      if (dataId && traceVisible.value.get(dataId)) {
        restyle(graph.value, { visible: visible ? true : "legendonly" }, [traceIndex]);
      } 
    });
  }
}

function onResize() {
  if (graph.value && plot.value) {
    relayout(graph.value, {
      autosize: true
    });
  }
}

onMounted(() => {
  renderPlot();
  
  // Set up resize observer
  if (graph.value?.parentElement) {
    resizeObserver = new ResizeObserver(() => {
      onResize();
    });
    resizeObserver.observe(graph.value.parentElement);
  }
});


onUnmounted(() => {
  // Clean up resize observer
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  
  // Clean up Plotly instance
  if (graph.value) {
    purge(graph.value);
  }
  plot.value = null;
});



watch(() => props.showErrors, renderPlot);

watch(() => props.datasets, (_newData, _oldData) => {
  renderPlot();
}, { deep: true });

watch(() => props.showZero, renderPlot);

</script>

<style scoped>
.js-plotly-plot  {
  min-width: 30px;
}
</style>
