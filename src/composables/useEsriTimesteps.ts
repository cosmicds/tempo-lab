import { toRef, ref, watch, type MaybeRef, onMounted } from "vue";

import { MoleculeType } from "../esri/utils";
import { useTempoStore } from "@/stores/app";

export function useEsriTimesteps(initialMolecule: MaybeRef<MoleculeType>, updateOnMount=true) {
  const molecule = toRef(initialMolecule);
  const loadingTimesteps = ref(false);
  const esriTimesteps = ref<number[]>([]);
  const error = ref<string | null>(null);
  const store = useTempoStore();

  function updateEsriTimeSteps(): Promise<void> {
    loadingTimesteps.value = true;
    const tds = store.getTempoDataService(molecule.value);
    return tds.getMergedTimesteps()
    /** we could set them with a partial load, but still uncertain
    * if this would break soeme initialization down stream. it's only
    * needed if the services are flaky, but then we probably don't 
    * want to really have the user trying to use the app anyway, so ignore for now
    * but just keep this here to show the implementation
    */
    // return tds.getMergedTimesteps((partialSteps) => {
    //   // Deliver partial results as each URL resolves
    //   esriTimesteps.value = partialSteps;
    // })
      .then(timesteps => {
        esriTimesteps.value = timesteps;
      })
      .catch((err: Error) => {
        console.error(`Error fetching ESRI time steps: ${err}`);
        error.value = err.message;
      })
      .finally(() => {
        loadingTimesteps.value = false;
      });
  }

  if (updateOnMount) {
    onMounted(updateEsriTimeSteps);
  }

  watch(molecule, () => {
    updateEsriTimeSteps();
  });

  return {
    molecule,
    loadingTimesteps,
    esriTimesteps,
    error,
    refresh: updateEsriTimeSteps,
  };
}
