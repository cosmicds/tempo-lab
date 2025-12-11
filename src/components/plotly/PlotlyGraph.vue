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
const legendGroupVisible = ref<Map<string, boolean>>(new Map());


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

    // const legendGroup = v4();
    const legendGroup = `legend-group-${index}`;
    if (!legendGroupVisible.value.has(legendGroup)) {
      legendGroupVisible.value.set(legendGroup, true);
    }
    legendGroups[id] = legendGroup;
    
    const useErrorBands = data.errorType == 'band' && props.showErrors;
    
    (useErrorBands ? splitDatasetByGap(data) : [data]).forEach((data, jindex) => {
    
      /* start of plotly element creation */
      const errorOptions = {} as Record<'error_y',Plotly.ErrorBar>;
      
      // https://plotly.com/javascript/error-bars/
      if (data.errorType === 'bar') {
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
          errorOptions['error_y']['visible'] = props.showErrors ;

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
        visible: legendGroupVisible.value.get(legendGroup) ? true : "legendonly",
        ...errorOptions,
        ...(cycle(index, props.dataOptions) ?? {}),
        ...(data.datasetOptions ?? {}), // allow per-dataset options override
        meta: { hasErrorBar: errorOptions['error_y'] ? true : false },
      };

      _plotlyData.push({
        x: data.x,
        y: data.y,
        ...dataTraceOptions
      } as Plotly.PlotData);
      
      const hasErrors = data.lower && data.upper && data.lower.length === data.y.length && data.upper.length === data.y.length;
      // double checking to have valid types
      if (hasErrors && data.errorType == 'band') {
        
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
        
        const errorBandsVisible = legendGroupVisible.value.get(legendGroup) ? true : false;
        lower['visible'] =  errorBandsVisible && props.showErrors;
        upper['visible'] =  errorBandsVisible && props.showErrors;
        // make these identifiable as error bands
        lower['meta'] = { isErrorBand: true };
        upper['meta'] = { isErrorBand: true };
        
        _plotlyData.push(lower);
        errorTraces.push(_plotlyData.length - 1);

        _plotlyData.push(upper);
        errorTraces.push(_plotlyData.length - 1);
      }
      /* end of plotly element creation */
    });
    
    
  });
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

function getTraceGroupVisibility(trace: Plotly.PlotData): {group: string | undefined, dataId: string | undefined, visibility: boolean} {
  let group: string | undefined = undefined;
  let dataId: string | undefined = undefined;
  
  group = trace.legendgroup as string;
  
  dataId = Object.keys(legendGroups).find(key => (group && legendGroups[key] === group));
  // if it has a visibility setting, use it
  return {group, dataId, visibility: dataId ? legendGroupVisible.value.get(group) ?? true : true };
}



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
      const trace = plot.value?.data[data.curveNumber] as Plotly.PlotData;
      if (!trace) { 
        console.error("No trace for legend click", data);
        return true; 
      }
      
      const {group, dataId, visibility: currentlyVisible} = getTraceGroupVisibility(trace);
      if (!dataId || !group) {
        console.error(`No ${!dataId ? 'dataId' : 'group'} for legend click trace`, trace);
        return true;
      }
      
      nextTick(() => updateLegendGroupErrorVisibility(group, !currentlyVisible));
      
      
      return true;
    });
  });
}

type DataWithMeta = Plotly.PlotData & { meta?: Record<string, unknown> };

function setErrorVisibilityForTrace(trace: DataWithMeta, visible: boolean, index: number) {
  if (!graph.value) return;
  
  // check index and trace match
  const traceIndex = (plot.value?.data as DataWithMeta[]).indexOf(trace);
  if (traceIndex !== index) {
    console.error("Trace index mismatch:", index, traceIndex, trace);
    return;
  }
  if (trace.meta?.isErrorBand) {
    // here we need to use the 'false' instead of 'legendonly'
    restyle(graph.value, { visible: visible }, index);
    return;
  }
  
  if (trace.meta?.hasErrorBar) {
    const update = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'error_y' : visible ? {...plotlyData.value[index]['error_y'], visible: visible } : {}
    } as Data;
    restyle(graph.value, update, index);
  }
}

function updateLegendGroupErrorVisibility(legendGroup: string, visible: boolean) {
  legendGroupVisible.value.set(legendGroup, visible);

  if (graph.value) {    
    (plot.value?.data as DataWithMeta[]).forEach((trace, index) => {
      if (!graph.value) return;
      const group = trace.legendgroup as string;
      if (group !== legendGroup) return;
      
      setErrorVisibilityForTrace(trace, (visible && props.showErrors), index);
    });
  } else {
    console.error("No graph element to update error band visibility");
  }
}


function updateAllErrorVisibility(visible: boolean) {
  if (graph.value) {    
    (plot.value?.data as DataWithMeta[]).forEach((trace, index) => {
      if (!graph.value) return;
      
      const {group, dataId, visibility} = getTraceGroupVisibility(trace as Plotly.PlotData);
        
      if (!dataId) {
        console.error("No dataId for trace, skipping", index, trace);
        return;
      }
    
      setErrorVisibilityForTrace(trace, (visibility && visible), index);
    });
  } else {
    console.error("No graph element to update error band visibility");
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



watch(() => props.showErrors, updateAllErrorVisibility);



watch(() => props.datasets.map(d => d.errorType), (_newData, _oldData) => {
  // if (graph.value) {
  //   plotlyData.value.forEach(d => Plotly.update(graph.value!, d, {}));
    
  // }
  renderPlot();
}, { deep: true });

watch(() => props.showZero, renderPlot);

</script>

<style scoped>
.js-plotly-plot  {
  min-width: 30px;
}
</style>
