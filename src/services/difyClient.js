// Dify Chat API 客户端封装
// 参考：https://docs.dify.ai (通用 Chat Messages 接口)
// 需要在 .env 或 .env.local 中配置：
// VITE_DIFY_API_KEY=xxx
// 可选：VITE_DIFY_BASE_URL=https://api.dify.ai

import { extractGeoJsonFromResponse } from './geoJsonService.js'

const API_KEY = import.meta.env.VITE_DIFY_API_KEY
const BASE_URL = (import.meta.env.VITE_DIFY_BASE_URL || 'https://api.dify.ai').replace(/\/$/, '')

if (!API_KEY) {
  // 仅控制台警告，不抛错，方便页面加载
  // eslint-disable-next-line no-console
  console.warn('[difyClient] 未检测到 VITE_DIFY_API_KEY，AI 助手将无法正常调用。')
}

/**
 * 发送聊天消息（支持流式 & 普通）
 * @param {string} query 用户输入
 * @param {Object} opt 回调与控制
 * @param {(chunk:string)=>void} opt.onMessage 流式增量文本
 * @param {()=>void} opt.onCompleted 完成
 * @param {(err:Error)=>void} opt.onError 错误
 * @param {(geoJson:Object)=>void} opt.onGeoJsonDetected 检测到GeoJSON时的回调
 * @param {AbortSignal} opt.abortSignal 取消信号
 * @param {Object} opt.inputs 传给工作流 / Agent 的自定义变量
 * @param {boolean} opt.stream 是否使用流（默认 true）
 * @param {string} opt.user 区分用户（多会话隔离）
 */
export async function sendChatMessage(query, opt = {}) {
  const {
    onMessage = () => {},
    onCompleted = () => {},
    onError = () => {},
    onGeoJsonDetected = () => {},
    abortSignal,
    inputs = {},
    stream = true,
    user = 'web-user'
  } = opt

  if (!API_KEY) {
    onError(new Error('缺少 Dify API Key'))
    return
  }

  const url = BASE_URL + '/v1/chat-messages'
  const body = {
    inputs,
    query,
    response_mode: stream ? 'streaming' : 'blocking',
    user
  }

  try {
    if (stream) {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: abortSignal
      })
      if (!resp.ok || !resp.body) {
        throw new Error(`HTTP ${resp.status}`)
      }
      const reader = resp.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let fullResponseText = '' // 累积完整的响应文本
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        // SSE 按行解析
        let idx
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx).trim()
            buffer = buffer.slice(idx + 1)
          if (!line) continue
          if (line.startsWith('data:')) {
            const dataStr = line.slice(5).trim()
            if (dataStr === '[DONE]') {
              // 在流结束时检查GeoJSON
              const geoJsonData = extractGeoJsonFromResponse(fullResponseText)
              if (geoJsonData) {
                onGeoJsonDetected(geoJsonData)
              }
              onCompleted()
              return
            }
            try {
              const json = JSON.parse(dataStr)
              // Dify 流事件：{"event":"message","answer":"..."}
              const answer = json.answer || ''
              if (answer) {
                fullResponseText += answer // 累积响应文本
                onMessage(answer)
              }
            } catch (e) {
              // 忽略单行解析错误
            }
          }
        }
      }
      // 流结束时再次检查GeoJSON（防止遗漏）
      const geoJsonData = extractGeoJsonFromResponse(fullResponseText)
      if (geoJsonData) {
        onGeoJsonDetected(geoJsonData)
      }
      onCompleted()
    } else {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: abortSignal
      })
      const json = await resp.json()
      if (json && json.answer) {
        onMessage(json.answer)
        // 检查GeoJSON
        const geoJsonData = extractGeoJsonFromResponse(json.answer)
        if (geoJsonData) {
          onGeoJsonDetected(geoJsonData)
        }
      }
      onCompleted()
    }
  } catch (err) {
    if (abortSignal?.aborted) {
      onError(new Error('已取消'))
    } else {
      onError(err)
    }
  }
}

/**
 * 简单健康检查（非必须）
 */
export async function checkDifyHealth() {
  if (!API_KEY) return { ok: false, reason: '缺少 API KEY' }
  try {
    // 使用 blocking 发送一个轻量测试
    const resp = await fetch(BASE_URL + '/v1/chat-messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: 'ping', inputs: {}, response_mode: 'blocking', user: 'health-check' })
    })
    if (!resp.ok) return { ok: false, reason: 'HTTP ' + resp.status }
    const json = await resp.json()
    return { ok: true, answer: json.answer }
  } catch (e) {
    return { ok: false, reason: e.message }
  }
}

