
import type { PlotlyGraphDataSet } from '../../types';
import { nanmean } from "@/utils/array_operations/array_math";

function normalizeBadValue(v: number | null | undefined): number | null {
  if (v === null || v === undefined || isNaN(v)) {
    return null;
  }
  return v;
}

import { deepMerge } from "./plotly_styles";

export function createErrorBands(data: PlotlyGraphDataSet, color: string, datasetName: string, legendGroup: string, options: object = {}) {
  if (!data.upper || !data.lower) return {lower: null, upper: null, max: 0, min: 0};
      
  const upperY: (number | null)[] = [];
  const lowerY: (number | null)[] = [];
  let max = 0;
  let min = 0;
    
  data.y.forEach((y, idx) => {
    if (y === null) {
      lowerY.push(null);
      upperY.push(null);
      return;
    }
        
    if (data.upper === undefined) {
      upperY.push(null);
    } else {
      const high = y + (data.upper[idx] ?? nanmean(data.upper) ?? 0);
      upperY.push(high);
      max = Math.max(max, high !== null ? high : 0);
    }
        
    if (data.lower === undefined) {
      lowerY.push(null);
    } else {
      const low = y - (data.lower[idx] ?? nanmean(data.lower) ?? 0);
      lowerY.push(low);
      min = Math.min(min, low !== null ? low : 0);
          
    }
        
        
  });
  // console.log({lowerY, upperY});
  const traceErrorOptions = {
    x: data.x,
    mode: "lines",
    line: { width: 0 },
    showlegend: false,
    legendgroup: legendGroup,
    name: datasetName,
    marker: { color: color ?? 'red' },
  };
      
  return {
    lower:{
      y: lowerY.map(normalizeBadValue),
      ...deepMerge(traceErrorOptions, options),
    },
    upper:{
      y: upperY.map(normalizeBadValue),
      ...deepMerge(traceErrorOptions, options),
      fill: "tonexty",
    },
    max,
    min

  };
    
}
