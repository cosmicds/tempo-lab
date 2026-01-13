<script setup lang="ts">

interface Entry {
  name: string;
  label: string;
  color: string;
  text: string;
}
interface MiniOptions {
  colorIndices: number[];
  labelIndices: number[];
}
interface Props {
  data: Entry[];
  infoText: string;
  citation: string;
  mini?: boolean;
  miniOptions?: MiniOptions;
}
const { data, infoText, citation, mini = false, miniOptions } = defineProps<Props>();

const labelIndices = miniOptions ? miniOptions.labelIndices : [0, data.length - 1];
const colorIndices = miniOptions ? miniOptions.colorIndices : labelIndices;

</script>

<template>
<div class="tempods-legend-container">
  
  <div v-if="mini" class="mini-legend">
    <!-- Mini Legend -->
      <div 
        :class="`legend-label ll-${data[value].name}`" 
        v-for="(value) of colorIndices" 
        :style="{'--label-color': data[value].color, '--width': `calc(${100 / colorIndices.length}% - 2px)`}" 
        :key="data[value].name"
        >
        <dt v-if="labelIndices.includes(value)" class="legend-text">
          {{data[value].label}}
        </dt>
      </div>
    </div>
    
  
  <!-- Basic Legend -->
  <div v-if="!mini" class="short-legend">
    <div 
      v-for="item of data" 
      :class="`legend-label ll-${item.name}`" 
      :style="{'--label-color': item.color}" 
      :key="item.name"
      >
      <dt class="legend-text">{{item.label}}</dt>
    </div>
  </div>

  <!-- More Info -- full Legend w/ explanations -->
  <info-button v-if="!mini" max-width="80%" max-height="400px">
    <template #activator="props">
      <slot name="infoButton" :props="props">
      <a
        class="legend-more-details"
        href="#"
        role="button"
        v-bind="props"
      >
        {{ infoText }}
      </a>
    </slot>
    </template>
    <!-- add this class so that we can still use nesting :) -->

      <div class="long-legend">
        <div v-for="item of data" :class="`legend-label ll-${item.name}`" :style="{'--label-color': item.color}" :key="item.name">
          <dt class="legend-text">{{item.label}}</dt>
          <dd class="legend-text-detail"> {{ item.text }} </dd>
        </div>
      </div>

    <slot name="citation">
      <cite> {{ citation }} </cite>
    </slot>
  </info-button>
  
</div>
</template>

<style scoped>

  .legend-label {
    position: relative;
    margin: 0.25em;
    --space: 5px;
    padding: var(--space);
    padding-left: calc(1.5em + var(--space));
  }

  .legend-label::before {
    content: '';
    display: inline;
    width: 1em;
    height: 1em;
    position: absolute;
    left: var(--space);
    top: 50%;
    transform: translateY(-50%);
    box-shadow: 0px 0px 0px 1px white, 0px 0px 0px 3px black;
    color: var(--label-color);
    background-color: currentColor;
  }
  
  .legend-text {
    font-weight: normal;
  }
  .legend-text-detail {
    display: block;
    padding: 0;
    margin: 0;
  }
  
  /* mini-legend */
  .mini-legend {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    width: 100%;
    gap: 1em;
  }
  /* place the color block above */
  .mini-legend .legend-label {
    margin: 0;
    height: 3em;
  }
  .mini-legend .legend-label::before {
    display: block;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0px 0px 0px 1px white, 0px 0px 0px 3px black;
  }
  
  .mini-legend .legend-label .legend-text {
    font-size: 0.7em;
    position: absolute;
    top: 1.5em;
    left: 0;
    width: 100%;
    text-align: center;
  }

  
  
  .mini-label-row .legend-text:first-child {
    transform: translateX(-10%);
  }
  .mini-label-row .legend-text:last-child {
    transform: translateX(10%);
  }
  
  
  /* short legend */
  .short-legend {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
  }

  /* long legend */
  .long-legend {
    display: block;
    padding-left: 0.5em;
    margin: 1em;
  }

  .long-legend > .legend-label {
    border-bottom: 1px solid white;
    display: grid;
    grid-template-columns: minmax(auto, 100px) 1fr;
    column-gap: 1em;
    align-items: center;
    margin-bottom: 1.5em;
  }

  
  cite {
    font-size: 0.7em;
    color: gray;
  }
  a.legend-more-details {
    font-size: 0.8em;
    cursor: pointer;
    text-decoration: underline;
    color:rgb(175, 175, 175);
  }

</style>