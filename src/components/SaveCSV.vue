<template>
  <div v-if="csv !== undefined" class="save-csv">
    <a
      ref="csvDownloadLink"
      href="#"
      :download="datasetName ?? 'download.csv'"
      class="save-csv__action"
    >
      <v-icon
        icon="mdi-table-arrow-down"
        color="#ffcc33"
        :disabled="csv === undefined"
      />
      <span class="save-csv__label">
        Download Table
      </span>
    </a>
    <use-clipboard v-slot="{ copy, isSupported }" :source="csv">
      <v-btn
        class="save-csv__action"
        variant="text"
        density="compact"
        :disabled="!isSupported || csv === undefined"
        @click="() => copy(csv)"
      >
        <v-icon icon="mdi-clipboard-check-multiple" color="#ffcc33" />
        <span class="save-csv__label">Copy CSV to clipboard</span>
      </v-btn>
    </use-clipboard>
  </div>
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
.save-csv {
  display: inline;
  flex-direction: column;
  gap: 0.25rem;
}

.save-csv__action {
  display: inline;
  text-decoration: none;
  text-transform: none;
  font-size: 1em;
}

.save-csv__label {
  white-space: nowrap;
}
</style>
