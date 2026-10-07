<template>
  <div class="slider-row mt-12">
      <div class="ml-8 mr-4 align-self-center">
        <icon-button
          class="play-pause"
          :fa-icon="playing ? 'pause' : 'play'"
          fa-size="sm"
          @activate="playing = !playing"
        ></icon-button>
      </div>
      <v-slider
        :class='[
          "time-slider",
          maxIndex <= minIndex ? "hide-first-last-ticks" : "",
          maxIndex < minIndex + 7 ? `hide-ticks-${minIndex + 7 - maxIndex}` : "",
          ]'
        :disabled="maxIndex <= minIndex"
        v-model="timeSliderIndex"
        :min="minIndex"
        :max="Math.max(minIndex + 7, maxIndex)"
        :step="1"
        color="#068ede95"
        thumb-label="always"
        :track-size="10"
        show-ticks="always"
        hide-details
        @end="() => {
          timeSliderUsedCount += 1;
          // if (map) {
          //   setLayerVisibility(map as Map, activeLayer, true);
          // }
        }"
      >
        <template v-slot:thumb-label>
          <div class="thumb-label">
            {{ thumbLabel }}
          </div>
        </template>
      </v-slider>
      
      <div class="playback-rate-control ml-4">
        <select
          id="playback-rate-select"
          v-model="playingRate"
          class="playback-rate-select"
          name="playback-rate"
        >
          <option v-for="rate in playRateOptions" :key="rate" :value="rate">
            {{ rate.toFixed(2) }}x
          </option>
        </select>
        <!-- visually hidden prefix so the accessible name reads
             "Playback rate, sec/frame" while the visible text stays compact -->
        <label class="playback-rate-label" for="playback-rate-select">
          <span class="visually-hidden">Playback rate, </span>
        </label>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useTempoStore } from "@/stores/app";
import { getTimezoneOffset } from "date-fns-tz";

const store = useTempoStore();
const {
  date,
  timestamp,
  timeIndex,
  minIndex,
  maxIndex,
  timeSliderUsedCount,
  selectedTimezone,
  playButtonClickedCount
} = storeToRefs(store);

// The slider always spans at least 7 steps so that a handful of times get
// spread out along the track instead of being bunched at the left edge.
// The extra steps past maxIndex are inert (ticks hidden, value clamped).
const timeSliderIndex = computed({
  get() {
    return timeIndex.value;
  },
  set(value: number) {
    if (value > maxIndex.value) {
      return;
    }
    timeIndex.value = value;
  }
});

// TODO: Maybe there's a built-in Date function to get this formatting?
const thumbLabel = computed(() => {
  if (date.value === null || timestamp.value === null) {
    return '';
  }
  const offset = getTimezoneOffset(selectedTimezone.value, date.value);
  const dateObj = new Date(timestamp.value + offset);
  const hours = dateObj.getUTCHours();
  const amPm = hours >= 12 ? "PM" : "AM";
  let hourValue = hours % 12;
  if (hourValue === 0) {
    hourValue = 12;
  }
  return `${date.value.getUTCMonth() + 1}/${dateObj.getUTCDate()}/${dateObj.getUTCFullYear()} ${hourValue}:${dateObj.getUTCMinutes().toString().padStart(2, '0')} ${amPm}`;
});

type Timeout = ReturnType<typeof setTimeout>;

const playing = ref(false);
const playInterval = ref<Timeout | null>(null);
const playRateOptions = [.25, .5, .75, 1, 1.5] as const;
const playingRate = ref(1);
  
  
watch(playing, (val: boolean) => {
  if (val) {
    play();
    playButtonClickedCount.value += 1;
  } else {
    pause();
  }
});

function play() {
  playInterval.value = setInterval(() => {
    if (timeIndex.value >= maxIndex.value) {
      if (playInterval.value) {
        // clearInterval(this.playInterval);
        // this.playInterval = null;
        // let it loop
        timeIndex.value = minIndex.value;
      }
    } else {
      timeIndex.value += 1;
    }
  }, 1000 / playingRate.value);
}


function pause() {
  if (playInterval.value) {
    clearInterval(playInterval.value);
  }
}

watch(playingRate, () => {
  if (playing.value) {
    pause();
    play();
  }
});


</script>

<style lang="less">
.slider-row {
  display: flex;
  flex-direction: row;
  padding-left: 0;
}

.slider-row > .play-pause {
  height: fit-content;
  align-self: center;
  padding-inline: 0.5rem;
  margin-left: 0.75rem;
  width: 2.5rem;
  color: var(--accent-color);
  border: 2px solid var(--accent-color);
}
  
.play-pause[disabled] {
  filter: grayscale(100%);
  cursor: progress;
  cursor: not-allowed;
}

.playback-rate-select {
  border: 1px solid #fff;
  border-radius: 4px;
  text-align: center;
  margin-right: 4px;
  padding-inline: 5px;
}

.playback-rate-control {
  position: relative;
  align-self: center;
}

.playback-rate-label {
  color: #f2f2f2;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
}

.time-slider {

  .v-slider-thumb {

    .v-slider-thumb__surface::after {
      background-image: url("@/assets/smithsonian.png");
      background-size: 30px 30px;
      height: 30px;
      width: 30px;
    }

    .v-slider-thumb__label {
      background-color: var(--accent-color-2);
      border: 0.25rem solid var(--accent-color);
      width: max-content;
      height: 2.5rem;
      font-size: 1rem;

      &::before {
        color: var(--accent-color);
      }
    }
  }

  .v-slider-track__tick {
    background-color: var(--accent-color);
    /* Change color */
    height: 15px;
    /* Change size */
    width: 4px;
    margin-top: 0 !important;
    // top: -10%;
  }


  &.hide-ticks-1 .v-slider-track__tick:nth-last-child(-n + 1),
  &.hide-ticks-2 .v-slider-track__tick:nth-last-child(-n + 2),
  &.hide-ticks-3 .v-slider-track__tick:nth-last-child(-n + 3),
  &.hide-ticks-4 .v-slider-track__tick:nth-last-child(-n + 4),
  &.hide-ticks-5 .v-slider-track__tick:nth-last-child(-n + 5),
  &.hide-ticks-6 .v-slider-track__tick:nth-last-child(-n + 6),
  &.hide-ticks-7 .v-slider-track__tick:nth-last-child(-n + 7)
  {
    display: none !important;
  }

  .v-slider {

    .v-slider.v-input--horizontal {
      grid-template-rows: auto 0px;
    }

    .v-slider.v-input--horizontal .v-slider-thumb__label {
      // top: calc(var(--v-slider-thumb-size) * 1.5);
      z-index: 2000;
    }

    .v-slider.v-input--horizontal .v-slider-thumb__label::before {
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 6px solid transparent;
      border-top: 6px solid currentColor;
      bottom: -15px;
    }
  }
}

.time-slider.hide-first-last-ticks.v-input--disabled {
    .v-slider__container {
      opacity: 100 !important;
    }

    .v-slider-track__tick--first,
    .v-slider-track__tick--last {
      display: none;
  }
}
</style>