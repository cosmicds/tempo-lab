<template>
  <v-btn
  @click="onClick"
  @keyup.enter="onClick"
  icon="mdi-camera-outline"
  >
  </v-btn>
</template>

<script setup lang="ts">
import { downloadMap } from '@/utils/canvas_downloader';
import { type Map } from 'maplibre-gl';

interface MaplibreDownloadButtonProps {
  map: Map,
  filename: string
}

const props = defineProps<MaplibreDownloadButtonProps>();

const onClick = () => {
  downloadMap(props.map, props.filename);
};
</script>
