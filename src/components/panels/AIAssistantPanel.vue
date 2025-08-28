<template>
  <div class="ai-assistant-panel">
    <div class="panel-header">
      <h3>AI 助手</h3>
    </div>

    <div class="panel-content">
      <!-- 对话历史 -->
      <div class="chat-history" ref="chatHistory">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message"
          :class="{ 'user-message': message.type === 'user', 'ai-message': message.type === 'ai' }"
        >
          <div class="message-content">{{ message.content }}</div>
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>

      <!-- 仿 DeepSeek 输入区域 -->
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
            rows="10"
          ></textarea>
          <div class="ds-actions-right">
            <button class="icon-btn" v-if="inputMessage" @click="clearInput" title="清空">
              ×
            </button>
            <button class="send-btn" :disabled="!canSend" @click="sendMessage">发送</button>
          </div>
        </div>
        <div class="ds-footer-row">
          <div class="meta">
            <span class="hint">Enter 发送 · Shift+Enter 换行</span>
            <span class="count" :class="{ warn: remaining < 0 }">{{ inputLength }}/{{ maxLength }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, nextTick, computed, onMounted } from 'vue'

export default {
  name: 'AIAssistantPanel',
  setup() {
    const inputMessage = ref('')
    const chatHistory = ref(null)
    const textareaRef = ref(null)
    const isFocused = ref(false)
    const maxLength = 4000

    const messages = reactive([
      { id: 1, type: 'ai', content: '您好！我是AI助手，请问有什么可以帮助您的？', timestamp: new Date() }
    ])

    const inputLength = computed(() => inputMessage.value.length)
    const remaining = computed(() => maxLength - inputLength.value)
    const canSend = computed(() => inputMessage.value.trim().length > 0 && remaining.value >= 0)
    const placeholder = '向 AI 提问，Enter 发送，Shift+Enter 换行...'

    const autoResize = () => {
      const el = textareaRef.value
      if (!el) return
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 300) + 'px'
    }

    const scrollToBottom = () => {
      if (chatHistory.value) chatHistory.value.scrollTop = chatHistory.value.scrollHeight
    }

    const sendMessage = async () => {
      if (!canSend.value) return
      const content = inputMessage.value.trim()
      const userMessage = { id: Date.now(), type: 'user', content, timestamp: new Date() }
      messages.push(userMessage)
      inputMessage.value = ''
      autoResize()
      await nextTick(); scrollToBottom()
      // 模拟回复
      setTimeout(async () => {
        const aiResponse = { id: Date.now() + 1, type: 'ai', content: generateAIResponse(content), timestamp: new Date() }
        messages.push(aiResponse)
        await nextTick(); scrollToBottom()
      }, 600)
    }

    const onKeyDown = (e) => {
      if (e.key === 'Enter') {
        if (e.shiftKey) {
          // 允许换行
          return
        } else {
          e.preventDefault()
          sendMessage()
        }
      }
    }

    const clearInput = () => {
      inputMessage.value = ''
      autoResize()
    }

    const quickInsert = (text) => {
      inputMessage.value = text
      autoResize()
      nextTick(() => textareaRef.value && textareaRef.value.focus())
    }

    const onFocus = () => { isFocused.value = true }
    const onBlur = () => { isFocused.value = false }

    const generateAIResponse = (input) => {
      const responses = {
        '水质分析': '水质总体良好：pH 正常，溶解氧偏低 0.5mg/L，建议加强复氧。',
        '污染源识别': '疑似上游 500m 工业排口与支流交汇处存在异常 COD 峰值。',
        '监测建议': '建议新增 2 个断面：上游支流入口；下游 1km 敏感取水点。'
      }
      return responses[input] || `已收到：${input}，正在分析相关数据...`
    }

    onMounted(() => autoResize())

    return {
      inputMessage,
      messages,
      chatHistory,
      textareaRef,
      isFocused,
      maxLength,
      inputLength,
      remaining,
      canSend,
      placeholder,
      sendMessage,
      quickInsert,
      onKeyDown,
      autoResize,
      clearInput,
      formatTime: (t) => new Date(t).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
  }
}
</script>

<style scoped>
/* 保留原聊天区样式 */
.ai-assistant-panel { height: 100%; display: flex; flex-direction: column; }
.panel-header { padding: 16px; border-bottom: 1px solid #ddd; background: #fff; }
.panel-header h3 { margin: 0; font-size: 16px; color: #333; }
.panel-content { flex: 1; display: flex; flex-direction: column; padding: 16px; }
.chat-history { flex: 1; overflow-y: auto; margin-bottom: 16px; border: 1px solid #e1e5e9; border-radius: 8px; padding: 12px; background: #f8f9fa; }
.message { margin-bottom: 16px; }
.message:last-child { margin-bottom: 0; }
.user-message .message-content { background: #007bff; color: #fff; margin-left: 20%; }
.ai-message .message-content { background: #fff; color: #333; margin-right: 20%; border: 1px solid #e1e5e9; }
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
.tips { display: flex; gap: 6px; flex-wrap: wrap; }
.tip-chip { background: #eef1f4; border: 1px solid #d8dde2; font-size: 12px; padding: 4px 10px; border-radius: 14px; cursor: pointer; color: #4a5660; transition: all .2s; user-select: none; }
.tip-chip:hover { background: #e3e8ec; border-color: #b5c0c9; }
.meta { display: flex; gap: 10px; align-items: center; font-size: 12px; color: #6b7480; }
.count { font-variant-numeric: tabular-nums; }
.count.warn { color: #d93025; }
.hint { color: #98a2ae; }
</style>
