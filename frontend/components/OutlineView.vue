<template>
  <view class="outline-view" v-if="items.length > 0">
    <view class="outline-header">
      <text class="outline-title">写作提纲</text>
      <view class="copy-btn" @tap="$emit('copy')">
        <text class="copy-text">复制</text>
      </view>
    </view>
    <view class="outline-body">
      <view v-for="(item, index) in items" :key="index" class="outline-item" :class="item.type">
        <text v-if="item.type === 'h2'" class="h2-text">{{ item.text }}</text>
        <text v-else-if="item.type === 'h3'" class="h3-text">{{ item.text }}</text>
        <text v-else-if="item.type === 'reference'" class="ref-text">{{ item.text }}</text>
        <text v-else class="p-text">{{ item.text }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { parseMarkdown } from '@/utils/markdown.js'
export default {
  props: { outline: { type: String, default: '' } },
  emits: ['copy'],
  computed: { items() { return parseMarkdown(this.outline) } }
}
</script>

<style lang="scss" scoped>
.outline-view {
  margin: 24rpx 0;
  padding: 28rpx;
  background: var(--bg-card, #FFFFFF);
  border-radius: 24rpx;
  border: 1rpx solid var(--border, rgba(0,0,0,0.06));
}
.outline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.outline-title {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-secondary, #8C8C8C);
  letter-spacing: 1rpx;
}
.copy-btn {
  padding: 8rpx 20rpx;
  background: var(--accent, #3157D5);
  border-radius: 12rpx;
}
.copy-text {
  font-size: 22rpx;
  color: #fff;
}
.outline-item {
  margin-bottom: 8rpx;
}
.outline-item.h2 {
  margin-top: 20rpx;
  padding-bottom: 8rpx;
  border-bottom: 1rpx solid var(--border-light, rgba(0,0,0,0.03));
}
.outline-item.h3 {
  padding-left: 28rpx;
}
.h2-text {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--accent, #3157D5);
}
.h3-text {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--text, #1A1A1A);
}
.p-text {
  font-size: 24rpx;
  color: var(--text-secondary, #8C8C8C);
  padding-left: 44rpx;
}
.ref-text {
  font-size: 22rpx;
  color: var(--accent, #3157D5);
  padding-left: 12rpx;
}
</style>
