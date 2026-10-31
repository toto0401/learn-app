<template>
  <view class="progress-bar">
    <view
      v-for="(step, index) in steps"
      :key="step.key"
      class="step"
      :class="{ active: currentIndex === index, done: currentIndex > index }"
    >
      <view class="step-dot">
        <text v-if="currentIndex > index" class="check">&#10003;</text>
        <view v-else-if="currentIndex === index" class="pulse"></view>
      </view>
      <text class="step-label">{{ step.label }}</text>
    </view>
    <view class="progress-line">
      <view class="progress-fill" :style="{ width: fillWidth }"></view>
    </view>
  </view>
</template>

<script>
const STEPS = [
  { key: 'searching', label: '搜索中' },
  { key: 'generating', label: '生成摘要' },
  { key: 'done', label: '完成' }
]

export default {
  props: {
    status: { type: String, default: 'idle' }
  },
  data() {
    return { steps: STEPS }
  },
  computed: {
    currentIndex() {
      const map = { searching: 0, generating: 1, done: 2 }
      return map[this.status] ?? -1
    },
    fillWidth() {
      if (this.currentIndex < 0) return '0%'
      return `${(this.currentIndex / (this.steps.length - 1)) * 100}%`
    }
  }
}
</script>

<style lang="scss" scoped>
.progress-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  position: relative;
}
.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
}
.step-dot {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card, #FFFFFF);
  border: 2rpx solid var(--border, rgba(0,0,0,0.06));
  margin-bottom: 8rpx;
}
.step.active .step-dot {
  border-color: var(--accent, #3157D5);
  background: var(--accent, #3157D5);
}
.step.done .step-dot {
  border-color: #22C55E;
  background: #22C55E;
}
.check {
  color: #fff;
  font-size: 20rpx;
}
.pulse {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #fff;
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.5; }
}
.step-label {
  font-size: 22rpx;
  color: var(--text-secondary, #8C8C8C);
}
.step.active .step-label,
.step.done .step-label {
  color: var(--text, #1A1A1A);
  font-weight: 500;
}
.progress-line {
  position: absolute;
  top: 45rpx;
  left: 50rpx;
  right: 50rpx;
  height: 2rpx;
  background: var(--border, rgba(0,0,0,0.06));
  z-index: 0;
}
.progress-fill {
  height: 100%;
  background: var(--accent, #3157D5);

@media (prefers-reduced-motion: reduce) {
  .pulse {
    animation: none;
  }
}
  transition: width 0.5s ease;
}
</style>
