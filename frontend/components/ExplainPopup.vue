<template>
  <view class="explain-popup" v-if="show">
    <view class="popup-mask" @tap="$emit('close')"></view>
    <view class="popup-panel">
      <view class="popup-header">
        <text class="popup-title">段落解释</text>
        <view class="close-btn" @tap="$emit('close')">
          <text class="close-icon">&#10005;</text>
        </view>
      </view>
      <view class="popup-body">
        <view v-if="loading" class="loading-state">
          <text class="loading-text">翻译中...</text>
        </view>
        <view v-else-if="explanation" class="explanation-content">
          <text class="explanation-text">{{ explanation }}</text>
        </view>
        <view v-if="originalText" class="original-section">
          <text class="original-label">原文</text>
          <text class="original-text">{{ originalText }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    show: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    explanation: { type: String, default: '' },
    originalText: { type: String, default: '' }
  },
  emits: ['close']
}
</script>

<style lang="scss" scoped>
.popup-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 998;
}
.popup-panel {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  max-height: 70vh;
  background: var(--bg, #F6F7FC);
  border-radius: 28rpx 28rpx 0 0;
  z-index: 999;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.25s ease;
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--border, rgba(0,0,0,0.06));
}
.popup-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text, #1A1A1A);
}
.close-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.close-icon {
  font-size: 24rpx;
  color: var(--text-secondary, #8C8C8C);
}
.popup-body {
  padding: 28rpx 32rpx;
  max-height: 50vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.loading-state {
  padding: 32rpx 0;
  text-align: center;
}
.loading-text {
  font-size: 26rpx;
  color: var(--text-secondary, #8C8C8C);
}
.explanation-content {
  margin-bottom: 24rpx;
}
.explanation-text {
  font-size: 28rpx;
  line-height: 1.8;
  color: var(--text, #1A1A1A);
  word-break: break-word;
  white-space: pre-wrap;
}
.original-section {
  padding-top: 20rpx;
  border-top: 1rpx solid var(--border, rgba(0,0,0,0.06));
}
.original-label {
  font-size: 22rpx;
  color: var(--text-secondary, #8C8C8C);
  display: block;
  margin-bottom: 8rpx;
  font-weight: 500;
  letter-spacing: 1rpx;
}
.original-text {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--text-secondary, #8C8C8C);
  word-break: break-word;
  white-space: pre-wrap;
}
</style>
