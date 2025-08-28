<template>
  <div class="ai-assistant-panel">
    <div class="panel-header">
      <h3>AI 助手</h3>
      <div class="status" v-if="!hasApiKey">⚠ 未配置 VITE_DIFY_API_KEY</div>
    </div>

    <div class="panel-content">
      <!-- 对话历史 -->
      <div class="chat-history" ref="chatHistory">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message"
          :class="{ 'user-message': message.type === 'user', 'ai-message': message.type === 'ai', 'error-message': message.error }"
        >
          <div class="message-content">
            <template v-if="message.error">{{ message.error }}</template>
            <template v-else>{{ message.content }}</template>
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
            rows="10"
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
import { ref, reactive, nextTick, computed, onMounted } from 'vue'
import { sendChatMessage } from '../../services/difyClient.js'

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
      if (!canSend.value || isStreaming.value) return
      const content = inputMessage.value.trim()
      const userMessage = { id: Date.now(), type: 'user', content, timestamp: new Date() }
      messages.push(userMessage)
      inputMessage.value = ''
      autoResize()
      await nextTick(); scrollToBottom()

      // 预先插入一个 AI 占位消息
      const aiMsg = { id: userMessage.id + 1, type: 'ai', content: '', timestamp: new Date(), streaming: true }
      messages.push(aiMsg)
      await nextTick(); scrollToBottom()

      isStreaming.value = true
      abortCtrl.value = new AbortController()

      sendChatMessage(content, {
        onMessage: (chunk) => {
          // 兼容 Dify 可能返回累计全文或增量片段
          if (chunk.startsWith(aiMsg.content) && chunk.length > aiMsg.content.length) {
            aiMsg.content = chunk // 累计全文
          } else if (!aiMsg.content.endsWith(chunk)) {
            aiMsg.content += chunk // 追加增量
          }
          nextTick(scrollToBottom)
        },
        onCompleted: () => {
          aiMsg.streaming = false
          isStreaming.value = false
          abortCtrl.value = null
          nextTick(scrollToBottom)
        },
        onError: (err) => {
          aiMsg.streaming = false
            isStreaming.value = false
            abortCtrl.value = null
            if (!aiMsg.content) aiMsg.error = '发生错误: ' + err.message
        },
        abortSignal: abortCtrl.value.signal,
        stream: true,
        inputs: {},
        user: 'web-user'
      })
    }

    const cancelStream = () => {
      if (abortCtrl.value) {
        abortCtrl.value.abort()
      }
    }

    const onKeyDown = (e) => {
      if (e.key === 'Enter') {
        if (e.shiftKey) return
        e.preventDefault()
        sendMessage()
      }
    }

    const clearInput = () => {
      inputMessage.value = ''
      autoResize()
    }

    const onFocus = () => { isFocused.value = true }
    const onBlur = () => { isFocused.value = false }

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
      onKeyDown,
      autoResize,
      clearInput,
      isStreaming,
      cancelStream,
      hasApiKey,
      onFocus,
      onBlur,
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
@keyframes blink { 0%,100% { opacity: 1 } 50% { opacity: 0.2 } }
</style>
