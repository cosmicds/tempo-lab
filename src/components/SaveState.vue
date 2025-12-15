<template>
  <v-card class="save-state">
    <v-card-title>Save/open</v-card-title>
    <h3>Save to:</h3>
    <div class="icon-row">
      <v-icon
        icon="mdi-file"
        :color="accentColor"
        @click="() => saveLocal()"
      />
      <v-icon
        icon="mdi-google-drive"
        :color="accentColor"
        disabled
      />
    </div>
    <h3>Open saved state:</h3>
    <div class="icon-row">
      <v-icon
        icon="mdi-file"
        :color="accentColor"
        @click="() => loadLocal()"
      />
      <v-icon
        icon="mdi-google-drive"
        :color="accentColor"
        disabled
      />
    </div>
  </v-card>
</template>


<script setup lang="ts">
import { storeToRefs } from "pinia";
import { type TempoStore, useTempoStore, serializeTempoStore, updateStoreFromJSON } from "@/stores/app";

const store = useTempoStore();

const {
  accentColor
} = storeToRefs(store);

type OpType = "save" | "load";
type Target = "local" | "google-drive";
type EventType = `${OpType}-${Target}`;

const emit = defineEmits<{
  (event: "save-local"): void;
  (event: "load-local"): void;
  (event: "save-google-drive"): void;
  (event: "load-google-drive"): void;
  (event: "error", type: EventType, message: string): void;
}>();

async function saveLocalFileSystemAPI(store: TempoStore): Promise<boolean> {
  const options = {
    suggestedName: "tempo_lab.json",
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
  return window.showSaveFilePicker(options)
    .then((handle: FileSystemFileHandle) => {
      handle.createWritable();
    })
    .then((stream: FileSystemWritableFileStream) => {
      stream.write(content);
      stream.close();
      return true;
    })
    .catch((error: Error) => {
      if (error instanceof DOMException) { return false; }
      emit("error", "save-local", error.message);
      return false;
    });

}

function saveLocalLink(store: TempoStore) {
  const content = serializeTempoStore(store);

  const blob = new Blob([content], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "tempo_lab.json";
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);

  return true;
}

async function saveLocal() {
  let result = false;
  if ('showSaveFilePicker' in window) {
    result = await saveLocalFileSystemAPI(store);
  } else {
    console.log("HERE");
    result = saveLocalLink(store);
  }
  if (result) {
    emit("save-local");
  }
}

async function loadLocalFileSystemAPI(): Promise<boolean> {

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore window *might* have this, and if we're here it should
  const handles: FileSystemFileHandle[] = await window.showOpenFilePicker();
  if (handles.length === 0) {
    return false;
  }

  const handle = handles[0];
  const file = await handle.getFile();
  const content = await file.text();

  try {
    updateStoreFromJSON(store, content);
    return true;
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    emit("error", "load-local", error.message);
    return false;
  }
}

function loadLocalInput() {
  const input = document.createElement("input");
  input.type = "file";

  input.addEventListener("change", function (event) {
    const element = event.target as HTMLInputElement;
    const files = element.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = function (evt) {
        if (!evt || !evt.target) { return; }
        const content = evt.target.result as string;
        try {
          updateStoreFromJSON(store, content);
          emit("load-local");
        } catch (error) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          emit("error", "load-local", error.message);
        }
      };
      reader.readAsText(file);
    }
  });

  input.click();

  return true;
}

async function loadLocal() {
  let result = false;
  if ('showOpenFilePicker' in window) {
    result = await loadLocalFileSystemAPI();
  } else {
    result = loadLocalInput();
  }
  if (result) {
    emit("load-local");
  }
}
</script>
