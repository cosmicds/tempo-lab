import { ref, shallowRef, watch, Ref, MaybeRef, toRef, computed } from 'vue';
import { RenderingRuleOptions } from '@/esri/ImageLayerConfig';
import type { Map, MapSourceDataEvent, MapMouseEvent } from 'maplibre-gl';
import { validate as uuidValidate } from "uuid";

import { ImageService } from '@/esri/ImageServiceLayer/ImageService';
import { TempoDataService, type ServiceStatusMap } from '@/esri/services/TempoDataService';
import { type PointBounds } from '@/esri/geometry';



export interface UseEsriLayer {
  esriImageSource: Ref<maplibregl.RasterTileSource | null>;
  opacity: Ref<number>;
  noEsriData: Ref<boolean>;
  loadingEsriTimeSteps: Ref<boolean>;
  esriTimesteps: Ref<number[]>;
  updateEsriOpacity: (value?: number | null | undefined) => void;
  updateEsriTimeRange: () => void;
  addEsriSource: (map: Map) => void;
  removeEsriSource: () => void;
  renderOptions: Ref<RenderingRuleOptions>;
  serviceReady: Ref<ServiceStatusMap>;
}

export interface ImageSerivceLayerOptions {
  renderingRule?: RenderingRuleOptions;
  visible?: boolean;
  clickValue?: boolean;
  exportImageOptions?: Record<string, unknown>;
}

export function useEsriImageServiceLayer(
  serviceUrl: string,
  layerId: string,
  opacity: MaybeRef<number>,
  variable: MaybeRef<string>,
  _timestamp: MaybeRef<number>,
  options: ImageSerivceLayerOptions = {},
): UseEsriLayer {

  const timestamp = toRef(_timestamp);
  const url = ref(serviceUrl);
  const esriLayerId = layerId;
  const esriImageSource = ref<maplibregl.RasterTileSource | null>(null);
  const map = shallowRef<Map | null>(null); // instead of ref, prevent's "infinitely deep typescript error"
  const variableRef = toRef(variable);
  
  const tds = new TempoDataService(serviceUrl, variableRef.value);
  const serviceReady = ref<ServiceStatusMap>(new globalThis.Map());
  function serviceStatusAllFailed(status: ServiceStatusMap): boolean {
    return status.size > 0 && [...status.values()].every((ready) => ready === false);
  }

  function getServiceStatus() {
    serviceReady.value = new globalThis.Map(tds.publicServiceStatus);

    tds.serviceStatusReady().then((ready) => {
      const servicesReady = new globalThis.Map<string, boolean | null>();
      for (const kv of ready) {
        servicesReady.set(kv[0], kv[1] ?? false); // if still null, treat as false,service is degraded
      }
      serviceReady.value = servicesReady;
    })
      .catch((error) => {
        console.error(`[${esriLayerId}] Failed to read service status`, error);
        // set status to false, service is down or degraded
        serviceReady.value = new globalThis.Map(
          tds.baseUrlArray.map(url => [url, false])
        );
      });
  }
  getServiceStatus();


  const opacityRef = toRef(opacity);
  const noEsriData = ref(false);

  
  const esriOptions = computed(() => {
    return  {
      'format': 'png',
      'pixelType': 'U8',
      'size': '256,256',
      'transparent': true,
      'bboxSR': 3857,
      'imageSR': 3857,
      'bbox': '{bbox-epsg-3857}',
      'interpolation': 'RSP_NearestNeighbor',
      'renderingRule': options.renderingRule || {},
      ...options.exportImageOptions || {},
    };
  });

  
  function addLayer(map: Map | null | undefined) {

    if (map && !map.getLayer(esriLayerId)) {
      map.addLayer({
        id: esriLayerId,
        type: 'raster',
        source: esriLayerId,
        paint: {
          'raster-resampling': 'nearest',
          'raster-opacity': (options.visible === false) ? 0.0 : (opacityRef.value ?? 0.8),
        },
        layout: {
          'visibility': (options.visible === false) ? 'none' : 'visible',
        }
      });
      let index = -1;
      for (const [idx, layer] of Object.entries(map.getStyle().layers)) {
        if (uuidValidate(layer.id)) {
          index = Number(idx) - 1;
        }
      }
      if (index >= 0) {
        map.moveLayer(esriLayerId, map.getStyle().layers[index].id);
      }
    }
  }
  
  function removeLayer(map: Map | null | undefined) {
    if (map && map.getLayer(esriLayerId)) {
      map.removeLayer(esriLayerId);
    }
  }
  
  const dynamicMapService = ref<ImageService | null>(null);
  const clickHandler = ref<((e: MapMouseEvent) => void) | null>(null);
  
  function onSourceLoad(e: MapSourceDataEvent) {
    // console.log(`sourcedata event for ${esriLayerId}: `);
    if (e.sourceId === esriLayerId && e.isSourceLoaded && map.value?.getSource(esriLayerId)) {
      console.log(`ESRI source ${esriLayerId} loaded`);
      esriImageSource.value = map.value?.getSource(esriLayerId) as maplibregl.RasterTileSource;
      updateEsriOpacity();
      if (dynamicMapService.value) {
        dynamicMapService.value.setDate(new Date(timestamp.value - 1), new Date(timestamp.value + 1));
      }
      if (options.visible !== undefined && !options.visible) {
        map.value?.setLayoutProperty(esriLayerId, 'visibility', 'none');
      }
      map.value?.off('sourcedata', onSourceLoad);
    }
  }
  
  function createImageService(map: Map, url: string, options) {
    // console.log(`[${esriLayerId}] Creating image service with options:`, options);
    return new ImageService(
      esriLayerId,
      map,
      {
        url: url,
        ...options
      },
      {
        tileSize: 256,
      }
    );
    
  }
  
  function addEsriSource(mMap: Map) {
    if (!mMap) return;
    map.value = mMap;

    if (mMap.getLayer(esriLayerId) || mMap.getSource(esriLayerId)) {
      removeEsriSource();
    }

    try {
      dynamicMapService.value = createImageService(mMap, url.value, esriOptions.value);

      addLayer(mMap);
      // this event will run until the source is loaded
      mMap.off('sourcedata', onSourceLoad);
      mMap.on('sourcedata', onSourceLoad);
      console.log(`[${esriLayerId}] Adding ESRI source to map`);
      if (serviceStatusAllFailed(serviceReady.value)) {
        console.warn(`[${esriLayerId}] All backing services are unavailable or unknown. Layer added but hidden.`);
        mMap.setLayoutProperty(esriLayerId, 'visibility', 'none');
      }
    } catch (error) {
      console.error(`[${esriLayerId}] Failed to add ESRI source`, error);
      removeEsriSource();
      return;
    }

    if (options.clickValue && !clickHandler.value) {
      clickHandler.value = (e: MapMouseEvent) => {
        if (_hasEsriSource() && map.value) {
          const point = { x: e.lngLat.lng, y: e.lngLat.lat } as PointBounds;
          const timeRange = {start: timestamp.value - 1, end: timestamp.value + 1};
          tds.fetchSample(point, timeRange).then((val) => {
            console.log(`[${esriLayerId}] Value at point`, point, 'is', val.samples.map(v => v.value));
          }).catch((err) => {
            console.error(`[${esriLayerId}] Error fetching sample:`, err);
          });
        }
      };
      mMap.on('click', clickHandler.value);
    }
  }
  
    
  function removeEsriSource() {
    if (!map.value) return;
    
    // make sure we clean up events
    map.value.off('sourcedata', onSourceLoad);
    if (clickHandler.value) {
      map.value.off('click', clickHandler.value);
      clickHandler.value = null;
    }
    
    removeLayer(map.value);
    if (map.value && map.value.getSource(esriLayerId)) {
      map.value.removeSource(esriLayerId);
    }
    dynamicMapService.value = null;
    esriImageSource.value = null;
  }
  
  function _hasEsriSource() {
    return map.value?.getSource(esriLayerId) !== undefined;
  }
  
  watch(timestamp, (_value) => {
    console.log(`[${esriLayerId}] esri imageset timestamp set to `, _value ? new Date(_value) : null);
    if ( _hasEsriSource() && dynamicMapService.value) {
      dynamicMapService.value.setDate(new Date(_value-1), new Date(_value+1));
    } else {
      console.warn(`[${esriLayerId}] ESRI source not yet available`);
    }
  });
  
  
  
  function updateEsriOpacity(value: number | null | undefined = undefined) {
    if (map.value && map.value.getLayer(esriLayerId)) {
      map.value.setPaintProperty(esriLayerId, 'raster-opacity', value ?? opacityRef.value ?? 0.8);
    }
  }

  // watch serviceReady b/c it may get set after the layer has been added to the map
  watch(serviceReady, (readiness) => {
    if (serviceStatusAllFailed(readiness)) {
      if (map.value?.getLayer(esriLayerId)) {
        map.value.setLayoutProperty(esriLayerId, 'visibility', 'none');
      }
    }
  });

  watch(opacityRef, (_value: number) => {
    updateEsriOpacity(_value);
  });

  watch(noEsriData, (value: boolean) => {
    if (value) {
      updateEsriOpacity(0);
      removeLayer(map.value);
    } else {
      addLayer(map.value);
    }
  });

  return {
    esriImageSource,
    opacity: opacityRef,
    noEsriData,
    updateEsriOpacity,
    addEsriSource,
    removeEsriSource,
    serviceReady,
  } as UseEsriLayer;
}


