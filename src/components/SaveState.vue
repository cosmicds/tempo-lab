<template>
  <v-card class="save-state">
    <v-card-title>How would you like to save?</v-card-title>
    <v-list>
      <v-list-item
        title="Local file"
        @click="() => saveLocal()"
      >
      </v-list-item>
      <v-list-item
        title="Google Drive"
      >
      </v-list-item>
    </v-list>
  </v-card>
</template>


<script setup lang="ts">
import { type TempoStore, useTempoStore, serializeTempoStore } from "@/stores/app";

const store = useTempoStore();

function saveLocalFileSystemAPI(store: TempoStore) {
  const options = {
    types: [
      {
        description: "JSON",
        accept: { "application/json": [".json"] },
      }
    ],
    multiple: false,
  };

  const content = serializeTempoStore(store);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore window *might* have this, and if we're here it should
  window.showSaveFilePicker(options)
    .then((handle: FileSystemFileHandle) => handle.createWritable())
    .then((stream: FileSystemWritableFileStream) => {
      console.log(content);
      stream.write(content);
      stream.close();
    })
    // TODO: Show an error message in the UI
    .catch(error => console.log(error));
}

function saveLocalLink(store: TempoStore) {
  const content = serializeTempoStore(store);

  const blob = new Blob([content], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "tempo_lab_state.json";
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function saveLocal() {
  if ('showSaveFilePicker' in window) {
    saveLocalFileSystemAPI(store);
  } else {
    saveLocalLink(store);
  }
}
</script>
