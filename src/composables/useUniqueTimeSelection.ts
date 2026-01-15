import { ref, computed, watch, Ref, nextTick } from 'vue';
import { getTimezoneOffset } from 'date-fns-tz';
import { getDayEnd, getDayStart } from '@/utils/calendar_utils';

const ONEDAYMS = 1000 * 60 * 60 * 24;

function isBad(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export const useUniqueTimeSelection = (timestamps: Ref<number[]>) => {
  const timeIndex = ref(0);
  const singleDateSelected = ref<Date>(new Date());
  const minIndex = ref<number>(0);
  const maxIndex = ref<number>(0);
  const multiDateSelected = ref<{start: Date | null, end: Date | null}>({ start: null, end: null });
  
  const mode = ref<'single' | 'range' | 'all'>('single');
  const initialTimeSelection = ref<'first' | 'last'>('first');

  function getOneDaysTimestamps(date: Date) {
    if (isBad(date)) {
      return [];
    }
    const mod = [] as {ts:number, idx: number}[];
    timestamps.value.forEach((ts, idx) => {
      if ((ts - date.getTime()) < ONEDAYMS && (ts - date.getTime()) > 0) {
        mod.push({ ts, idx });
      }
    });
    return mod;
  }
  
  function getRangeTimestamps(startDate: Date | null, endDate: Date | null) {
    if (isBad(startDate) || isBad(endDate)) {
      return [];
    }
    const mod = [] as {ts:number, idx: number}[];
    timestamps.value.forEach((ts, idx) => {
      if ((ts >= getDayStart(startDate).getTime()) && (ts <= getDayEnd(endDate).getTime())) {
        mod.push({ ts, idx });
      }
    });
    return mod;
  }
  

  
  function getAllDaysTimestamps(date: Date) {
    if (isBad(date)) {
      return [];
    }
    return timestamps.value.map((ts, idx) => ({ ts, idx }));
  }
  


  function setNearestDate(date: number | null) {
    if (date == null) {
      return;
    }

    const mod = mode.value === 'single' ? getOneDaysTimestamps(new Date(date)) : getAllDaysTimestamps(new Date(date));
    if (mod.length > 0) {
      console.log("setNearestDate: ", date);
      minIndex.value = mod[0].idx;
      maxIndex.value = mod[mod.length - 1].idx;
      timeIndex.value = initialTimeSelection.value === 'first' ? minIndex.value : maxIndex.value;
    } else {
      console.warn("No timestamps found for the given date.");
    }
  }
  

  function setNearestDateRange(multi: typeof multiDateSelected.value) {
    const validStart = multi.start !== null;
    const validEnd = multi.end !== null;
    const same = multi.start === multi.end;
    const multiDateValid = validStart && validEnd;
    let mod = [] as {ts:number, idx: number}[];
    if (mode.value === 'range' && multiDateValid ) {
      mod = getRangeTimestamps(multi.start, multi.end);
    } else {
      const d = multi.start ?? multi.end ?? singleDateSelected.value;
      console.error(`multiDateSelected is not valid. Falling back to single date ${d}`);
      console.error(`validStart: ${validStart} validEnd: ${validEnd} !same: ${!same}`);
      // mod = getOneDaysTimestamps(d);
      throw new Error("multiDateSelected is not valid for range mode");
    }

    if (mod.length > 0) {
      console.log("setNearestDateRange: ", multi);
      minIndex.value = mod[0].idx;
      maxIndex.value = mod[mod.length - 1].idx;
      timeIndex.value = initialTimeSelection.value === 'first' ? minIndex.value : maxIndex.value;
    } else {
      console.warn("No timestamps found for the given date.");
    }
  }

  const timestamp = computed(() => {
    if (timestamps.value.length === 0) {
      return null;
    }
    const val = timestamps.value[timeIndex.value];
    return val;
  });
  
  watch(timeIndex, (newIndex) => {
    if (mode.value !== 'single') {
      // keep singleDateSelected in sync with timeIndex
      const ts = timestamps.value[newIndex];
      singleDateSelected.value = getDayStart(new Date(ts));
    }
  });

  const date = computed(() => {
    return timestamp.value ? new Date(timestamp.value) : null;
  });

  const offset = (date: Date) => getTimezoneOffset("US/Eastern", date);

  const uniqueDays = computed(() => {
    const easternDates = timestamps.value.map(ts => new Date(ts + offset(new Date(ts))));
    const days = easternDates.map(date => (new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).getTime());
    const unique = Array.from(new Set(days));
    return unique.map(ts => new Date(ts));
  });

  const uniqueDaysIndex = (ts: number) => {
    let date = new Date(ts + offset(new Date(ts)));
    date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return uniqueDays.value.map(e => e.getTime()).indexOf(date.getTime());
  };

  function getUniqueDayIndex(date: Date | null | undefined): number {
    if (isBad(date)) {
      return 0;
    }
    return uniqueDays.value.findIndex(day => day.getTime() === date.getTime());
  }

  function moveBackwardOneDay() {
    const currentIndex = getUniqueDayIndex(singleDateSelected.value);
    if (currentIndex > 0) {
      singleDateSelected.value = uniqueDays.value[currentIndex - 1];
    }
  }

  function moveForwardOneDay() {
    const nextIndex = getUniqueDayIndex(singleDateSelected.value) + 1;
    if (nextIndex < uniqueDays.value.length) {
      singleDateSelected.value = uniqueDays.value[nextIndex];
    }
  }

  function nearestDate(date: Date): number {
    const time = date.getTime();
    const timestamp = timestamps.value.find(ts => ((ts - time) < ONEDAYMS) && (ts - time) >= 0);
    if (timestamp !== undefined) {
      return timestamp;
    } else {
      console.warn("No matching timestamp found, returning default value.");
      return timestamps.value[0];
    }
  }

  function nearestDateIndex(date: Date): number {
    const timestamp = date.getTime();
    const index = timestamps.value.findIndex(ts => ((ts - timestamp) < ONEDAYMS) && (ts - timestamp) >= 0);
    if (index < 0) {
      console.log("No matching timestamp found, returning default index.");
      return 0;
    }
    return index;
  }
  
    
  /**
   * setNearestTime function will set the timeIndex to the nearest timestamp for the given date
   * it will also setup the minIndex and maxIndex for the day, and singleDateSelected to the date
   */
  function setNearestTime(date: Date | null) {
    if (isBad(date)) {
      return;
    }
    // check if same day as singleDateSelected
    let selectedDate = singleDateSelected.value;
    const sameDay = (selectedDate.getFullYear() === date.getFullYear() &&
        selectedDate.getMonth() === date.getMonth() &&
        selectedDate.getDate() === date.getDate());
    if (!sameDay) {
      selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      // check that it is in uniqueDays
      const uniqueDayIndex = getUniqueDayIndex(selectedDate);
      if (uniqueDayIndex >= 0) {
        singleDateSelected.value = uniqueDays.value[uniqueDayIndex];
      } else {
        throw new Error("Date not found in unique days");
      }
    }
    // want to set timeIndex to nearest timestamp for that day
    nextTick(() => {
      const index = nearestDateIndex(date);
      timeIndex.value = index;
      console.log("setNearestTime: set timeIndex to ", index, selectedDate);
    });
    
  }
  


  watch(singleDateSelected, (value) => {
    if (value && (mode.value === 'single' || mode.value === 'all')) { 
      setNearestDate(value.getTime());
    }
  });
  
  watch(multiDateSelected, (value) => {
    if (value && mode.value === 'range') {
      console.log(`multiDateSelected changed to`, value);
      setNearestDateRange(value);
    }
  }, { deep: true});
  
  watch(mode, (m) => {
    if (m === 'single' || m === 'all') setNearestDate(singleDateSelected.value.getTime());
    if (m === 'range') {
      if (multiDateSelected.value.start == null && multiDateSelected.value.end == null) {
        multiDateSelected.value.start = singleDateSelected.value;
        multiDateSelected.value.end = singleDateSelected.value;
      }
      setNearestDateRange(multiDateSelected.value);
    }
  });

  watch(timestamps, (newTimestamps) => {
    if (newTimestamps.length === 0) {
      timeIndex.value = 0;
      minIndex.value = 0;
      maxIndex.value = 0;
      return;
    }
    // Reset to first date if current date is out of range
    if (timeIndex.value == null || timeIndex.value >= newTimestamps.length) {
      timeIndex.value = 0;
      singleDateSelected.value = new Date(newTimestamps[0]);
    } else {
      if (mode.value === 'range') {
        if (multiDateSelected.value.start == null && multiDateSelected.value.end == null) {
          multiDateSelected.value.start = singleDateSelected.value;
          multiDateSelected.value.end = singleDateSelected.value;
        }
        
        setNearestDateRange(multiDateSelected.value);
      } else {
        setNearestDate(singleDateSelected.value.getTime());
      }
    }
  }, { immediate: true });

  return {
    timeIndex,
    timestamp,
    date,
    singleDateSelected,
    multiDateSelected,
    maxIndex,
    minIndex,
    uniqueDays,
    mode,
    initialTimeSelection,
    uniqueDaysIndex,
    setNearestDate,
    getUniqueDayIndex,
    moveBackwardOneDay,
    moveForwardOneDay,
    nearestDate,
    nearestDateIndex,
    setNearestTime,
    setNearestDateRange,
  };
};
