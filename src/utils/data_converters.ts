import type { 
  Prettify,
  UserDataset, 
  PlotlyGraphDataSet, 
  AggValue, 
  DataPointError, 
  UnifiedRegion
} from '@/types';
import { toZonedTime } from 'date-fns-tz';
import tz_lookup from '@photostructure/tz-lookup';
import { camelToSnake } from './text';

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

export function regionCenter(region: UnifiedRegion): { lat: number; lon: number } {
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
  

interface OutputTimeSeriesFormat {
  utcDateTime: string;
  localDateTime: string;
  localDate: string;
  localTime: string;
  columnDensity: number | null;
  uncertainty: number | null;
  timezone: string;
  utcOffsetHours: number;
}

const toDate = (date: Date, tz: string) => date.toLocaleDateString(undefined, {dateStyle: 'medium', timeZone: tz}).replace(',', '');
const toTime = (date: Date, tz: string) => date.toLocaleTimeString(undefined, {
  hour12:true, hour:'numeric', minute: '2-digit', second:'2-digit',
  timeZone: tz,
});
function dateToStrings(date: Date, tz: string) {
  const utcDateTime = toDate(date, 'UTC') + ' ' + toTime(date, 'UTC');
  const utcOffsetHours = -date.getTimezoneOffset() / 60;
  const localDate = toDate(date, tz);
  const localTime = toTime(date, tz);
  const localDateTime = `${localDate} ${localTime}`;
  return { 
    utcDateTime,
    localDateTime, 
    localDate, 
    localTime, 
    utcOffsetHours, 
  };
}

function dateToCODAPStrings(date: Date, tz: string) {
  // CODAP wants MM/DD/YYY, HH:MM:SS AM/PM in UTC, we'll still do utc and local
  const utcDateTime = date.toLocaleString('en-US', {
    "dateStyle": "short",
    "timeStyle": "medium",
    timeZone: 'UTC',
  }).replace(',', '');
  const localDateTime = date.toLocaleString('en-US', {
    "dateStyle": "short",
    "timeStyle": "medium",
    timeZone: tz, 
  }).replace(',', '');
  const [localDate, localTime] = localDateTime.split(' ');
  const utcOffsetHours = -date.getTimezoneOffset() / 60;
  return { 
    utcDateTime,
    localDateTime, 
    localDate, 
    localTime, 
    utcOffsetHours, 
  };
}

export function samplesToJson(dataset: Prettify<UserDataset>, codapFormat = true): OutputTimeSeriesFormat[] {
  if (!dataset.samples) {
    return [];
  }
  
  const samples = dataset.samples;
  const errors = dataset.errors;
  const center = regionCenter(dataset.region);
  const tz = tz_lookup(center.lat, center.lon);
  
  if (samples === undefined) {
    throw new Error('No samples in dataset');
  }
  
  return Object.entries(samples)
    .map( ([key, sample]) => ({  
      columnDensity: sample.value,
      uncertainty: errors && errors[+key] ? errors[+key]?.upper : null,
      timezone: tz,
      ...(codapFormat ? dateToCODAPStrings(sample.date, tz) : dateToStrings(sample.date, tz)),
    }));
}

function _toSafeString(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }
  return `${val}`;
}

export function samplesToCsv(dataset: Prettify<UserDataset>, codapFormat = true): string {
  const jsonData = samplesToJson(dataset, codapFormat);
  if (jsonData.length === 0) {
    return '';
  }
  
  const headers = [
    'utcDateTime',
    'localDateTime',
    'localDate',
    'localTime',
    'columnDensity',
    'uncertainty',
    'timezone',
    'utcOffsetHours',
  ];
  
  const rows = jsonData.map(row => headers.map(h => _toSafeString(row[h])));
  
  const csvRows = [
    headers.map(h => camelToSnake(h)).join(','), // header row
    ...rows.map(r => r.join(',')) // data rows
  ];
  
  return csvRows.join('\n');
}



// interface OutputFoldedSeriesFormat {
//   [key: string] : number; // this is our folded index
// }