<template>
  <v-menu open-on-hover>
    <template #activator="{ props }">
      <v-btn
        icon
        v-bind="props"
        density="compact"
        flat
        :size="size"
      >
        <v-icon>mdi-information-variant-circle-outline</v-icon>
      </v-btn>
    </template>
    <v-card
      class="info-card"
      v-bind="cardProps"
    >
      <slot name="info">
        <v-card-text>{{ infoText }}</v-card-text>
      </slot>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
interface Props {
  infoText: string;
  size?: string | number;
  width?: string | number;
}

const props = withDefaults(defineProps<Props>(), {
  size: "small",
});

const cardProps: Record<string, string | number> = {};
if (props.width != undefined) {
  cardProps.width = props.width;
}
</script>

<style scoped>
.info-card {
  padding: 10px;
  border-radius: 5px;
}

.v-btn {
  background-color: transparent;
}
</style>
