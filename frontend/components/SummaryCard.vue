<template>
  <view class="summary-card" v-if="summary">
    <view class="card-header">
      <text class="card-title">研究摘要</text>
      <view class="copy-btn" @tap="copyAll">
        <text class="copy-label">{{ copied ? '已复制 ✓' : '复制' }}</text>
      </view>
    </view>
    <view class="card-body">
      <view class="summary-text">
        <view v-for="(para, pIndex) in paragraphs" :key="pIndex" class="para-wrap">
          <view class="token-container">
            <text
              v-for="(token, tIndex) in tokenize(para)"
              :key="`${pIndex}-${tIndex}`"
              :class="token.isWord ? 'word-token' : 'plain-token'"
              @tap="token.isWord ? onWordTap(token.text, $event) : null"
            >{{ token.text }}</text>
          </view>
          <view class="explain-btn" @tap="onExplain(para, pIndex)">
            <text class="explain-label">解释</text>
          </view>
        </view>
      </view>
    </view>
    <view v-if="streaming" class="streaming-cursor">
      <text class="cursor">|</text>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    summary: { type: String, default: '' },
    streaming: { type: Boolean, default: false }
  },
  emits: ['word-tap', 'explain'],
  data() {
    return { copied: false }
  },
  computed: {
    paragraphs() {
      return this.summary.split('\n').filter(p => p.trim())
    }
  },
  methods: {
    preserveSpacing(text) {
      return String(text).replace(/[ \t]+/g, match => '\u00A0'.repeat(match.length))
    },
    tokenize(text) {
      const tokens = []
      const pattern = /[A-Za-z]+(?:['-][A-Za-z]+)*/g
      let lastIndex = 0
      let match

      while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
          tokens.push({ text: this.preserveSpacing(text.slice(lastIndex, match.index)), isWord: false })
        }
        tokens.push({ text: match[0], isWord: true })
        lastIndex = match.index + match[0].length
      }

      if (lastIndex < text.length) {
        tokens.push({ text: this.preserveSpacing(text.slice(lastIndex)), isWord: false })
      }

      return tokens
    },
    onWordTap(word, e) {
      const cleanWord = word.replace(/[^a-zA-Z'-]/g, '')
      if (cleanWord) {
        const touch = e.touches && e.touches[0]
        const targetRect = e.currentTarget?.getBoundingClientRect ? e.currentTarget.getBoundingClientRect() : null
        this.$emit('word-tap', {
          word: cleanWord,
          x: touch ? touch.clientX : (e.detail?.x || e.clientX || (targetRect ? targetRect.left + targetRect.width / 2 : 0)),
          y: touch ? touch.clientY : (e.detail?.y || e.clientY || (targetRect ? targetRect.top : 0))
        })
      }
    },
    onExplain(paragraph, index) {
      this.$emit('explain', { paragraph, index })
    },
    copyAll() {
      uni.setClipboardData({
        data: this.summary,
        success: () => {
          this.copied = true
          setTimeout(() => { this.copied = false }, 1500)
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.summary-card {
  margin: 24rpx 0;
  padding: 28rpx;
  background: var(--bg-card, #FFFFFF);
  border-radius: 24rpx;
  border: 1rpx solid var(--border, rgba(0,0,0,0.06));
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.card-title {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-secondary, #8C8C8C);
  letter-spacing: 1rpx;
  text-transform: uppercase;
}
.copy-btn {
  padding: 6rpx 18rpx;
  border-radius: 12rpx;
  background: var(--accent-light, rgba(37,99,235,0.08));
}
.copy-label {
  font-size: 22rpx;
  color: var(--accent, #3157D5);
}
.para-wrap {
  margin-bottom: 24rpx;
}
.plain-token, .word-token {
  font-size: 27rpx;
  line-height: 1.8;
  color: var(--text, #1A1A1A);
}
.token-container {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
}
.word-token {
  border-radius: 4rpx;
}
.word-token:active {
  background: var(--accent-light, rgba(37,99,235,0.08));
  color: var(--accent, #3157D5);
}
.explain-btn {
  display: inline-flex;
  margin-top: 8rpx;
  padding: 4rpx 16rpx;
  border-radius: 10rpx;
  background: var(--accent-light, rgba(37,99,235,0.08));
}
.explain-label {
  font-size: 22rpx;
  color: var(--accent, #3157D5);
}
.streaming-cursor {
  margin-top: 8rpx;
}
.cursor {
  color: var(--accent, #3157D5);
  animation: blink 1s step-end infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .cursor {
    animation: none;
  }
}
</style>
