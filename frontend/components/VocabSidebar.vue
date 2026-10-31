<template>
  <view class="vocab-sidebar">
    <view class="sidebar-mask" v-if="show" @tap="$emit('close')"></view>
    <view class="sidebar-panel" :class="{ visible: show }">
      <view class="sidebar-header">
        <text class="sidebar-title">关键词汇表</text>
        <view class="close-btn" @tap="$emit('close')">
          <text class="close-icon">&#10005;</text>
        </view>
      </view>
      <view class="sidebar-body">
        <view v-if="vocabulary.length === 0" class="empty">
          <text class="empty-text">搜索后自动生成关键词汇</text>
        </view>
        <text v-if="loading" class="translation-status">正在翻译关键词...</text>
        <text v-if="errorMessage" class="translation-error">{{ errorMessage }}</text>
        <view v-for="item in displayVocabulary" :key="item.en" class="vocab-item">
          <view class="vocab-head">
            <text class="vocab-en">{{ item.en }}</text>
            <text v-if="item.manual" class="vocab-tag">手选</text>
          </view>
          <text class="vocab-zh" :class="{ unavailable: !item.zh }">{{ item.zh || (loading ? '翻译中...' : '译文暂不可用') }}</text>
          <view class="vocab-actions">
            <view class="vocab-action" @tap="$emit('remove-word', item.en)">
              <text class="vocab-action-text">移除</text>
            </view>
          </view>
        </view>
        <view v-if="vocabulary.length > 0" class="save-area">
          <view class="save-btn" :class="{ disabled: loading }" @tap="onSaveToReview">
            <text class="save-btn-text">保存到复习卡</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    show: { type: Boolean, default: false },
    vocabulary: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    errorMessage: { type: String, default: '' }
  },
  emits: ['close', 'save-to-review', 'remove-word'],
  computed: {
    displayVocabulary() {
      return [...this.vocabulary].sort((a, b) => {
        if (Boolean(a.manual) !== Boolean(b.manual)) return a.manual ? -1 : 1
        return String(a.en || '').localeCompare(String(b.en || ''))
      })
    }
  },
  methods: {
    onSaveToReview() {
      if (!this.loading) this.$emit('save-to-review')
    }
  }
}
</script>

<style lang="scss" scoped>
.sidebar-mask {
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  bottom: var(--window-bottom, 0);
  background: rgba(0, 0, 0, 0.3);
  z-index: 900;
}
.sidebar-panel {
  position: fixed;
  top: 64px;
  right: -540rpx;
  width: 500rpx;
  bottom: var(--window-bottom, 0);
  background: var(--bg, #F6F7FC);
  z-index: 901;
  transition: right 0.25s ease;
  display: flex;
  flex-direction: column;
}
.sidebar-panel.visible {
  right: 0;
}
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 28rpx;
  border-bottom: 1rpx solid var(--border, rgba(0,0,0,0.06));
}
.sidebar-title {
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
.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 8rpx 0;
}
.vocab-item {
  padding: 18rpx 28rpx;
  border-bottom: 1rpx solid var(--border-light, rgba(0,0,0,0.03));
}
.vocab-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}
.vocab-en {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text, #1A1A1A);
  margin-bottom: 4rpx;
}
.vocab-tag {
  flex-shrink: 0;
  font-size: 18rpx;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  background: var(--accent-light, rgba(37,99,235,0.08));
  color: var(--accent, #3157D5);
}
.vocab-zh {
  font-size: 24rpx;
  color: var(--text-secondary, #8C8C8C);
  display: block;
}
.vocab-zh.unavailable {
  color: #EF4444;
}
.translation-status, .translation-error {
  display: block;
  padding: 14rpx 28rpx 0;
  font-size: 22rpx;
}
.translation-status {
  color: var(--text-secondary, #8C8C8C);
}
.translation-error {
  color: #EF4444;
}
.vocab-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10rpx;
}
.vocab-action {
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
  background: rgba(239, 68, 68, 0.08);
}
.vocab-action-text {
  font-size: 20rpx;
  color: #EF4444;
}
.empty {
  padding: 60rpx 28rpx;
  text-align: center;
}
.empty-text {
  font-size: 24rpx;
  color: var(--text-secondary, #8C8C8C);
}
.save-area {
  padding: 24rpx 28rpx;
}
.save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 72rpx;
  background: var(--accent, #3157D5);
  border-radius: 16rpx;
}
.save-btn.disabled {
  opacity: 0.55;
}
.save-btn-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #FFFFFF;
}
</style>
