<template>
  <view v-if="show" class="modal-mask" @tap="$emit('close')">
    <view class="modal-body" @tap.stop>
      <text class="modal-title">添加复习卡</text>

      <!-- 正面 -->
      <text class="field-label">正面（英文 / 问题）</text>
      <input
        class="card-input"
        v-model="form.front"
        placeholder="例如：Photosynthesis"
        maxlength="100"
      />

      <!-- 背面 -->
      <text class="field-label">背面（中文 / 答案）</text>
      <input
        class="card-input"
        v-model="form.back"
        placeholder="例如：光合作用"
        maxlength="200"
      />

      <!-- 学科选择 -->
      <text class="field-label">学科（可选）</text>
      <scroll-view scroll-x class="subject-scroll">
        <view class="subject-list">
          <view
            v-for="s in subjects"
            :key="s"
            class="subject-pill"
            :class="{ active: form.subject === s }"
            @tap="form.subject = form.subject === s ? '' : s"
          >
            <text class="subject-pill-text" :class="{ active: form.subject === s }">{{ s }}</text>
          </view>
        </view>
      </scroll-view>

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
    subjects: { type: Array, default: () => [] }
  },
  emits: ['close', 'submit'],
  data() {
    return {
      form: { front: '', back: '', subject: '' }
    }
  },
  computed: {
    canSubmit() {
      return this.form.front.trim() && this.form.back.trim()
    }
  },
  watch: {
    show(val) {
      if (val) {
        this.form = { front: '', back: '', subject: '' }
      }
    }
  },
  methods: {
    onSubmit() {
      if (!this.canSubmit) return
      this.$emit('submit', {
        front: this.form.front.trim(),
        back: this.form.back.trim(),
        subject: this.form.subject
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
.card-input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  border: 1rpx solid var(--border, rgba(0,0,0,0.06));
  border-radius: 16rpx;
  font-size: 28rpx;
  color: var(--text, #1A1A1A);
  background: var(--bg, #F6F7FC);
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
