<template>
  <a
    v-if="csv !== undefined"
    ref="csvDownloadLink"
    href="#"
    :download="datasetName ?? 'download.csv'"
  >
    <v-icon
      icon="mdi-file-download"
      color="#ffcc33"
      :disabled="csv === undefined"
    />
    <span style="word-wrap: nowrap">
    Download Dataset as a .CSV (comma-specified values) file
    </span>
  </a>  
    
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef, onUnmounted, ref} from 'vue';

const { csv } = defineProps<{
  csv: string;
  datasetName?: string;
}>();


const csvDownloadLink = useTemplateRef<HTMLAnchorElement>('csvDownloadLink');
const url = ref<string>('');
  
onMounted(() => {
  if (csvDownloadLink.value && csv !== undefined) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    url.value = URL.createObjectURL(blob);
    csvDownloadLink.value.href = url.value;
    // const uri = encodeURI(`data:text/csv;charset=utf-8,${csv}`);
    // csvDownloadLink.value.href = uri;
  }
});


onUnmounted(() => {
  if (url.value !== '') {
    URL.revokeObjectURL(url.value);
  }
});


// function saveCsv() {
//   if (csv === undefined) return;
//   const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
//   const link = document.createElement('a');
//   const url = URL.createObjectURL(blob);
//   link.href = url;
//   link.download = `dataset_${new Date() .toLocaleString()}.csv`;
//   link.style.visibility = 'hidden';
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);
//   URL.revokeObjectURL(url);
// }

</script>

<style scoped>
</style>