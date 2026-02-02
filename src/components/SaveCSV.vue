<template>
  <div v-if="json !== undefined" class="save-csv">
    <a ref="csvDownloadLink"
      style="display: none;"
      href="#"
      :download="datasetName ?? 'download.csv'"
      ></a>
    <v-btn
      class="save-csv__action"
      variant="text"
      density="compact"
      :disabled="json === undefined || url === ''"
      @click="downloadCsv"
      @keyup.enter="downloadCsv"
    >
      <v-icon v-if="url!==''" icon="mdi-table-arrow-down" color="#ffcc33" />
      <v-progress-circular
        v-else
        indeterminate
        size="16"
        width="2"
        color="#ffcc33"
      />
      <span class="save-csv__label">Download CSV</span>
    </v-btn>
    <use-clipboard v-slot="{ copy, isSupported }" :source="json">
      <v-btn
        class="save-csv__action"
        variant="text"
        density="compact"
        :disabled="!isSupported || json === undefined"
        @click="() => copy(clipboardCSV)"
        @keyup.enter="() => copy(clipboardCSV)"
      >
        <v-icon icon="mdi-clipboard-check-multiple" color="#ffcc33" />
        <span class="save-csv__label">Copy CSV to clipboard</span>
      </v-btn>
    </use-clipboard>
  </div>
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef, onUnmounted, ref, computed} from 'vue';
import { csv2FixedWidth, json2Csv, type SampleCSVJsonOutput } from '@/utils/data_converters';


export interface OutputOptions {
  delimiter: string; // default ','
  includeHeaders: boolean; // default true
  includeUnits: boolean; // default true
  includeMeta: boolean; // default true
  fixedWidth: boolean; // default false
}
interface SaveCsvProps {
  json: SampleCSVJsonOutput;
  datasetName?: string;
  fileOptions?: OutputOptions;
  clipboardOptions?: OutputOptions;
}

const props = withDefaults(defineProps<SaveCsvProps>(), {
  fileOptions: () => ({
    delimiter: ',',
    includeHeaders: true,
    includeUnits: true,
    includeMeta: true,
    fixedWidth: false,
  }),
  clipboardOptions: () => ({
    delimiter: '\t',
    includeHeaders: true,
    includeUnits: false,
    includeMeta: true,
    fixedWidth: false,
  }),
});


const fileCSV = computed(() => {
  if (props.fileOptions.fixedWidth === true) {
    console.log('Generating fixed width file');
    const csv = json2Csv(props.json.data, {...props.json, ...props.fileOptions, delimiter: '@@@@@',});
    return csv2FixedWidth(csv, '@@@@@', props.fileOptions.delimiter ?? '\t');
  }
  
  return json2Csv(
    props.json.data, 
    {...props.json, ...props.fileOptions}
  );
});

const clipboardCSV = computed(() => {
  if (props.fileOptions.fixedWidth === true) {
    console.log('Generating fixed width file');
    const csv = json2Csv(props.json.data, {...props.json, ...props.clipboardOptions, delimiter: '@@@@@',});
    return csv2FixedWidth(csv, '@@@@@', props.clipboardOptions.delimiter ?? '\t');
  }
  return json2Csv(
    props.json.data, 
    {...props.json, ...props.clipboardOptions}
  );
});

const csvDownloadLink = useTemplateRef<HTMLAnchorElement>('csvDownloadLink');
const url = ref<string>('');
  
onMounted(() => {
  if (csvDownloadLink.value && props.json !== undefined) {
    const blob = new Blob([fileCSV.value], { type: 'text/csv;charset=utf-8;' });
    url.value = URL.createObjectURL(blob);
    csvDownloadLink.value.href = url.value;
    // const uri = encodeURI(`data:text/csv;charset=utf-8,${csv}`);
    // csvDownloadLink.value.href = uri;
  }
});


function downloadCsv() {
  if (csvDownloadLink.value) {
    csvDownloadLink.value.click();
  }
}

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
