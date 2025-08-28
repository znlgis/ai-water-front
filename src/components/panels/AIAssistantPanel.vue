<template>
  <div class="ai-assistant-panel">
    <div class="panel-header">
      <h3>AI 助手</h3>
      <div class="header-actions">
        <button class="clear-geo-btn" @click="clearGeoJsonFromMap" title="清除地图标记">🗺️ 清除</button>
        <div class="status" v-if="!hasApiKey">⚠ 未配置 VITE_DIFY_API_KEY</div>
      </div>
    </div>

    <div class="panel-content">
      <!-- 对话历史 -->
      <div class="chat-history" ref="chatHistory">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message"
          :class="{ 
            'user-message': message.type === 'user', 
            'ai-message': message.type === 'ai', 
            'error-message': message.error,
            'geo-notification': message.isGeoJsonNotification
          }"
        >
          <div class="message-content">
            <template v-if="message.error">{{ message.error }}</template>
            <template v-else>
              <!-- 表格模式 -->
              <template v-if="message.isTable && message.tableColumns && message.tableRows">
                <div class="table-controls">
                  <div class="left-group">
                    <label>每页
                      <select v-model.number="message.pageSize" @change="message.currentPage=1">
                        <option :value="10">10</option>
                        <option :value="20">20</option>
                        <option :value="50">50</option>
                        <option :value="100">100</option>
                      </select>
                    条</label>
                    <input class="filter-input" v-model="message.filterText" placeholder="过滤..." @input="message.currentPage=1" />
                    <button class="mini-btn" @click="exportCSV(message)">导出CSV</button>
                    <button class="mini-btn" @click="resetColumns(message)" v-if="message._colOrderChanged">重置列</button>
                  </div>
                  <div class="pager">
                    <button class="mini-btn" :disabled="message.currentPage===1" @click="message.currentPage=1">«</button>
                    <button class="mini-btn" :disabled="message.currentPage===1" @click="message.currentPage--">‹</button>
                    <span>{{ message.currentPage }}/{{ totalPages(message) }}</span>
                    <button class="mini-btn" :disabled="message.currentPage>=totalPages(message)" @click="message.currentPage++">›</button>
                    <button class="mini-btn" :disabled="message.currentPage>=totalPages(message)" @click="message.currentPage=totalPages(message)">»</button>
                  </div>
                </div>
                <div class="table-wrapper enhanced">
                  <table class="ai-table enhanced" @dragover.prevent>
                    <thead>
                      <tr>
                        <th v-for="(col,cIdx) in message.tableColumns" :key="col" draggable="true"
                            @dragstart="onHeaderDragStart($event,message,cIdx)" @drop="onHeaderDrop($event,message,cIdx)"
                            :class="{ sortable: true, sorted: message.sortCol===col }"
                            @click="toggleSort(message,col)" :style="colStyle(message,col)">
                          <div class="th-inner">
                            <span class="col-label">{{ col }}</span>
                            <span class="sort-indicator" v-if="message.sortCol===col">{{ message.sortDir==='asc' ? '▲':'▼' }}</span>
                            <span class="resize-handle" @mousedown.stop="startColResize($event,message,col)"></span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row,rIdx) in pagedRows(message)" :key="rIdx" @click="locateRowGeometry(message, visibleRowIndex(message,rIdx))" class="data-row" :title="rowHasGeom(message, visibleRowIndex(message,rIdx)) ? '点击定位' : ''">
                        <td v-for="col in message.tableColumns" :key="col" :style="colStyle(message,col)">
                          <template v-if="col === 'geom'">{{ rowHasGeom(message, visibleRowIndex(message,rIdx)) ? '点击行定位' : '' }}</template>
                          <template v-else>{{ formatCell(row[col]) }}</template>
                        </td>
                      </tr>
                      <tr v-if="!pagedRows(message).length">
                        <td :colspan="message.tableColumns.length" class="empty-tip">无数据</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
              <!-- 普通文本模式 -->
              <template v-else>{{ message.content }}</template>
            </template>
          </div>
          <div class="message-time">
            {{ formatTime(message.timestamp) }}
            <span v-if="message.streaming" class="streaming-dot">●</span>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="ds-input-wrapper" :class="{ focused: isFocused }">
        <div class="ds-textarea-container">
          <textarea
            ref="textareaRef"
            v-model="inputMessage"
            class="ds-textarea"
            :placeholder="placeholder"
            @focus="onFocus"
            @blur="onBlur"
            @keydown="onKeyDown"
            @input="autoResize"
            rows="3"
            :disabled="isStreaming"
          ></textarea>
          <div class="ds-actions-right">
            <button class="icon-btn" v-if="inputMessage && !isStreaming" @click="clearInput" title="清空">×</button>
            <button class="cancel-btn" v-if="isStreaming" @click="cancelStream" title="取消">取消</button>
            <button class="send-btn" :disabled="!canSend || isStreaming || !hasApiKey" @click="sendMessage">发送</button>
          </div>
        </div>
        <div class="ds-footer-row">
          <div class="meta">
            <span class="hint">Enter 发送 · Shift+Enter 换行</span>
            <span class="count" :class="{ warn: remaining < 0 }">{{ inputLength }}/{{ maxLength }}</span>
            <span v-if="isStreaming" class="streaming-hint">生成中...</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, nextTick, computed, onMounted, onBeforeUnmount } from 'vue'
import { sendChatMessage } from '../../services/difyClient.js'
import { displayGeoJsonOnMap, clearGeoJsonLayers } from '../../services/geoJsonService.js'

export default {
  name: 'AIAssistantPanel',
  setup() {
    const inputMessage = ref('')
    const chatHistory = ref(null)
    const textareaRef = ref(null)
    const isFocused = ref(false)
    const maxLength = 4000
    const isStreaming = ref(false)
    const abortCtrl = ref(null)
    const hasApiKey = !!import.meta.env.VITE_DIFY_API_KEY

    const messages = reactive([
      { id: 1, type: 'ai', content: '您好！我是AI助手，请问有什么可以帮助您的？', timestamp: new Date() }
    ])

    const inputLength = computed(() => inputMessage.value.length)
    const remaining = computed(() => maxLength - inputLength.value)
    const canSend = computed(() => inputMessage.value.trim().length > 0 && remaining.value >= 0)
    const placeholder = hasApiKey ? '向 AI 提问，Enter 发送，Shift+Enter 换行...' : '缺少 VITE_DIFY_API_KEY，无法调用 Dify API'

    // 列宽拖拽状态
    const resizing = ref({ active:false, messageId:null, col:null, startX:0, startWidth:0 })

    const ensureTableState = (msg) => {
      if (!msg.isTable) return
      if (!msg._tableInited) {
        msg.pageSize = 20
        msg.currentPage = 1
        msg.filterText = ''
        msg.sortCol = null
        msg.sortDir = 'asc'
        msg.originalColumns = [...msg.tableColumns]
        msg.colWidths = {} // col -> px
        msg._tableInited = true
      }
    }

    const tryConvertMessageToTable = (msg) => {
      if (!msg || !msg.content) return
      const raw = msg.content.trim()
      let arr = null
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) arr = parsed
        else if (parsed && Array.isArray(parsed.data)) arr = parsed.data
        else if (parsed && typeof parsed.data === 'string') {
          try { const inner = JSON.parse(parsed.data); if (Array.isArray(inner)) arr = inner; else if (inner && typeof inner==='object') arr=[inner] } catch(_){}
        }
      } catch(_){}
      if (!arr || !arr.length) return
      if (!arr.every(r=>r && typeof r==='object' && !Array.isArray(r))) return
      const colSet = new Set(); arr.forEach(r=>Object.keys(r).forEach(k=>colSet.add(k)))
      const columns = Array.from(colSet).sort((a,b)=>(a==='geom') - (b==='geom'))
      const geometryMap = []
      const rows = arr.map((r,i)=>{ const copy={...r}; if (copy.geom){ try{ geometryMap[i]= typeof copy.geom==='string'? JSON.parse(copy.geom):copy.geom }catch{ geometryMap[i]=null } } else geometryMap[i]=null; return copy })
      msg.isTable = true
      msg.tableColumns = columns
      msg.tableRows = rows
      msg.geometryMap = geometryMap
      ensureTableState(msg)
    }

    // 数据处理
    const baseFilteredRows = (msg) => {
      ensureTableState(msg)
      if (!msg.isTable) return []
      let rows = msg.tableRows
      if (msg.filterText) {
        const ft = msg.filterText.toLowerCase()
        rows = rows.filter(r=> msg.tableColumns.some(c=> String(r[c]??'').toLowerCase().includes(ft)))
      }
      if (msg.sortCol) {
        const col = msg.sortCol; const dir = msg.sortDir==='asc'?1:-1
        rows = [...rows].sort((a,b)=>{ const va=a[col]; const vb=b[col]; if (va==null && vb==null) return 0; if (va==null) return -1*dir; if (vb==null) return 1*dir; if (typeof va==='number' && typeof vb==='number') return (va-vb)*dir; return String(va).localeCompare(String(vb))*dir })
      }
      return rows
    }
    const totalPages = (msg) => { ensureTableState(msg); const total = baseFilteredRows(msg).length; return total ? Math.ceil(total / msg.pageSize) : 1 }
    const pagedRows = (msg) => { ensureTableState(msg); const rows = baseFilteredRows(msg); const start=(msg.currentPage-1)*msg.pageSize; return rows.slice(start,start+msg.pageSize) }
    const visibleRowIndex = (msg, localIdx) => { return (msg.currentPage-1)*msg.pageSize + localIdx }
    const rowHasGeom = (msg, realIdx) => !!(msg.geometryMap && msg.geometryMap[realIdx])

    const toggleSort = (msg, col) => {
      ensureTableState(msg)
      if (msg.sortCol !== col) { msg.sortCol = col; msg.sortDir = 'asc' } else { msg.sortDir = msg.sortDir==='asc' ? 'desc' : 'asc' }
    }

    const resetColumns = (msg) => {
      if (!msg.originalColumns) return
      msg.tableColumns = [...msg.originalColumns]
      msg._colOrderChanged = false
    }

    const startColResize = (e,msg,col) => {
      ensureTableState(msg)
      const th = e.target.closest('th')
      const startWidth = th ? th.offsetWidth : 120
      resizing.value = { active:true, messageId:msg.id, col, startX:e.clientX, startWidth }
      document.body.classList.add('resizing-col')
    }

    const onMouseMove = (e) => {
      if (!resizing.value.active) return
      const delta = e.clientX - resizing.value.startX
      const newW = Math.max(60, resizing.value.startWidth + delta)
      const msg = messages.find(m=>m.id===resizing.value.messageId)
      if (msg) { ensureTableState(msg); msg.colWidths[resizing.value.col] = newW + 'px' }
    }
    const onMouseUp = () => {
      if (resizing.value.active) { resizing.value.active=false; document.body.classList.remove('resizing-col') }
    }

    const colStyle = (msg,col) => { ensureTableState(msg); const w = msg.colWidths && msg.colWidths[col]; return w ? { width:w, maxWidth:w } : {} }

    const onHeaderDragStart = (ev,msg, idx) => {
      ensureTableState(msg)
      ev.dataTransfer.effectAllowed = 'move'
      ev.dataTransfer.setData('text/col-index', String(idx))
    }
    const onHeaderDrop = (ev,msg, targetIdx) => {
      ensureTableState(msg)
      const srcIdx = parseInt(ev.dataTransfer.getData('text/col-index'),10)
      if (isNaN(srcIdx) || srcIdx===targetIdx) return
      const arr = [...msg.tableColumns]
      const [moved] = arr.splice(srcIdx,1)
      arr.splice(targetIdx,0,moved)
      msg.tableColumns = arr
      msg._colOrderChanged = JSON.stringify(arr) !== JSON.stringify(msg.originalColumns)
    }

    const exportCSV = (msg) => {
      ensureTableState(msg)
      const rows = baseFilteredRows(msg)
      const cols = msg.tableColumns
      const lines = []
      lines.push(cols.map(c=> '"'+String(c).replace(/"/g,'""')+'"').join(','))
      rows.forEach(r=>{
        lines.push(cols.map(c=> { const v=r[c]; if (v==null) return ''; const s = typeof v==='object'? JSON.stringify(v): String(v); return '"'+ s.replace(/"/g,'""') +'"' }).join(','))
      })
      const csv = lines.join('\n')
      const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'table_export_'+ msg.id + '.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const formatCell = (val) => {
      // 日期格式化优先
      const tryFormatDate = (v) => {
        if (v == null) return null
        // 数字：判断为时间戳（秒或毫秒）
        if (typeof v === 'number') {
          let ms = v
            if (v < 1e11 && v > 1e9) { // 10位秒级时间戳
              ms = v * 1000
            }
          if (ms > 1e11) { // 合理的毫秒时间戳范围
            const d = new Date(ms)
            if (!isNaN(d.getTime())) return d.toISOString().slice(0,10)
          }
          return null
        }
        if (typeof v === 'string') {
          const s = v.trim()
          if (!s) return null
          // 已是 yyyy-MM-dd
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
          // 10或13位纯数字 -> 时间戳
          if (/^\d{10}$/.test(s)) {
            const d = new Date(parseInt(s,10)*1000)
            if (!isNaN(d.getTime())) return d.toISOString().slice(0,10)
          }
          if (/^\d{13}$/.test(s)) {
            const d = new Date(parseInt(s,10))
            if (!isNaN(d.getTime())) return d.toISOString().slice(0,10)
          }
          // 常见日期时间格式(含 T 或 空格)
          if (/T|\s/.test(s) && /\d{4}-\d{2}-\d{2}/.test(s)) {
            const d = new Date(s.replace(/ /,'T'))
            if (!isNaN(d.getTime())) return d.toISOString().slice(0,10)
          }
          return null
        }
        return null
      }
      const formatted = tryFormatDate(val)
      if (formatted) return formatted
      if (val == null) return ''
      if (typeof val === 'object') { try { return JSON.stringify(val) } catch { return '[Obj]' } }
      const s = String(val)
      return s.length > 120 ? s.slice(0,117)+'…' : s
    }

    const locateRowGeometry = (message, realIdx) => {
      if (!message?.geometryMap) return
      const geom = message.geometryMap[realIdx]
      if (!geom) return
      displayGeoJsonOnMap(geom)
    }

    const autoResize = () => { const el = textareaRef.value; if (!el) return; el.style.height='auto'; el.style.height = Math.min(el.scrollHeight,300)+'px' }
    const scrollToBottom = () => { if (chatHistory.value) chatHistory.value.scrollTop = chatHistory.value.scrollHeight }

    const sendMessage = async () => {
      if (!canSend.value || isStreaming.value) return
      const content = inputMessage.value.trim()
      const userMessage = { id: Date.now(), type: 'user', content, timestamp: new Date() }
      messages.push(userMessage)
      inputMessage.value=''
      autoResize(); await nextTick(); scrollToBottom()
      const aiMsg = { id: userMessage.id + 1, type: 'ai', content: '', timestamp: new Date(), streaming: true }
      messages.push(aiMsg); await nextTick(); scrollToBottom()
      isStreaming.value = true; abortCtrl.value = new AbortController()
      sendChatMessage(content, {
        onMessage: (chunk) => { if (chunk.startsWith(aiMsg.content) && chunk.length>aiMsg.content.length) aiMsg.content=chunk; else if (!aiMsg.content.endsWith(chunk)) aiMsg.content+=chunk; nextTick(scrollToBottom) },
        onCompleted: () => { aiMsg.streaming=false; isStreaming.value=false; abortCtrl.value=null; tryConvertMessageToTable(aiMsg); nextTick(scrollToBottom) },
        onError: (err) => { aiMsg.streaming=false; isStreaming.value=false; abortCtrl.value=null; if (!aiMsg.content) aiMsg.error='发生错误: '+err.message },
        onGeoJsonDetected: (geoJsonData) => { console.log('检测到GeoJSON数据:', geoJsonData); const layer = displayGeoJsonOnMap(geoJsonData); if (layer) { const geoMsg={ id:Date.now()+Math.random(), type:'ai', content:'🗺️ 已在地图上标记GeoJSON数据', timestamp:new Date(), isGeoJsonNotification:true }; messages.push(geoMsg); nextTick(scrollToBottom) } },
        abortSignal: abortCtrl.value.signal, stream:true, inputs:{}, user:'web-user'
      })
    }

    const cancelStream = () => { if (abortCtrl.value) abortCtrl.value.abort() }
    const onKeyDown = (e) => { if (e.key==='Enter') { if (e.shiftKey) return; e.preventDefault(); sendMessage() } }
    const clearInput = () => { inputMessage.value=''; autoResize() }
    const onFocus = () => { isFocused.value=true }; const onBlur = () => { isFocused.value=false }

    const clearGeoJsonFromMap = () => { clearGeoJsonLayers(); const clearMsg={ id:Date.now()+Math.random(), type:'ai', content:'🗺️ 已清除地图上的所有GeoJSON标记', timestamp:new Date(), isGeoJsonNotification:true }; messages.push(clearMsg); nextTick(scrollToBottom) }

    onMounted(()=> { autoResize(); window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp) })
    onBeforeUnmount(()=> { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) })

    return {
      inputMessage, messages, chatHistory, textareaRef, isFocused, maxLength, inputLength, remaining, canSend, placeholder,
      sendMessage, onKeyDown, autoResize, clearInput, isStreaming, cancelStream, hasApiKey, onFocus, onBlur, clearGeoJsonFromMap,
      formatTime: (t)=> new Date(t).toLocaleTimeString('zh-CN',{hour:'2-digit', minute:'2-digit'}),
      // table helpers
      pagedRows, totalPages, toggleSort, startColResize, colStyle, exportCSV, formatCell, locateRowGeometry, visibleRowIndex, rowHasGeom,
      onHeaderDragStart, onHeaderDrop, resetColumns
    }
  }
}
</script>

<style scoped>
/* 保留原聊天区样式 */
.ai-assistant-panel { height: 100%; display: flex; flex-direction: column; }
.panel-header { padding: 16px; border-bottom: 1px solid #ddd; background: #fff; display: flex; justify-content: space-between; align-items: center; }
.panel-header h3 { margin: 0; font-size: 16px; color: #333; }
.header-actions { display: flex; align-items: center; gap: 10px; }
.clear-geo-btn { background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; }
.clear-geo-btn:hover { background: #218838; }
/* 关键调整: 让内容区本身不滚动, 仅聊天区滚动 */
.panel-content { flex: 1; display: flex; flex-direction: column; padding: 16px; overflow: hidden; }
/* 关键调整: 允许 flex 子项收缩产生滚动条; 设置最大高度作为上限 */
.chat-history { flex: 1; min-height: 0; overflow-y: auto; margin-bottom: 16px; border: 1px solid #e1e5e9; border-radius: 8px; padding: 12px; background: #f8f9fa; /* 可选: 若外部容器高度不足, 仍以父级为准 */ }
.message { margin-bottom: 16px; }
.message:last-child { margin-bottom: 0; }
.user-message .message-content { background: #007bff; color: #fff; margin-left: 20%; }
.ai-message .message-content { background: #fff; color: #333; margin-right: 20%; border: 1px solid #e1e5e9; }
.ai-message.geo-notification .message-content { background: #e8f5e8; border-color: #28a745; color: #155724; }
.message-content { padding: 12px; border-radius: 12px; line-height: 1.4; font-size: 14px; word-break: break-word; }
.message-time { text-align: center; font-size: 12px; color: #666; margin-top: 4px; }

/* 新 DeepSeek 风格输入区域 */
.ds-input-wrapper { border: 1px solid #e2e5e9; background: #f5f7fa; border-radius: 20px; padding: 12px 14px 10px; box-shadow: inset 0 0 0 1px #f5f7fa; transition: all .18s; }
.ds-input-wrapper.focused { background: #fff; border-color: #b4c2d1; box-shadow: 0 0 0 2px rgba(0,123,255,.15); }
.ds-textarea-container { display: flex; align-items: flex-end; }
.ds-textarea { flex: 1; resize: none; border: none; background: transparent; font: 14px/1.5 inherit; padding: 0; max-height: 300px; overflow-y: auto; outline: none; }
.ds-textarea::placeholder { color: #99a1ab; }
.ds-actions-right { display: flex; align-items: center; gap: 6px; margin-left: 8px; }
.icon-btn { border: none; background: #e9edf1; width: 26px; height: 26px; border-radius: 6px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; color: #444; }
.icon-btn:hover { background: #dce2e7; }
.send-btn { border: none; background: #007bff; color: #fff; padding: 6px 14px; border-radius: 8px; font-size: 13px; cursor: pointer; transition: background .2s; }
.send-btn:disabled { background: #b5c3d1; cursor: not-allowed; }
.send-btn:not(:disabled):hover { background: #0062cc; }
.ds-footer-row { margin-top: 6px; display: flex; justify-content: space-between; align-items: center; }
.meta { display: flex; gap: 10px; align-items: center; font-size: 12px; color: #6b7480; }
.count { font-variant-numeric: tabular-nums; }
.count.warn { color: #d93025; }
.hint { color: #98a2ae; }
.error-message .message-content { background: #ffecec; color: #b40000; border: 1px solid #f5b5b5; }
.streaming-dot { color: #0a84ff; margin-left: 4px; animation: blink 1s infinite; font-size: 10px; }
.streaming-hint { color: #0a84ff; animation: blink 1s infinite; }
.cancel-btn { border: none; background: #ffb347; color: #fff; padding: 6px 10px; border-radius: 8px; font-size: 13px; cursor: pointer; }
.cancel-btn:hover { background: #ff9f1a; }
.status { font-size: 12px; color: #d35400; margin-left: 12px; }

.ai-table { width: 100%; border-collapse: collapse; font-size: 13px; background:#fff; }
.ai-table th, .ai-table td { border: 1px solid #e1e5e9; padding: 4px 6px; text-align: left; vertical-align: top; }
.ai-table thead th { background: #f1f3f5; font-weight: 600; }
.table-wrapper { overflow: auto; max-height: 320px; }
.ai-table a { color: #0a84ff; text-decoration: none; }

.table-controls { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap; }
.table-controls .left-group { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.table-controls select, .filter-input { font-size:12px; padding:2px 4px; }
.filter-input { border:1px solid #d0d5db; border-radius:4px; }
.mini-btn { background:#edf0f3; border:1px solid #cfd5db; border-radius:4px; font-size:12px; padding:2px 6px; cursor:pointer; }
.mini-btn:disabled { opacity:.4; cursor:not-allowed; }
.mini-btn:hover:not(:disabled){ background:#e0e5ea; }
.ai-table.enhanced { table-layout:fixed; }
.ai-table.enhanced th, .ai-table.enhanced td { position:relative; }
.th-inner { display:flex; align-items:center; gap:4px; user-select:none; }
.resize-handle { position:absolute; top:0; right:0; width:6px; cursor:col-resize; height:100%; }
.sortable { cursor:pointer; }
.sort-indicator { font-size:10px; color:#555; }
.data-row { cursor:pointer; }
.data-row:hover { background:#f2f6fa; }
.empty-tip { text-align:center; color:#888; font-size:12px; }
/* 替换列宽拖拽全局样式 */
:global(body.resizing-col), :global(body.resizing-col *) { cursor:col-resize !important; user-select:none !important; }
.table-wrapper.enhanced { max-height:360px; }

@keyframes blink { 0%,100% { opacity: 1 } 50% { opacity: 0.2 } }
</style>
