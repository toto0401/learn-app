<template>
  <view class="word-bubble" v-if="show" :style="bubbleStyle" @tap.stop>
    <view class="bubble-content">
      <text class="bubble-word">{{ word }}</text>
      <text v-if="loading" class="bubble-loading">...</text>
      <text v-else class="bubble-translation">{{ translation }}</text>
      <view
        v-if="!loading"
        class="bubble-action"
        :class="{ saved }"
        @tap="onAdd"
      >
        <text class="bubble-action-text">{{ saved ? '已加入词汇表' : '加入词汇表' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    show: { type: Boolean, default: false },
    word: { type: String, default: '' },
    translation: { type: String, default: '' },
    loading: { type: Boolean, default: false },
    saved: { type: Boolean, default: false },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  emits: ['add-vocab'],
  computed: {
    bubbleStyle() {
      return { left: `${this.x}px`, top: `${this.y - 70}px` }
    }
  },
  methods: {
    onAdd() {
      if (this.loading || this.saved) return
      this.$emit('add-vocab')
    }
  }
}
</script>

<style lang="scss" scoped>
.word-bubble {
  position: fixed;
  z-index: 1000;
  transform: translateX(-50%);
  animation: fadeIn 0.15s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(4rpx); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
.bubble-content {
  background: var(--text, #1A1A1A);
  padding: 14rpx 22rpx 12rpx;
  border-radius: 10rpx;
  min-width: 100rpx;
  max-width: 360rpx;
  text-align: center;
}
.bubble-word {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.6);
  display: block;
  margin-bottom: 2rpx;
}
.bubble-translation {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
  display: block;
}
.bubble-loading {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.6);
  animation: dots 1s infinite;
}
.bubble-action {
  margin-top: 10rpx;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.12);
  border: 1rpx solid rgba(255, 255, 255, 0.15);
}
.bubble-action.saved {
  background: rgba(37, 99, 235, 0.24);
  border-color: rgba(96, 165, 250, 0.4);
}
.bubble-action-text {
  font-size: 22rpx;
  color: #fff;
}
@keyframes dots {
  0%, 20% { opacity: 0.3; }
  50% { opacity: 1; }
  80%, 100% { opacity: 0.3; }
}
</style>
