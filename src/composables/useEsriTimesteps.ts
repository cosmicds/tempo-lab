import { computed, toRef, ref, watch, type MaybeRef, onMounted } from "vue";

import { ESRI_URLS_V03, getEsriTimesteps, MoleculeType } from "../esri/utils";

const timestepCache: Record<MoleculeType, number[]> | object = {};

export function useEsriTimesteps(initialMolecule: MaybeRef<MoleculeType>, updateOnMount=true) {
  const molecule = toRef(initialMolecule);
  const url = computed(() => ESRI_URLS_V03[molecule.value].url);
  const variable = computed(() => ESRI_URLS_V03[molecule.value].variable);
  const loadingTimesteps = ref(false);
  const esriTimesteps = ref<number[]>([]);
  const error = ref<string | null>(null);

  async function updateEsriTimeSteps(): Promise<void> {
    if (timestepCache[molecule.value]) {
      esriTimesteps.value = timestepCache[molecule.value];
      return;
    }

    loadingTimesteps.value = true;
    return getEsriTimesteps(url.value, variable.value)
      .then(timesteps => {
        esriTimesteps.value = timesteps;
      })
      .catch((err: Error) => {
        console.error(`Error fetching ESRI time steps: ${err}`);
        error.value = err.message;
      });
  }

  if (updateOnMount) {
    onMounted(updateEsriTimeSteps);
  }

  watch(() => [url, variable], _newValues => {
    updateEsriTimeSteps();
  });

  return {
    molecule,
    url,
    variable,
    loadingTimesteps,
    esriTimesteps,
  };
}
