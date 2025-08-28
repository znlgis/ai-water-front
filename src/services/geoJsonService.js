/**
 * GeoJSON处理服务
 * 用于解析Dify API响应中的GeoJSON数据并在地图上可视化
 */

import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import { Style, Stroke, Fill, Circle } from 'ol/style'
import { transform } from 'ol/proj'
import { mapInstance } from '../mapInstance.js'

/**
 * 从Dify响应文本中提取GeoJSON数据
 * @param {string} responseText - Dify API响应的文本内容
 * @returns {Object|null} 解析出的GeoJSON对象或null
 */
export function extractGeoJsonFromResponse(responseText) {
  if (!responseText || typeof responseText !== 'string') return null

  try {
    // 尝试直接解析整个响应为JSON
    let parsedData = null
    try {
      parsedData = JSON.parse(responseText)
    } catch (e) {
      // 如果整个响应不是JSON，查找其中的JSON片段
      const jsonPattern = /\{[^{}]*"geom"[^{}]*\{[^{}]*\}[^{}]*\}/g
      const matches = responseText.match(jsonPattern)
      if (matches && matches.length > 0) {
        try {
          parsedData = JSON.parse(matches[0])
        } catch (e2) {
          console.warn('无法解析JSON片段:', matches[0])
          return null
        }
      } else {
        // 尝试更简单的模式匹配
        const simplePattern = /\{.*?"geom".*?\}/
        const simpleMatch = responseText.match(simplePattern)
        if (simpleMatch) {
          try {
            parsedData = JSON.parse(simpleMatch[0])
          } catch (e3) {
            console.warn('无法解析简单JSON片段:', simpleMatch[0])
            return null
          }
        } else {
          return null
        }
      }
    }

    // 检查是否包含geom字段
    if (parsedData && typeof parsedData === 'object') {
      return findGeoJsonInObject(parsedData)
    }

    return null
  } catch (error) {
    console.warn('提取GeoJSON时出错:', error)
    return null
  }
}

/**
 * 递归查找对象中的GeoJSON数据
 * @param {Object} obj - 要查找的对象
 * @returns {Object|null} 找到的GeoJSON对象或null
 */
function findGeoJsonInObject(obj) {
  if (!obj || typeof obj !== 'object') return null

  // 检查是否有geom字段
  if (obj.geom) {
    if (isValidGeoJSON(obj.geom)) {
      return obj.geom
    }
  }

  // 检查对象本身是否是GeoJSON
  if (isValidGeoJSON(obj)) {
    return obj
  }

  // 递归查找嵌套对象
  for (const key in obj) {
    if (key.toLowerCase().includes('geom') || key.toLowerCase().includes('geometry')) {
      const value = obj[key]
      if (isValidGeoJSON(value)) {
        return value
      }
    }
    
    if (typeof obj[key] === 'object') {
      const result = findGeoJsonInObject(obj[key])
      if (result) return result
    }
  }

  return null
}

/**
 * 验证是否为有效的GeoJSON格式
 * @param {*} data - 要验证的数据
 * @returns {boolean} 是否为有效GeoJSON
 */
function isValidGeoJSON(data) {
  if (!data || typeof data !== 'object') return false

  const type = data.type
  if (!type) return false

  // 检查是否是支持的GeoJSON类型
  const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'Feature', 'FeatureCollection']
  if (!validTypes.includes(type)) return false

  // 基本结构验证
  if (type === 'Feature') {
    return data.geometry && data.geometry.type && data.geometry.coordinates
  } else if (type === 'FeatureCollection') {
    return Array.isArray(data.features)
  } else {
    return data.coordinates !== undefined
  }
}

/**
 * 在地图上显示GeoJSON数据并添加高亮闪烁效果
 * @param {Object} geoJsonData - GeoJSON数据
 * @returns {VectorLayer|null} 创建的图层或null
 */
export function displayGeoJsonOnMap(geoJsonData) {
  if (!geoJsonData || !mapInstance) {
    console.warn('无法显示GeoJSON: 缺少数据或地图实例')
    return null
  }

  try {
    // 确保GeoJSON是FeatureCollection格式
    const featureCollection = normalizeToFeatureCollection(geoJsonData)
    
    // 创建矢量数据源
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(featureCollection, {
        featureProjection: 'EPSG:3857', // 地图投影
        dataProjection: 'EPSG:4326'     // 数据投影
      })
    })

    // 创建矢量图层
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: createHighlightStyle(),
      properties: { 
        name: 'geojson-highlight',
        isGeoJsonLayer: true,
        timestamp: Date.now()
      }
    })

    // 添加到地图
    mapInstance.addLayer(vectorLayer)

    // 添加闪烁动画
    addBlinkingAnimation(vectorLayer)

    // 调整视图到GeoJSON范围
    fitViewToGeoJson(vectorSource)

    console.log('GeoJSON已添加到地图，包含', vectorSource.getFeatures().length, '个要素')
    return vectorLayer

  } catch (error) {
    console.error('显示GeoJSON时出错:', error)
    return null
  }
}

/**
 * 标准化GeoJSON为FeatureCollection格式
 * @param {Object} geoJsonData - 原始GeoJSON数据
 * @returns {Object} FeatureCollection格式的GeoJSON
 */
function normalizeToFeatureCollection(geoJsonData) {
  if (geoJsonData.type === 'FeatureCollection') {
    return geoJsonData
  } else if (geoJsonData.type === 'Feature') {
    return {
      type: 'FeatureCollection',
      features: [geoJsonData]
    }
  } else {
    // 假设是Geometry对象
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: geoJsonData,
        properties: {}
      }]
    }
  }
}

/**
 * 创建高亮样式
 * @returns {Style} OpenLayers样式对象
 */
function createHighlightStyle() {
  return new Style({
    stroke: new Stroke({
      color: '#ff4444',
      width: 3,
      lineDash: [5, 5]
    }),
    fill: new Fill({
      color: 'rgba(255, 68, 68, 0.2)'
    }),
    image: new Circle({
      radius: 8,
      stroke: new Stroke({
        color: '#ff4444',
        width: 3
      }),
      fill: new Fill({
        color: 'rgba(255, 68, 68, 0.3)'
      })
    })
  })
}

/**
 * 添加闪烁动画效果
 * @param {VectorLayer} layer - 要添加动画的图层
 */
function addBlinkingAnimation(layer) {
  let opacity = 1
  let direction = -0.1
  
  const animate = () => {
    opacity += direction
    if (opacity <= 0.3) {
      opacity = 0.3
      direction = 0.1
    } else if (opacity >= 1) {
      opacity = 1
      direction = -0.1
    }
    
    layer.setOpacity(opacity)
    
    // 持续闪烁5秒
    if (Date.now() - layer.get('timestamp') < 5000) {
      requestAnimationFrame(animate)
    } else {
      layer.setOpacity(1) // 恢复正常透明度
    }
  }
  
  requestAnimationFrame(animate)
}

/**
 * 调整地图视图到GeoJSON范围
 * @param {VectorSource} vectorSource - 矢量数据源
 */
function fitViewToGeoJson(vectorSource) {
  const extent = vectorSource.getExtent()
  if (extent && extent.some(coord => isFinite(coord))) {
    mapInstance.getView().fit(extent, {
      padding: [50, 50, 50, 50],
      maxZoom: 16,
      duration: 1000
    })
  }
}

/**
 * 清除地图上的所有GeoJSON图层
 */
export function clearGeoJsonLayers() {
  if (!mapInstance) return

  const layersToRemove = []
  mapInstance.getLayers().forEach(layer => {
    if (layer.get('isGeoJsonLayer')) {
      layersToRemove.push(layer)
    }
  })

  layersToRemove.forEach(layer => {
    mapInstance.removeLayer(layer)
  })

  console.log('已清除', layersToRemove.length, '个GeoJSON图层')
}