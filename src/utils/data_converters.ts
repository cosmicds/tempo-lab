import type { 
  Prettify,
  UserDataset, 
  PlotlyGraphDataSet, 
  AggValue, 
  DataPointError, 
  RectangleSelection, 
  PointSelection 
} from '@/types';
import { toZonedTime } from 'date-fns-tz';
import tz_lookup from '@photostructure/tz-lookup';

class PlotlyDatasetBuilder {
  private _x: Date[];
  private _y: (number | null)[];
  private _lower: (number | null)[] | undefined;
  private _upper: (number | null)[] | undefined;
  private _length: number = 0;
  private _size: number;
  private hasErrors: boolean;
  public cleanOutput: boolean;
  private _skippedPoints: number = 0;

  constructor(size: number, hasErrors: boolean, cleanOutput: boolean = false) {
    this._size = size;
    this._x = new Array(size);
    this._y = new Array(size);
    this.hasErrors = hasErrors;
    this.cleanOutput = cleanOutput;
    if (hasErrors) {
      this._lower = new Array(size);
      this._upper = new Array(size);
    }
  }
  
  private get index() {return this._length;}
  
  private _addPointWithError(value: AggValue, error: DataPointError) {
    
    if (this.cleanOutput && value.value === null) {
      this._skippedPoints++;
      return;
    }
    
    this._x[this.index] = value.date;
    this._y[this.index] = value.value;
    // use "definite assignment assertion" since we know hasErrors is true
    this._lower![this.index] = error.lower;
    this._upper![this.index] = error.upper;
    this._length++;
  }
  
  private _addPointNoError(value: AggValue) {
    
    if (this.cleanOutput && value.value === null) {
      this._skippedPoints++;
      return;
    }
    
    this._x[this.index] = value.date;
    this._y[this.index] = value.value;
    this._length++;
  }
  
  addPoint(value: AggValue, error?: DataPointError) {
    if (this.hasErrors && error) {
      this._addPointWithError(value, error);
    } else {
      this._addPointNoError(value);
    }
  }
  
  build(name: string, errorType: 'band' | 'bar' = 'bar'): PlotlyGraphDataSet {
    if (this._length !== (this._size - this._skippedPoints)) {
      throw new Error(`Data length mismatch: expected ${this._size}, got only ${this._length}`);
    }
    const isFull = this._length === this._size;
    
    if (this.hasErrors) {
      return {
        x: isFull ? this._x : this._x.slice(0, this._length),
        y: isFull ? this._y : this._y.slice(0, this._length),
        lower: isFull ? this._lower : this._lower!.slice(0, this._length),
        upper: isFull ? this._upper : this._upper!.slice(0, this._length),
        errorType: errorType,
        name
      };
    } else {
      return {
        x: this._x,
        y: this._y,
        name
      };
    }
  }
}

function regionCenter(region: RectangleSelection | PointSelection): { lat: number; lon: number } {
  if (region.geometryType === 'point') {
    return { lat: region.geometryInfo.y, lon: region.geometryInfo.x };
  } else {
    const lat = (region.geometryInfo.ymin + region.geometryInfo.ymax) / 2;
    const lon = (region.geometryInfo.xmin + region.geometryInfo.xmax) / 2;
    return { lat, lon };
  }
}

export function userDatasetToPlotly(selection: Prettify<UserDataset>, useLocalTime: boolean = false): PlotlyGraphDataSet {
  if (!selection.samples) {
    return { x: [], y: [], name: '' };
  }
  
  const data = selection.samples;
  const hasErrors = !!selection.errors;
  const errors = selection.errors ??  {}; // so errors[key] is valid or undefined instead of an error
  const length = Object.keys(data).length;
  
  const plotlyBuilder = new PlotlyDatasetBuilder(length, hasErrors);
  let useTz = (c) => c; // identity function if no timezone
  
  if (useLocalTime) {
    const { lat, lon } = regionCenter(selection.region);
    const tz = tz_lookup(lat, lon);
    useTz = (d: Date) => toZonedTime(d, tz);
  }
  
  Object.keys(data).sort((a, b) => +a - +b).forEach((key) => {
    if (useLocalTime) {
      const value = { ...data[+key], date: useTz(data[+key].date) };
      plotlyBuilder.addPoint(value, errors[+key]);
    } else {
      plotlyBuilder.addPoint(data[+key], errors[+key]);
    }
  });

  return plotlyBuilder.build(selection.name || 'Dataset', 'bar');
}
  
  