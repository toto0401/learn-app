<template>
  <view class="reference-list" v-if="sources.length > 0">
    <text class="list-title">参考资料 ({{ sources.length }})</text>
    <view v-for="item in enrichedSources" :key="item.id" class="ref-item">
      <text class="ref-num">[{{ item.id }}]</text>
      <view class="ref-body">
        <text class="ref-title" @tap="openLink(item.url)">{{ item.title }}</text>
        <view class="ref-meta">
          <text class="ref-domain">{{ getDomain(item.url) }}</text>
          <text v-if="item.source" class="ref-tag" :class="tagClass(item.source)">{{ item.source }}</text>
          <text v-if="item.saved" class="trust-tag" :class="item.trust">{{ trustLabel(item.trust) }}</text>
        </view>
        <text v-if="item.note" class="ref-note">{{ item.note }}</text>
        <view class="ref-actions">
          <view class="ref-action" :class="{ active: item.saved }" @tap="onToggleSave(item)">
            <text class="ref-action-text">{{ item.saved ? '已收藏' : '收藏' }}</text>
          </view>
          <view class="ref-action" @tap="onCycleTrust(item)">
            <text class="ref-action-text">可信度</text>
          </view>
          <view class="ref-action" @tap="onEditNote(item)">
            <text class="ref-action-text">{{ item.note ? '改备注' : '备注' }}</text>
          </view>
          <view class="ref-action" @tap="openLink(item.url)">
            <text class="ref-action-text">打开</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useSources } from '@/composables/useSources.js'

export default {
  props: {
    sources: { type: Array, default: () => [] }
  },
  setup() {
    return { ...useSources() }
  },
  computed: {
    enrichedSources() {
      return this.sources.map((item) => {
        const saved = this.findSource(item)
        return {
          ...item,
          saved: Boolean(saved),
          note: saved?.note || '',
          trust: saved?.trust || 'medium'
        }
      })
    }
  },
  methods: {
    getDomain(url) {
      try { return new URL(url).hostname.replace('www.', '') } catch { return url }
    },
    tagClass(source) {
      return { Wikipedia: 'wiki', CrossRef: 'academic', DuckDuckGo: 'ddg' }[source] || ''
    },
    openLink(url) {
      // #ifdef H5
      window.open(url, '_blank')
      // #endif
      // #ifndef H5
      uni.setClipboardData({ data: url, success() { uni.showToast({ title: '链接已复制', icon: 'success' }) } })
      // #endif
    },
    onToggleSave(item) {
      const saved = this.toggleSource(item)
      uni.showToast({ title: saved ? '已收藏来源' : '已取消收藏', icon: 'none' })
    },
    onCycleTrust(item) {
      const trust = this.cycleTrust(item)
      uni.showToast({ title: `标记为：${this.trustLabel(trust)}`, icon: 'none' })
    },
    onEditNote(item) {
      const saved = this.findSource(item)
      uni.showModal({
        title: '来源备注',
        editable: true,
        placeholderText: '例如：适合引用背景定义，需要再找数据佐证',
        content: saved?.note || '',
        success: (res) => {
          if (res.confirm) {
            this.updateSource(item, { note: (res.content || '').trim() })
            uni.showToast({ title: '备注已保存', icon: 'success' })
          }
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.reference-list {
  margin: 24rpx 0;
}
.list-title {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-secondary, #8C8C8C);
  letter-spacing: 1rpx;
  display: block;
  margin-bottom: 16rpx;
}
.ref-item {
  display: flex;
  align-items: flex-start;
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--border-light, rgba(0,0,0,0.03));
}
.ref-item:last-child {
  border-bottom: none;
}
.ref-num {
  font-size: 22rpx;
  color: var(--accent, #3157D5);
  font-weight: 500;
  margin-right: 12rpx;
  margin-top: 4rpx;
  flex-shrink: 0;
}
.ref-body {
  flex: 1;
  overflow: hidden;
}
.ref-title {
  font-size: 26rpx;
  color: var(--text, #1A1A1A);
  display: block;
  line-height: 1.4;
}
.ref-meta {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 6rpx;
}
.ref-domain {
  font-size: 22rpx;
  color: var(--text-secondary, #8C8C8C);
}
.ref-tag {
  font-size: 18rpx;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  color: #fff;
  background: #94A3B8;
}
.ref-tag.wiki { background: #3B82F6; }
.ref-tag.academic { background: #F59E0B; }
.ref-tag.ddg { background: #EF4444; }
.trust-tag {
  font-size: 18rpx;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  color: #fff;
  background: #94A3B8;
}
.trust-tag.high { background: #16A34A; }
.trust-tag.medium { background: #64748B; }
.trust-tag.low { background: #DC2626; }
.ref-note {
  display: block;
  margin-top: 8rpx;
  padding: 12rpx 14rpx;
  border-radius: 12rpx;
  background: var(--accent-light, rgba(37,99,235,0.08));
  font-size: 23rpx;
  line-height: 1.5;
  color: var(--text, #1A1A1A);
}
.ref-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 12rpx;
}
.ref-action {
  padding: 6rpx 14rpx;
  border-radius: 12rpx;
  background: var(--bg-card, #FFFFFF);
  border: 1rpx solid var(--border, rgba(0,0,0,0.06));
}
.ref-action.active {
  background: var(--accent-light, rgba(37,99,235,0.08));
  border-color: var(--accent, #3157D5);
}
.ref-action-text {
  font-size: 22rpx;
  color: var(--text-secondary, #8C8C8C);
}
.ref-action.active .ref-action-text {
  color: var(--accent, #3157D5);
}
</style>
