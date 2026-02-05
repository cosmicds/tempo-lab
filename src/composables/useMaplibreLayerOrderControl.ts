
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { type Ref, type MaybeRef, ref, toRef, watch, computed, onBeforeUnmount } from 'vue';
import M from 'maplibre-gl';

function checkArrayEquality<T>(arr1: T[], arr2: T[]) {
  if (arr1.length !== arr2.length) return false;
  return arr1.map((v, i) => v === arr2[i]).every(v => v);
}

function _isSubset<T>(subset: T[], superset: T[]) {
  return subset.every(v => superset.includes(v));
}

/** 
 * Make the element at fromIndex be at toIndex, shifting other elements as needed
 * Does not mutate the original array, returns a new array
 * Throws error if fromIndex or toIndex are out of bounds
 */
function arrayMove<T>(arr: T[], fromIndex: number, toIndex: number) {
  if (fromIndex < 0 || fromIndex >= arr.length) {
    throw new Error('fromIndex out of bounds');
  }
  if (toIndex < 0 || toIndex >= arr.length) {
    throw new Error('toIndex out of bounds');
  }
  
  const newArr = [...arr];
  
  if (fromIndex === toIndex) return newArr;
  
  // remove the element from fromIndex and insert it at toIndex
  const element = newArr.splice(fromIndex, 1)[0];
  newArr.splice(toIndex, 0, element);
   
  
  return newArr;
  
}

interface LinkedLayers {
  primary: string,
  linkedLayers: string[],
}

interface Options {
  keepAtTop?: boolean;
  linkedLayers?: [string, string[]][];
}

class PsuedoEvent {
  private listeners: Record<string, Array<() => void>> = {};
  
  addEventListener(event: string, handler: () => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }
  
  removeEventListener(event: string, handler: () => void) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(h => h !== handler);
  }
  
  dispatchEvent(event: string) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(handler => handler());
  }
  
  cleanup() {
    this.listeners = {};
  }
}

type MaplibreLayerOrderControlEvent = 'layer-order-changed';
// higher index = higher layer
export class MaplibreLayerOrderControl extends PsuedoEvent {
  private _map: M.Map;
  private _desiredLayerOrder: string[]; // bottom to top 
  private _keepAtTop: boolean;
  private _initialized = false;
  private _eventHandlers: [string, () => void][] = [];
  private _layerOrder: string[] = [];
  private _linked: LinkedLayers[] = [];
  
  constructor(map: M.Map, initialOrder: string[], options: Options = {}) {
    super();
    this._desiredLayerOrder = initialOrder;
    this._map = map;
    this._keepAtTop = options.keepAtTop ?? false;
    if (options.linkedLayers) {
      this._linked = options.linkedLayers.map(link => this._newLink(link));
    }
    
    const idleListener = () => {
      this._orderLayers();
      this._initialized = true;
      this._watchForChanges();
      this._map.off('idle', idleListener);
    };
    // wait for map to be ready
    this._map.on('idle',idleListener);
    
  }
  
  on(event: MaplibreLayerOrderControlEvent, handler: () => void) {
    this.addEventListener(event, handler);
  }

  get desiredLayerAvailability() {
    return this._desiredLayerOrder.reduce((acc, layer) => {
      acc[layer] = this.hasLayer(layer);
      return acc;
    }, {} as Record<string, boolean>);
  }
  
  get availableDesiredOrder() {
    return this._desiredLayerOrder.filter(l => this.hasLayer(l));
  }
  
  get currentlyManagedLayerOrder() {
    this._layerOrder = this._map.
      getLayersOrder().
      filter(l => this._desiredLayerOrder.includes(l));
    return this._layerOrder;
  }
  
  private _checkLayerChanges() {
    const orderAtLastCheck = this._layerOrder;
    const currentOrder = this.currentlyManagedLayerOrder;
    const val = {
      removed: orderAtLastCheck.filter(l => !currentOrder.includes(l)),
      added: currentOrder.filter(l => !orderAtLastCheck.includes(l)),
    };

    return {
      ...val, 
      changed: val.removed.length > 0 || val.added.length > 0,
    };
  }
  
  private _moveLayerBelow(layer: string, anchor: string) {
    this._map.moveLayer(layer, anchor);
  }
  
  private _moveLayerAbove(layer: string, anchor: string) {
    // this.map.moveLayer(anchor, layer); 
    // without moving the anchor
    const currentOrder = this._map.getLayersOrder();
    const anchorIndex = currentOrder.indexOf(anchor);
    const nextLayerUpIndex = anchorIndex + 1;
    if (nextLayerUpIndex >= currentOrder.length) {
      // anchor is already top layer
      this._map.moveLayer(layer);
    } else {
      // move below the next layer up
      const nextLayerUp = currentOrder[nextLayerUpIndex];
      this._map.moveLayer(layer, nextLayerUp);
    }
  }
  
  private _applyLinkedLayers() {
    if (!this._linked.length) return;
    console.log('Applying linked layers', this._linked);
    
    const mapOrder = new Map<string, number>(
      this._map.getLayersOrder().map((layer, index) => [layer, index])
    );
    console.log('Current map layer order', mapOrder.size);
    
    for (const linked of this._linked) {
      const { primary } = linked;
      const linkedLayers = linked.linkedLayers.filter(l => this.hasLayer(l) && mapOrder.has(l));
      // make sure primary exists and we have linked layers
      if (!primary || linkedLayers.length === 0) continue;
      if (!this.hasLayer(primary)) continue;
      
      let anchor = primary;
      const primaryIndex = linkedLayers.indexOf(primary);
      
      // if we don't include the primary, then
      // we will stack them below the primary
      const belowPrimary = primaryIndex === -1 ? linkedLayers : linkedLayers.slice(0, primaryIndex);
      const abovePrimary = primaryIndex === -1 ? [] : linkedLayers.slice(primaryIndex + 1);
      
      
      // Stack upwards from the primary
      for (const layer of abovePrimary) {
        this._moveLayerAbove(layer, anchor);
        anchor = layer;
      }
      
      // Stack downwards from the primary
      // don't update anchor when going down
      // because we want to keep stacking/pusing downwards
      anchor = primary;
      for (const layer of belowPrimary) {
        if (layer === primary) continue;
        this._moveLayerBelow(layer, anchor);
      }
      
    }
  }
  
  private _newLink(linkage: [string, string[]]): LinkedLayers {
    const [anchor, layersToLink] = linkage;
    return {
      primary: anchor,
      linkedLayers: layersToLink,
    };
  }
  
  
  setLinkedLayers(linkedLayers: LinkedLayers[]) {
    this._linked = linkedLayers;
    this._maintainOrder();
  }
  
  linkLayers(linkage: [string, string[]]) {
    const [anchor, layersToLink] = linkage;
    const link: LinkedLayers = {
      primary: anchor,
      linkedLayers: layersToLink,
    };
    
    this._linked.push(link);
    this._maintainOrder();
  }
  
  private _orderLayers() {
    if (this._keepAtTop) {
      // moves top-most managed available layer to the top
      this.startAtTop(); 
    }
    
    for (let i = this._desiredLayerOrder.length - 1; i > 0; i--) {
      const bottomLayer = this._desiredLayerOrder[i-1];
      const topLayer = this._desiredLayerOrder[i];
      this.safeMoveLayerBelow(bottomLayer, topLayer);
    }
    
    this._applyLinkedLayers();
    
    this.dispatchEvent('layer-order-changed');
  }
  
  private _maintainOrder() {
    const check = this._checkLayerChanges();
    if (!checkArrayEquality(this.availableDesiredOrder, this.currentlyManagedLayerOrder) || check.changed) {
      this._orderLayers();
    }
  }
  
  private _watchForChanges() {
    const onStyleData = () => this._maintainOrder();
    this._map.on('styledata', onStyleData);
    this._eventHandlers.push(['styledata', onStyleData]);
  }
  
  destroy() {
    this.cleanup();
    
    this._eventHandlers.forEach(([event, handler]) => {
      this._map.off(event, handler);
    });
    this._eventHandlers = [];
  }
  
  private _moveLayer(layer: string, newIndex: number) {
    const currentOrder = this._desiredLayerOrder;
    const currentLayerIndex = currentOrder.indexOf(layer);
    
    // if it's not there, ignore it
    if (currentLayerIndex === -1) {
      console.error(`Layer ${layer} not found in current managed layers`);
      return;
    }
    
    const newLayerOrder = arrayMove(this._desiredLayerOrder, currentLayerIndex, newIndex);
    this._desiredLayerOrder = newLayerOrder;
    
    this._maintainOrder();
  }
  
  moveActualLayerByIndex(fromIndex: number, toIndex: number, maintainOrder = true) {
    const currentOrder = this.currentlyManagedLayerOrder;
    if (fromIndex < 0 || fromIndex >= currentOrder.length) {
      throw new Error(`fromIndex out of bounds. Got ${fromIndex} for ${currentOrder.length} available layers ${currentOrder}`);
    }
    if (toIndex < 0 || toIndex >= currentOrder.length) {
      throw new Error(`toIndex out of bounds. Got ${toIndex} for ${currentOrder.length} available layers ${currentOrder}`);
    }
    
    const layer = currentOrder[fromIndex];
    this.moveActualLayer(layer, toIndex, maintainOrder);
  }
  
  moveActualLayer(layer: string, newIndex: number, maintainOrder = true) {
    const currentOrder = this.currentlyManagedLayerOrder;
    const currentLayerIndex = currentOrder.indexOf(layer);
    
    // if it's not there, ignore it
    if (currentLayerIndex === -1) {
      console.error(`Layer ${layer} not found in current managed layers`);
      return;
    }
    
    const layerAtNewIndex = currentOrder[newIndex];
    if (!layerAtNewIndex) {
      throw new Error(`Must provide a valid new index correpsonding to the available layers. Got ${newIndex} for ${currentOrder.length} available layers ${currentOrder}`);
    }
    
    // get layerAtNewIndex's index in the full layer order
    const oldLayerOrderIndex = this._desiredLayerOrder.indexOf(layer);
    const newLayerOrderIndex = this._desiredLayerOrder.indexOf(layerAtNewIndex);
    
    const newLayerOrder = arrayMove(this._desiredLayerOrder, oldLayerOrderIndex, newLayerOrderIndex);
    this._desiredLayerOrder = newLayerOrder;
    
    if (maintainOrder) {
      this._maintainOrder();
    }
  }
  
  moveToFront(layer: string) {
    const topIndex = this._desiredLayerOrder.length - 1;
    this._moveLayer(layer, topIndex);
  }
  
  moveToBack(layer: string) {
    this._moveLayer(layer, 0);
  }
  
  moveUp(layer: string) {
    const currentOrder = this.currentlyManagedLayerOrder;
    const index = currentOrder.indexOf(layer);
    if (index === -1 || index === currentOrder.length - 1) return;
    this.moveActualLayer(layer, index + 1);
  }
  
  moveDown(layer: string) {
    const currentOrder = this.currentlyManagedLayerOrder;
    const index = currentOrder.indexOf(layer);
    if (index <= 0) return;
    this.moveActualLayer(layer, index - 1);
  }
  
  
  
  setOrder(order: string[]) {
    this._desiredLayerOrder = [...order];
    if (this._initialized) this._maintainOrder();
  }
  
  setKeepAtTop(keepAtTop: boolean) {
    this._keepAtTop = keepAtTop;
    if (this._initialized) this._maintainOrder();
  }
  
  hasLayer(layer: string) {
    return this._map.getLayer(layer) !== undefined;
  }
  
  get reverseLayerOrder() {
    // create copy to avoid mutating the original
    return this.currentlyManagedLayerOrder.slice().reverse();
  }
  
  // easy accessor for the top layer
  startAtTop() {
    const currentOrder = this._map.getLayersOrder();
    for (const layer of this.reverseLayerOrder) {
      if (currentOrder.includes(layer)) {
        this._map.moveLayer(layer);
        return;
      }
    }
    console.error('None of layers you wanted sorted was found');
  }
  

  
  
  safeMoveLayerBelow(layerToMove: string, layerItShouldBeBelow: string): boolean {
    const hasLayer = this.hasLayer(layerToMove);
    if (!hasLayer) {
      return false;
    }
    
    if (!this.hasLayer(layerItShouldBeBelow)) {
      // if it doesn't have this layer, try the next one above it
      const nextIndex = this._desiredLayerOrder.indexOf(layerItShouldBeBelow) + 1;
      if (nextIndex < this._desiredLayerOrder.length) {
        return this.safeMoveLayerBelow(layerToMove, this._desiredLayerOrder[nextIndex]);
      }
      return false;
    }
    this._map.moveLayer(layerToMove, layerItShouldBeBelow);
    return true;
  }
  
  safeMoveLayerAbove(layerToMove: string, layerItShouldBeAbove: string): boolean {
    const hasLayer = this.hasLayer(layerToMove);
    if (!hasLayer) {
      // console.warn(`Layer ${layer} not found`);
      return false;
    }

    if (!this.hasLayer(layerItShouldBeAbove)) {
      // if it doesn't have this layer, try the next one below it
      const nextIndex = this._desiredLayerOrder.indexOf(layerToMove) - 1;
      if (nextIndex >= 0) {
        return this.safeMoveLayerAbove(layerToMove, this._desiredLayerOrder[nextIndex]);
      }
      return false;
    }
    // to move above a layer, move that layer below this one
    this._map.moveLayer(layerItShouldBeAbove, layerToMove);
    return true;
  }

  setManagedOrder(newManagedOrder: string[]) {
    // if (!isSubset(newManagedOrder, this.desiredLayerOrder)) {
    //   throw new Error('New managed order must be a subset of the original managed layers');
    // }
    
    if (checkArrayEquality(newManagedOrder, this.availableDesiredOrder)) return;
    
    // merge the order. when a layer comes back, i don't want
    // to be surprised that it is suddenly on the bottom of the
    // stack
    
    // hashmap!!
    const managedLayerMap = new Map<string, number>();
    newManagedOrder.forEach((layer, index) => {
      managedLayerMap.set(layer, index);
    });
    
    const newDesiredOrder: string[] = [];
    let managedIndex = 0;
    
    for (const layer of this._desiredLayerOrder) {
      if (managedLayerMap.has(layer)) {
        newDesiredOrder.push(newManagedOrder[managedIndex]);
        managedIndex++;
      } else {
        newDesiredOrder.push(layer);
      }
    }
    
    this._desiredLayerOrder = newDesiredOrder;
    this._maintainOrder();
    
  }
    
  
}
  
interface UseMaplibreLayerOrderControlReturn {
  desiredOrder: Ref<string[]>;
  currentOrder: Ref<string[]>;
  controller: MaplibreLayerOrderControl | null;
  
}

export function useMaplibreLayerOrderControl(
  map: Ref<M.Map | null>,
  initialOrder: string[] = [],
  moveToTop: boolean = true,
  linkedLayers: [string, string[]][] = [],
): UseMaplibreLayerOrderControlReturn {
  

  const desiredOrder = ref<string[]>(initialOrder);
  const currentOrder = ref<string[]>([]);
  let controller: MaplibreLayerOrderControl | null = null;
  let initialized = false;
  
  // Initialize the controller when the map is ready
  function init(mapValue: M.Map | null) {
    if (mapValue && !controller && !initialized) {
      controller = new MaplibreLayerOrderControl(mapValue, desiredOrder.value, {keepAtTop: moveToTop, linkedLayers: linkedLayers});
      controller.on('layer-order-changed', () => {
        if (controller && !checkArrayEquality(currentOrder.value, controller.currentlyManagedLayerOrder ?? [])) {
          currentOrder.value = controller?.currentlyManagedLayerOrder ?? [];
        }
      });
      currentOrder.value = controller.currentlyManagedLayerOrder;
      initialized = true;
    }
  }
  init(map.value);
  watch(map, (newValue) => {
    if (newValue && !controller && !initialized) {
      console.log('Map changed, re-initializing controller', newValue);
      init(newValue);
    } else if (!newValue && controller) {
      console.log('Map is now null, destroying controller');
      controller.destroy();
      controller = null;
      initialized = false;
      currentOrder.value = [];
    }
  });
  
  // watch(desiredOrder, (newOrder) => {
  //   console.log('Desired order changed to', newOrder);
  // }, {deep: true});
  
  // watch(currentOrder, (newOrder) => {
  //   console.log('Current order changed to', newOrder);
  // }, {deep: true});
  
  
  onBeforeUnmount(() => {
    controller?.destroy();
  });
  
  
  return {
    desiredOrder,
    currentOrder,
    controller,
  };
  
  
  
  
}
