<template>
  <view v-if="show" class="modal-mask" @tap="$emit('close')">
    <view class="modal-body" @tap.stop>
      <text class="modal-title">添加学习任务</text>

      <!-- 学科选择 -->
      <text class="field-label">学科</text>
      <scroll-view scroll-x class="subject-scroll">
        <view class="subject-list">
          <view
            v-for="s in subjects"
            :key="s"
            class="subject-pill"
            :class="{ active: form.subject === s }"
            @tap="form.subject = s"
          >
            <text class="subject-pill-text" :class="{ active: form.subject === s }">{{ s }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 任务描述 -->
      <text class="field-label">任务描述</text>
      <input
        class="task-input"
        v-model="form.description"
        placeholder="例如：复习第三章笔记"
        maxlength="50"
      />

      <!-- 时长选择 -->
      <text class="field-label">学习时长</text>
      <view class="duration-list">
        <view
          v-for="d in durations"
          :key="d"
          class="duration-pill"
          :class="{ active: !customMode && form.duration === d }"
          @tap="selectPreset(d)"
        >
          <text class="duration-text" :class="{ active: !customMode && form.duration === d }">{{ d >= 60 ? (d / 60) + '小时' : d + '分钟' }}</text>
        </view>
        <view
          class="duration-pill"
          :class="{ active: customMode }"
          @tap="customMode = true"
        >
          <text class="duration-text" :class="{ active: customMode }">自定义</text>
        </view>
      </view>
      <view v-if="customMode" class="custom-duration">
        <input
          class="custom-input"
          type="number"
          v-model="customMinutes"
          placeholder="输入分钟数"
          maxlength="4"
          @input="onCustomInput"
        />
        <text class="custom-unit">分钟</text>
      </view>

      <!-- 按钮 -->
      <view class="btn-row">
        <view class="cancel-btn" @tap="$emit('close')">
          <text class="cancel-text">取消</text>
        </view>
        <view class="confirm-btn" :class="{ disabled: !canSubmit }" @tap="onSubmit">
          <text class="confirm-text">添加</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    show: { type: Boolean, default: false },
    subjects: { type: Array, default: () => [] },
    durations: { type: Array, default: () => [] },
    preset: { type: Object, default: null }
  },
  emits: ['close', 'submit'],
  data() {
    return {
      form: {
        subject: '',
        description: '',
        duration: 30
      },
      customMode: false,
      customMinutes: ''
    }
  },
  computed: {
    canSubmit() {
      return this.form.description.trim()
    }
  },
  watch: {
    show(val) {
      if (val) {
        this.form = {
          subject: '',
          description: this.preset?.description || '',
          duration: this.preset?.duration || 30
        }
        this.customMode = false
        this.customMinutes = ''
      }
    }
  },
  methods: {
    selectPreset(d) {
      this.customMode = false
      this.customMinutes = ''
      this.form.duration = d
    },
    onCustomInput() {
      const val = parseInt(this.customMinutes)
      this.form.duration = val > 0 ? val : 0
    },
    onSubmit() {
      if (!this.canSubmit) return
      if (!this.form.duration || this.form.duration <= 0) return
      this.$emit('submit', {
        subject: this.form.subject,
        description: this.form.description.trim(),
        duration: this.form.duration
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}
.modal-body {
  width: 100%;
  background: var(--bg-card, #FFFFFF);
  border-radius: 28rpx 28rpx 0 0;
  padding: 36rpx 32rpx;
  padding-bottom: calc(36rpx + env(safe-area-inset-bottom));
}
.modal-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text, #1A1A1A);
  display: block;
  margin-bottom: 28rpx;
}
.field-label {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-secondary, #8C8C8C);
  display: block;
  margin-bottom: 12rpx;
  margin-top: 20rpx;
}
.subject-scroll {
  white-space: nowrap;
}
.subject-list {
  display: flex;
  gap: 12rpx;
  padding-bottom: 8rpx;
}
.subject-pill {
  flex-shrink: 0;
  padding: 10rpx 24rpx;
  border-radius: 32rpx;
  border: 1rpx solid var(--border, rgba(0,0,0,0.06));
  background: var(--bg, #F6F7FC);
}
.subject-pill.active {
  background: var(--accent, #3157D5);
  border-color: var(--accent, #3157D5);
}
.subject-pill-text {
  font-size: 24rpx;
  color: var(--text, #1A1A1A);
}
.subject-pill-text.active {
  color: #FFFFFF;
}
.task-input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  border: 1rpx solid var(--border, rgba(0,0,0,0.06));
  border-radius: 16rpx;
  font-size: 28rpx;
  color: var(--text, #1A1A1A);
  background: var(--bg, #F6F7FC);
}
.duration-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.duration-pill {
  padding: 10rpx 24rpx;
  border-radius: 32rpx;
  border: 1rpx solid var(--border, rgba(0,0,0,0.06));
  background: var(--bg, #F6F7FC);
}
.duration-pill.active {
  background: var(--accent, #3157D5);
  border-color: var(--accent, #3157D5);
}
.duration-text {
  font-size: 24rpx;
  color: var(--text, #1A1A1A);
}
.duration-text.active {
  color: #FFFFFF;
}
.custom-duration {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 16rpx;
}
.custom-input {
  flex: 1;
  height: 72rpx;
  padding: 0 24rpx;
  border: 1rpx solid var(--border, rgba(0,0,0,0.06));
  border-radius: 16rpx;
  font-size: 28rpx;
  color: var(--text, #1A1A1A);
  background: var(--bg, #F6F7FC);
}
.custom-unit {
  font-size: 26rpx;
  color: var(--text-secondary, #8C8C8C);
}
.btn-row {
  display: flex;
  gap: 16rpx;
  margin-top: 32rpx;
}
.cancel-btn {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  border: 1rpx solid var(--border, rgba(0,0,0,0.06));
}
.cancel-text {
  font-size: 28rpx;
  color: var(--text-secondary, #8C8C8C);
}
.confirm-btn {
  flex: 2;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background: var(--accent, #3157D5);
}
.confirm-btn.disabled {
  opacity: 0.4;
}
.confirm-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #FFFFFF;
}
</style>
