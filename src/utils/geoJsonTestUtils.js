/**
 * 测试工具：模拟包含GeoJSON的Dify API响应
 * 用于测试GeoJSON检测和地图显示功能
 */

import { extractGeoJsonFromResponse, displayGeoJsonOnMap } from '../services/geoJsonService.js'

// 测试用的GeoJSON数据
export const sampleGeoJsonResponses = {
  point: {
    text: '根据您的查询，我找到了一个位置点。',
    geojson: {
      type: 'Point',
      coordinates: [116.4074, 39.9042] // 北京坐标
    }
  },
  
  pointInMessage: {
    text: '这里有一个地点信息：{"geom": {"type": "Point", "coordinates": [116.4074, 39.9042]}, "name": "北京市中心"}，请查看地图标记。'
  },
  
  polygon: {
    text: '区域边界已找到。',
    geojson: {
      type: 'Polygon',
      coordinates: [[
        [116.3, 39.8],
        [116.5, 39.8], 
        [116.5, 40.0],
        [116.3, 40.0],
        [116.3, 39.8]
      ]]
    }
  },
  
  featureCollection: {
    text: '多个位置点如下：',
    geojson: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [116.4074, 39.9042]
          },
          properties: {
            name: '天安门广场'
          }
        },
        {
          type: 'Feature', 
          geometry: {
            type: 'Point',
            coordinates: [116.3974, 39.9172]
          },
          properties: {
            name: '故宫博物院'
          }
        }
      ]
    }
  }
}

/**
 * 测试GeoJSON提取功能
 */
export function testGeoJsonExtraction() {
  console.log('=== 测试GeoJSON提取功能 ===')
  
  // 测试包含geom字段的消息
  const result1 = extractGeoJsonFromResponse(sampleGeoJsonResponses.pointInMessage.text)
  console.log('提取结果1:', result1)
  
  // 测试直接的GeoJSON字符串
  const geoJsonString = JSON.stringify(sampleGeoJsonResponses.point.geojson)
  const result2 = extractGeoJsonFromResponse(geoJsonString)
  console.log('提取结果2:', result2)
  
  return {
    test1: result1,
    test2: result2
  }
}

/**
 * 测试地图显示功能
 */
export function testMapDisplay() {
  console.log('=== 测试地图显示功能 ===')
  
  // 显示点
  const pointLayer = displayGeoJsonOnMap(sampleGeoJsonResponses.point.geojson)
  console.log('点图层:', pointLayer)
  
  // 2秒后显示多边形
  setTimeout(() => {
    const polygonLayer = displayGeoJsonOnMap(sampleGeoJsonResponses.polygon.geojson)
    console.log('多边形图层:', polygonLayer)
  }, 2000)
  
  // 4秒后显示要素集合
  setTimeout(() => {
    const fcLayer = displayGeoJsonOnMap(sampleGeoJsonResponses.featureCollection.geojson)
    console.log('要素集合图层:', fcLayer)
  }, 4000)
}

/**
 * 模拟AI助手接收GeoJSON响应
 */
export function simulateAiResponse(responseType = 'pointInMessage') {
  const response = sampleGeoJsonResponses[responseType]
  if (!response) {
    console.error('未知的响应类型:', responseType)
    return
  }
  
  console.log('模拟AI响应:', response)
  
  // 如果响应包含直接的geojson字段
  if (response.geojson) {
    displayGeoJsonOnMap(response.geojson)
    return
  }
  
  // 如果响应包含在文本中
  if (response.text) {
    const extracted = extractGeoJsonFromResponse(response.text)
    if (extracted) {
      console.log('从文本中提取到GeoJSON:', extracted)
      displayGeoJsonOnMap(extracted)
    } else {
      console.log('未在文本中找到GeoJSON')
    }
  }
}

// 将测试函数挂载到全局对象，方便在浏览器控制台中调用
if (typeof window !== 'undefined') {
  window.geoJsonTest = {
    testExtraction: testGeoJsonExtraction,
    testMapDisplay: testMapDisplay,
    simulateResponse: simulateAiResponse,
    samples: sampleGeoJsonResponses
  }
  console.log('GeoJSON测试工具已加载。使用 window.geoJsonTest 进行测试。')
}