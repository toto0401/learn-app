<template>
  <view class="search-bar">
    <view class="input-row">
      <picker :value="subjectIndex" :range="subjects" @change="onSubjectChange">
        <view class="subject-picker">
          <text class="subject-text">{{ currentSubject || '选择科目' }}</text>
          <text class="arrow">&#9662;</text>
        </view>
      </picker>
    </view>
    <view class="input-row">
      <input
        class="topic-input"
        type="text"
        v-model="localQuery"
        placeholder="输入研究课题，如 Impact of Penicillin"
        placeholder-class="placeholder"
        @input="onQueryInput"
        @confirm="onSearch"
      />
    </view>
    <view class="search-btn" :class="{ disabled: !localQuery.trim() }" @tap="onSearch">
      <text class="btn-text">搜索</text>
    </view>
  </view>
</template>

<script>
const SUBJECTS = ['科学', '生物', '化学', '物理', '历史', '文学', '地理', '数学', '经济', '心理学', '计算机科学', '其他']

export default {
  props: {
    query: { type: String, default: '' },
    subject: { type: String, default: '' },
    loading: { type: Boolean, default: false }
  },
  emits: ['update:query', 'update:subject', 'search'],
  data() {
    return {
      subjects: SUBJECTS,
      subjectIndex: -1,
      localQuery: this.query
    }
  },
  computed: {
    currentSubject() {
      return this.subject || ''
    }
  },
  watch: {
    query(value) {
      this.localQuery = value
    },
    subject(value) {
      this.subjectIndex = SUBJECTS.indexOf(value)
    }
  },
  methods: {
    onSubjectChange(e) {
      this.subjectIndex = e.detail.value
      this.$emit('update:subject', SUBJECTS[e.detail.value])
    },
    onQueryInput(e) {
      const value = e?.target?.value ?? e?.detail?.value ?? ''
      this.localQuery = value
      this.$emit('update:query', this.localQuery)
    },
    getInputValue() {
      const input = this.$el?.querySelector?.('input')
      return input?.value || this.localQuery || this.query || ''
    },
    onSearch() {
      const query = this.getInputValue().trim()
      if (query && !this.loading) {
        this.localQuery = query
        this.$emit('update:query', query)
        this.$emit('search', query)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.search-bar {
  margin: 18rpx 0 16rpx;
  padding: 22rpx;
  background: var(--bg-card, #FFFFFF);
  border: 1rpx solid var(--border, rgba(20,31,54,0.08));
  border-radius: 24rpx;
  box-shadow: var(--shadow, 0 14rpx 36rpx rgba(31,41,55,0.07));
  box-sizing: border-box;
}
.input-row {
  margin-bottom: 14rpx;
}
.subject-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 80rpx;
  padding: 0 24rpx;
  background: var(--bg, #F6F7FC);
  border-radius: 16rpx;
  border: 1rpx solid var(--border, rgba(20,31,54,0.08));
}
.subject-text {
  font-size: 27rpx;
  color: var(--text, #1A1A1A);
}
.arrow {
  font-size: 18rpx;
  color: var(--text-secondary, #687386);
}
.topic-input {
  box-sizing: border-box;
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  background: var(--bg, #F6F7FC);
  border-radius: 16rpx;
  border: 1rpx solid var(--border, rgba(20,31,54,0.08));
  font-size: 27rpx;
  color: var(--text, #1A1A1A);
}
.placeholder {
  color: var(--text-secondary, #687386);
}
.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 84rpx;
  background: var(--accent, #3157D5);
  border-radius: 18rpx;
  margin-top: 8rpx;
}
.search-btn.disabled {
  background: rgba(49, 87, 213, 0.42);
}
.btn-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #FFFFFF;
}
</style>
