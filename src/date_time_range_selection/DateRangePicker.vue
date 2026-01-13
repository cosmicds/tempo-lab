<template>
  <!-- TODO -- make the date pickers have sharper colors -->
  <div id="dual-date-range-picker">
    <div class="ddrp__picker mb-4">
      <label class="text-subtitle-2 mb-2 d-block">Start Date</label>
      <date-picker
        class="cds__date-picker"
        ref="startDateCalendar"
        :model-value="startDateObj"
        @internal-model-change="handleStartDateChange"
        :allowed-dates="allowedDates"
        :formats="{'input': format, 'preview': format }"
        :input-atters="{ clearable }"
        :text-input="textInput"
        :teleport="true"
        :dark="dark"
        :year-range="yearRange"
        :time-config="{ enableTimePicker: false }"
        :max-date="endDateObj ?? new Date()"
        :week-start="0"
        prevent-min-max-navigation
        six-weeks
      />
    </div>
    
    <div class="ddrp__picker mb-4">
      <label class="text-subtitle-2 mb-2 d-block">End Date</label>
      <date-picker
        class="cds__date-picker"
        ref="endDateCalendar"
        :model-value="endDateObj"
        @internal-model-change="handleEndDateChange"
        :allowed-dates="allowedDates"
        :formats="{input: format, preview: format}"
        :input-atters="{ clearable }"
        :teleport="true"
        :dark="dark"
        :year-range="yearRange"
        :time-config="{ enableTimePicker: false }"
        :min-date="startDateObj ?? new Date(0)"
        :week-start="0"
        prevent-min-max-navigation
        six-weeks
      />
    </div>
    
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';


const props = defineProps<{
  startDate?: Date | null;
  endDate?: Date | null;
  allowedDates?: Date[];
  formatFunction?: (date: Date) => string;
  clearable?: boolean;
  textInput?: boolean;
  teleport?: boolean;
  dark?: boolean;
  yearRange?: [number, number];
}>();

const format = (date: Date | null) => {
  if (date === null) {
    throw new Error('Date is null' );
  }
  if (props.formatFunction) {
    return props.formatFunction(date);
  }
  return date.toLocaleDateString();
};

const emit = defineEmits<{
  'update:startDate': [date: Date | null];
  'update:endDate': [date: Date | null];
}>();


const startDateCalendar = ref();
const endDateCalendar = ref();
const startDateObj = ref<Date | null>(props.startDate ?? null);
const endDateObj = ref<Date | null>(props.endDate ?? null);
const errMessage = ref<string>('');


function handleStartDateChange(value: Date | null) {
  if (value !== null && value.getTime() !== startDateObj.value?.getTime()) {
    if (endDateObj.value && value > endDateObj.value) {
      errMessage.value = 'Start date cannot be after end date.';
      return;
    }
    startDateObj.value = value;
    emit('update:startDate', value);
    startDateCalendar.value?.closeMenu();
  }
}

function handleEndDateChange(value: Date | null) {
  if (value !== null && value.getTime() !== endDateObj.value?.getTime()) {
    if (startDateObj.value && value < startDateObj.value) {
      errMessage.value = 'End date cannot be before start date.';
      return;
    }
    
    endDateObj.value = value;
    emit('update:endDate', value);
    endDateCalendar.value?.closeMenu();
  }
}




watch(() => props.startDate, (newDate) => {
  if (newDate?.getTime() !== startDateObj.value?.getTime()) {
    startDateObj.value = newDate ?? null;
  }
});

watch(() => props.endDate, (newDate) => {
  if (newDate?.getTime() !== endDateObj.value?.getTime()) {
    endDateObj.value = newDate ?? null;
  }
});

</script>

<style>
#dual-date-range-picker {
  width: 100%;
  display: flex;
  flex-direction: row;
  gap: 8px;
  flex-wrap: wrap;
}

#dual-date-range-picker > div.ddrp__picker {
  flex-basis: 48%;
  min-width: 150px;
}


</style>
