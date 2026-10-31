<template>
  <view class="template-selector">
    <text class="selector-label">选择提纲模板</text>
    <scroll-view scroll-x class="template-list">
      <view v-for="tmpl in templates" :key="tmpl.id" class="template-card" :class="{ active: selected === tmpl.id }" @tap="$emit('update:selected', tmpl.id)">
        <text class="template-name">{{ tmpl.name }}</text>
        <text class="template-en">{{ tmpl.nameEn }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  props: {
    templates: { type: Array, default: () => [] },
    selected: { type: String, default: 'argumentative' }
  },
  emits: ['update:selected']
}
</script>

<style lang="scss" scoped>
.template-selector {
  padding: 24rpx 0;
}
.selector-label {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--text-secondary, #8C8C8C);
  margin-bottom: 16rpx;
  display: block;
}
.template-list {
  white-space: nowrap;
}
.template-card {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 180rpx;
  height: 120rpx;
  margin-right: 12rpx;
  background: var(--bg-card, #FFFFFF);
  border-radius: 18rpx;
  border: 1rpx solid var(--border, rgba(0,0,0,0.06));
  transition: all 0.2s;
}
.template-card.active {
  border-color: var(--accent, #3157D5);
  background: var(--accent-light, rgba(37,99,235,0.08));
}
.template-name {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--text, #1A1A1A);
  margin-bottom: 4rpx;
}
.template-en {
  font-size: 18rpx;
  color: var(--text-secondary, #8C8C8C);
}
</style>
