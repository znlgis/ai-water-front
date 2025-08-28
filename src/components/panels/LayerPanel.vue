<template>
  <div class="layer-panel">
    <div class="panel-header">
      <h3>图层管理</h3>
      <div class="header-actions">
        <button class="mini-btn" @click="refresh" :disabled="loading">刷新</button>
      </div>
    </div>
    <div class="panel-content">
      <div class="status-bar" v-if="loading || error">
        <span v-if="loading">正在加载 GeoServer 图层...</span>
        <span v-else class="err">加载失败：{{ error }} <a href="javascript:void(0)" @click="refresh">重试</a></span>
      </div>
      <div class="layer-list" v-if="!loading && !error">
        <div
          v-for="layer in orderedLayers"
          :key="layer.fullName"
          class="layer-item"
        >
          <div class="layer-info">
            <span class="geom-tag" :class="layer.geometryType.toLowerCase()">{{ shortGeom(layer.geometryType) }}</span>
            <span class="layer-name" :title="layer.fullName">{{ layer.name }}</span>
          </div>
        </div>
        <div v-if="orderedLayers.length===0" class="empty-tip">无可用图层</div>
      </div>
    </div>
  </div>
</template>

<script>
import { reactive, ref, onMounted, computed } from 'vue'
import GeoServerRestApi from '../../geoserver/GeoServerRestApi.js'
import { mapInstance } from '../../mapInstance.js'
import TileLayer from 'ol/layer/Tile'
import TileWMS from 'ol/source/TileWMS'
import { transformExtent } from 'ol/proj'
import { createEmpty, extend as extendExtent } from 'ol/extent'

/** 几何类型权重：用于排序（面最下，点最上） */
const GEOM_WEIGHT = { POLYGON: 2, MULTIPOLYGON: 2, LINE: 1, MULTILINESTRING: 1, LINESTRING: 1, POINT: 0, MULTIPOINT: 0, OTHER: 2 }

export default {
  name: 'LayerPanel',
  setup() {
    const rawLayers = reactive([]) // {fullName,name,geometryType,bbox,olLayer}
    const api = new GeoServerRestApi()
    const layerCache = new Map()
    const loading = ref(false)
    const error = ref('')
    const firstFitDone = ref(false)

    const orderedLayers = computed(() => {
      return [...rawLayers].sort((a,b)=> (GEOM_WEIGHT[b.geometryType]??9) - (GEOM_WEIGHT[a.geometryType]??9))
    })

    const shortGeom = (g) => {
      if (!g) return '?'
      const up = g.toUpperCase()
      if (up.includes('POINT')) return '点'
      if (up.includes('LINE')) return '线'
      return '面'
    }

    const fetchLayers = async () => {
      loading.value = true
      error.value = ''
      try {
        const data = await api.layers.getLayers()
        const list = data?.layers?.layer || []
        rawLayers.splice(0, rawLayers.length)
        list.forEach(l => {
          const fullName = l.name
          const simpleName = fullName.includes(':') ? fullName.split(':')[1] : fullName
          if (simpleName === 'OpenStreetMap') return
          rawLayers.push({ fullName, name: simpleName, geometryType: 'OTHER', bbox: null })
        })
        await classifyAll()
        rebuildMapLayers()
      } catch (e) {
        console.error('加载图层失败', e)
        error.value = e?.message || '未知错误'
      } finally {
        loading.value = false
      }
    }

    const httpGetJson = async (url) => {
      const r = await fetch(url, { headers: { 'Accept': 'application/json' } })
      if (!r.ok) throw new Error('HTTP '+r.status+' '+url)
      return r.json()
    }

    const classifyAll = async () => {
      // 并发处理
      await Promise.all(rawLayers.map(l => classifyLayer(l)))
    }

    const classifyLayer = async (layerObj) => {
      try {
        const encoded = encodeURIComponent(layerObj.fullName)
        const detail = await httpGetJson(`/geoserver/rest/layers/${encoded}.json`)
        let resourceHref = detail?.layer?.resource?.href
        if (resourceHref) {
          try {
            const u = new URL(resourceHref)
            // 取路径并保持通过代理
            let rel = u.pathname
            if (!rel.endsWith('.json')) rel = rel.replace(/\.(xml|HTML?)$/i,'') + '.json'
            if (!rel.startsWith('/geoserver')) rel = '/geoserver' + rel
            const ft = await httpGetJson(rel)
            const attrs = ft?.featureType?.attributes?.attribute || []
            const geomAttr = attrs.find(a => /geom|shape/i.test(a.name) || /Point|Line|Polygon/i.test(a.binding||'')) || attrs.find(a => /Point|Line|Polygon/i.test(a.binding||''))
            const binding = (geomAttr?.binding||'').toUpperCase()
            if (binding.includes('POINT')) layerObj.geometryType = 'POINT'
            else if (binding.includes('LINE')) layerObj.geometryType = 'LINE'
            else if (binding.includes('POLYGON')) layerObj.geometryType = 'POLYGON'
            else layerObj.geometryType = 'OTHER'
            // Bounding box
            const bbox = ft?.featureType?.latLonBoundingBox || ft?.featureType?.nativeBoundingBox
            if (bbox && bbox.minx!=null) {
              layerObj.bbox = [bbox.minx, bbox.miny, bbox.maxx, bbox.maxy]
            }
          } catch (inner) {
            console.warn('解析资源失败', layerObj.fullName, inner)
          }
        }
      } catch (err) {
        console.warn('分类失败', layerObj.fullName, err)
      }
    }

    const createLayerIfNeeded = (layer) => {
      if (layerCache.has(layer.fullName)) return layerCache.get(layer.fullName)
      const olLayer = new TileLayer({
        source: new TileWMS({
          url: '/geoserver/wms',
          params: { LAYERS: layer.fullName, TILED: true, VERSION: '1.1.1', FORMAT: 'image/png', TRANSPARENT: true },
          serverType: 'geoserver',
          transition: 0,
          crossOrigin: 'anonymous'
        }),
        properties: { name: layer.fullName }
      })
      layerCache.set(layer.fullName, olLayer)
      return olLayer
    }

    const ensureMapReady = (cb, retry = 8) => {
      if (mapInstance) { cb(); return }
      if (retry <= 0) { console.warn('地图实例尚未就绪，放弃操作'); return }
      setTimeout(()=>ensureMapReady(cb, retry-1), 250)
    }

    const rebuildMapLayers = () => {
      ensureMapReady(()=>{
        const mapLayers = mapInstance.getLayers()
        // 移除旧的非底图远程图层
        const toRemove = mapLayers.getArray().filter(l => !l.get('isBase'))
        toRemove.forEach(l => mapLayers.remove(l))
        // 按排序后顺序添加（面->线->点），最后添加的在最上面，因此先添加面
        orderedLayers.value.forEach(layer => {
          const olLayer = createLayerIfNeeded(layer)
          mapLayers.push(olLayer)
        })
        fitViewIfNeeded()
      })
    }

    const fitViewIfNeeded = () => {
      if (firstFitDone.value) return
      if (!mapInstance) return
      const extent = createEmpty()
      let has = false
      rawLayers.forEach(l => {
        if (l.bbox) {
          try {
            const transformed = transformExtent(l.bbox, 'EPSG:4326', mapInstance.getView().getProjection())
            extendExtent(extent, transformed); has = true
          } catch(e) { /* ignore */ }
        }
      })
      if (has) {
        mapInstance.getView().fit(extent, { size: mapInstance.getSize(), padding: [40,40,40,40], maxZoom: 18 })
        firstFitDone.value = true
      }
    }

    const refresh = () => {
      fetchLayers()
    }

    onMounted(fetchLayers)

    return { orderedLayers, loading, error, refresh, shortGeom }
  }
}
</script>

<style scoped>
.layer-panel { height: 100%; display: flex; flex-direction: column; }
.panel-header { display:flex; align-items:center; justify-content:space-between; padding: 16px; border-bottom: 1px solid #ddd; background-color: #fff; }
.panel-header h3 { margin: 0; font-size: 16px; color: #333; }
.header-actions { display:flex; gap:6px; }
.mini-btn { padding:4px 10px; font-size:12px; border:1px solid #c7ccd1; background:#fff; border-radius:4px; cursor:pointer; }
.mini-btn:disabled { opacity:.5; cursor:not-allowed; }
.mini-btn:not(:disabled):hover { background:#f1f3f5; }
.panel-content { flex: 1; padding: 16px; overflow-y: auto; }
.status-bar { margin-bottom:8px; font-size:12px; color:#555; }
.status-bar .err { color:#d93025; }
.status-bar a { color:#0b5ed7; text-decoration:none; }
.status-bar a:hover { text-decoration:underline; }
.layer-list { border: 1px solid #e1e5e9; border-radius: 4px; background-color: #fff; }
.layer-item { display: flex; align-items: center; padding: 10px 12px; border-bottom: 1px solid #e1e5e9; }
.layer-item:last-child { border-bottom: none; }
.layer-item:hover { background-color: #f8f9fa; }
.layer-info { flex: 1; display: flex; align-items: center; gap: 8px; min-width:0; }
.layer-name { font-size: 14px; color: #333; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.geom-tag { font-size:12px; padding:2px 6px; border-radius:10px; line-height:1; background:#e5e8ec; color:#44515d; }
.geom-tag.point { background:#4dabf7; color:#fff; }
.geom-tag.line { background:#51cf66; color:#fff; }
.geom-tag.polygon, .geom-tag.multipolygon { background:#ffa94d; color:#fff; }
.empty-tip { padding: 12px; font-size: 12px; color: #888; text-align: center; }
</style>
