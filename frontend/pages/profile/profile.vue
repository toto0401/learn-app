<template>
  <view class="page" :class="{ dark: isDark }">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="home-btn" @tap="goHome">
        <text class="home-icon">&#8962;</text>
      </view>
      <text class="nav-title">我的</text>
    </view>

    <view class="main-content">
      <!-- 头像 + 昵称 -->
      <view class="profile-header">
        <view class="avatar" @tap="showAvatarPicker = true">
          <image
            v-if="avatarImage"
            class="avatar-image"
            :src="avatarImage"
            mode="aspectFill"
            @error="onAvatarImageError"
          />
          <text v-else class="avatar-emoji">{{ AVATARS[avatarIndex] }}</text>
          <view class="avatar-edit-indicator">
            <text class="avatar-edit-icon">&#9998;</text>
          </view>
        </view>
        <view class="nickname-area" @tap="onEditNickname">
          <text class="nickname">{{ nickname }}</text>
          <text class="nickname-edit">✎</text>
        </view>
        <view class="streak-badge" v-if="currentStreak > 0">
          <text class="streak-text">🔥 连续打卡 {{ currentStreak }} 天</text>
        </view>
      </view>

      <!-- 学习统计 -->
      <text class="section-title">学习统计</text>
      <view class="stats-row">
        <view class="stat-card">
          <text class="stat-num">{{ completedTaskCount }}</text>
          <text class="stat-label">任务完成</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">{{ reviewCardCount }}</text>
          <text class="stat-label">复习卡片</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">{{ studyHoursLabel }}</text>
          <text class="stat-label">学习时长</text>
        </view>
      </view>

      <view class="stats-row secondary-stats">
        <view class="stat-card">
          <text class="stat-num">{{ sourceCount }}</text>
          <text class="stat-label">收藏来源</text>
        </view>
        <view class="stat-card wide">
          <text class="stat-num small">{{ nextReminderLabel }}</text>
          <text class="stat-label">下次提醒</text>
        </view>
      </view>

      <!-- 成就徽章 -->
      <text class="section-title">成就徽章</text>
      <view class="achievement-grid">
        <view
          v-for="(a, index) in achievements"
          :key="a.id"
          class="achievement-item"
          :class="{
            locked: !a.unlocked,
            full: achievements.length % 2 === 1 && index === achievements.length - 1
          }"
        >
          <text class="achievement-icon">{{ a.unlocked ? a.icon : '🔒' }}</text>
          <text class="achievement-name">{{ a.name }}</text>
          <text class="achievement-desc">{{ a.desc }}</text>
        </view>
      </view>

      <!-- 设置 -->
      <text class="section-title">设置</text>
      <view class="settings-list">
        <view class="setting-item" @tap="toggleReminderEnabled">
          <text class="setting-label">学习提醒</text>
          <text class="setting-value">{{ enabledLabels }}</text>
        </view>
        <view class="setting-item" @tap="onEditStudyTime">
          <text class="setting-label">学习时间</text>
          <text class="setting-value">{{ reminderSettings.studyTime }}</text>
        </view>
        <view class="setting-item" @tap="onEditReviewTime">
          <text class="setting-label">复习时间</text>
          <text class="setting-value">{{ reminderSettings.reviewTime }}</text>
        </view>
        <view class="setting-item" @tap="onExportBackup">
          <text class="setting-label">导出备份</text>
          <text class="setting-value">{{ backupLabel }}</text>
        </view>
        <view class="setting-item" @tap="onImportBackup">
          <text class="setting-label">从剪贴板导入备份</text>
        </view>
        <view class="setting-item" @tap="toggleTheme">
          <text class="setting-label">深色模式</text>
          <text class="setting-value">{{ isDark ? '开启' : '关闭' }}</text>
        </view>
        <view class="setting-item" @tap="onLogout">
          <text class="setting-label danger">退出登录</text>
        </view>
        <view class="setting-item" @tap="onClearData">
          <text class="setting-label danger">清除学习数据</text>
        </view>
        <view class="setting-item" @tap="showAbout = true">
          <text class="setting-label">关于应用</text>
          <text class="setting-value">v1.0.0</text>
        </view>
      </view>

      <view class="bottom-spacer"></view>
    </view>

    <!-- 头像选择弹窗 -->
    <view v-if="showAvatarPicker" class="modal-mask" @tap="showAvatarPicker = false">
      <view class="modal-body" @tap.stop>
        <text class="modal-title">选择头像</text>
        <view class="avatar-image-action" :class="{ active: avatarImage, disabled: isUploadingAvatar }" @tap="onPickAvatarImage">
          <text class="avatar-image-action-title">{{ isUploadingAvatar ? '头像上传中...' : '从相册或相机选择' }}</text>
          <text class="avatar-image-action-subtitle">上传后可在其他设备继续使用</text>
        </view>
        <text class="avatar-picker-label">或选择预设头像</text>
        <view class="avatar-grid">
          <view
            v-for="(emoji, idx) in AVATARS"
            :key="idx"
            class="avatar-option"
            :class="{ active: !avatarImage && avatarIndex === idx }"
            @tap="onPickAvatar(idx)"
          >
            <text class="avatar-option-emoji">{{ emoji }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 关于弹窗 -->
    <view v-if="showAbout" class="modal-mask" @tap="showAbout = false">
      <view class="modal-body" @tap.stop>
        <text class="modal-title">关于应用</text>
        <text class="about-text">Research & Writing Assistant</text>
        <text class="about-sub">一款帮助你搜索、学习、复习的工具</text>
        <text class="about-sub">版本 1.0.0</text>
      </view>
    </view>
  </view>
</template>

<script>
import { useTheme } from '@/composables/useTheme.js'
import { useProfile } from '@/composables/useProfile.js'
import { usePlanner } from '@/composables/usePlanner.js'
import { useReview } from '@/composables/useReview.js'
import { useSources } from '@/composables/useSources.js'
import { useBackup } from '@/composables/useBackup.js'
import { useReminders } from '@/composables/useReminders.js'
import { useStudyTime } from '@/composables/useStudyTime.js'
import { useAuth } from '@/composables/useAuth.js'

export default {
  setup() {
    const { isDark, toggle: toggleTheme } = useTheme()
    const profile = useProfile()
    const planner = usePlanner()
    const review = useReview()
    const sources = useSources()
    const backup = useBackup()
    const reminders = useReminders()
    const studyTime = useStudyTime()
    const auth = useAuth()
    return {
      isDark,
      toggleTheme,
      ...profile,
      plannerTasks: planner.tasks,
      reviewCards: review.cards,
      reviewStats: review.stats,
      sourceCount: sources.sourceCount,
      clearSources: sources.clearSources,
      reloadSources: sources.reloadSources,
      ...backup,
      ...reminders,
      ...studyTime,
      ...auth
    }
  },
  data() {
    return {
      showAvatarPicker: false,
      showAbout: false,
      isUploadingAvatar: false
    }
  },
  computed: {
    completedTaskCount() {
      return this.plannerTasks.filter(t => t.done).length
    },
    reviewCardCount() {
      return this.reviewCards.length
    },
    studyHoursLabel() {
      const taskMinutes = this.plannerTasks.filter(t => t.done).reduce((s, t) => s + t.duration, 0)
      const mins = taskMinutes + Math.floor(this.reviewSeconds / 60)
      if (mins < 60) return `${mins}分钟`
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return m === 0 ? `${h}小时` : `${h}h${m}m`
    },
    achievements() {
      return this.getUnlockedAchievements(this.plannerTasks, this.reviewCards, this.reviewSeconds)
    },
    backupLabel() {
      if (!this.lastBackupAt) return '未导出'
      const d = new Date(this.lastBackupAt)
      const month = d.getMonth() + 1
      const day = d.getDate()
      const hour = String(d.getHours()).padStart(2, '0')
      const minute = String(d.getMinutes()).padStart(2, '0')
      return `${month}/${day} ${hour}:${minute}`
    }
  },
  onShow() {
    if (!this.requireLogin()) return
    this.load()
    this.syncAvatarFromSession()
  },
  methods: {
    goHome() {
      uni.navigateTo({ url: '/pages/home/home' })
    },
    onEditNickname() {
      uni.showModal({
        title: '修改昵称',
        editable: true,
        placeholderText: this.nickname,
        success: async (res) => {
          if (!res.confirm) return
          const nickname = (res.content || '').trim()
          if (!nickname) {
            uni.showToast({ title: '昵称不能为空', icon: 'none' })
            return
          }
          try {
            const savedNickname = await this.updateNickname(nickname)
            this.setNickname(savedNickname)
            uni.showToast({ title: '昵称已保存', icon: 'success' })
          } catch (error) {
            uni.showToast({ title: error.message || '昵称保存失败', icon: 'none' })
          }
        }
      })
    },
    async onPickAvatar(idx) {
      const hadCustomAvatar = Boolean(this.avatarImage)
      this.setAvatar(idx)
      this.showAvatarPicker = false
      if (!hadCustomAvatar) return
      try {
        await this.deleteAvatar()
      } catch (error) {
        uni.showToast({ title: error.message || '服务器头像删除失败', icon: 'none' })
      }
    },
    onPickAvatarImage() {
      if (this.isUploadingAvatar) return
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (result) => {
          const imagePath = result.tempFilePaths && result.tempFilePaths[0]
          if (!imagePath) return
          this.isUploadingAvatar = true
          try {
            const avatarUrl = await this.uploadAvatar(imagePath)
            this.setRemoteAvatar(avatarUrl)
            this.showAvatarPicker = false
            uni.showToast({ title: '头像已更新', icon: 'success' })
          } catch (error) {
            uni.showToast({ title: error.message || '头像上传失败', icon: 'none' })
          } finally {
            this.isUploadingAvatar = false
          }
        },
        fail: (error) => {
          if (!String(error.errMsg || '').includes('cancel')) {
            uni.showToast({ title: '选择图片失败，请重试', icon: 'none' })
          }
        }
      })
    },
    onAvatarImageError() {
      this.setAvatar(this.avatarIndex)
    },
    syncAvatarFromSession() {
      const avatarUrl = this.currentUser && this.currentUser.avatarUrl
      if (avatarUrl && avatarUrl !== this.avatarImage) this.setRemoteAvatar(avatarUrl)
    },
    toggleReminderEnabled() {
      this.setEnabled(!this.reminderSettings.enabled)
      uni.showToast({
        title: this.reminderSettings.enabled ? '提醒已开启' : '提醒已关闭',
        icon: 'none'
      })
    },
    onEditStudyTime() {
      this.askTime('学习时间', this.reminderSettings.studyTime, (time) => {
        this.updateReminder({ studyTime: time, remindStudy: true, enabled: true })
      })
    },
    onEditReviewTime() {
      this.askTime('复习时间', this.reminderSettings.reviewTime, (time) => {
        this.updateReminder({ reviewTime: time, remindReview: true, enabled: true })
      })
    },
    askTime(title, current, onDone) {
      uni.showModal({
        title,
        editable: true,
        placeholderText: '例如 20:30',
        content: current,
        success: (res) => {
          if (!res.confirm) return
          const value = (res.content || '').trim()
          if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
            uni.showToast({ title: '请输入 HH:mm 格式', icon: 'none' })
            return
          }
          onDone(value)
          uni.showToast({ title: '已保存', icon: 'success' })
        }
      })
    },
    onExportBackup() {
      const text = this.exportBackup()
      uni.setClipboardData({
        data: text,
        success: () => {
          uni.showModal({
            title: '备份已复制',
            content: '学习任务、复习卡、来源、提醒设置已复制为 JSON。请保存到安全位置。',
            showCancel: false
          })
        }
      })
    },
    onImportBackup() {
      uni.showModal({
        title: '导入备份',
        content: '将从剪贴板读取备份 JSON，并覆盖当前学习数据。确定继续吗？',
        success: (res) => {
          if (!res.confirm) return
          uni.getClipboardData({
            success: (clip) => {
              try {
                this.importBackup(clip.data)
                this.reloadSources()
                this.reloadReminders()
                this.reloadStudyTime()
                uni.showToast({ title: '备份已恢复', icon: 'success' })
              } catch (err) {
                uni.showToast({ title: err.message || '导入失败', icon: 'none' })
              }
            },
            fail: () => {
              uni.showToast({ title: '读取剪贴板失败', icon: 'none' })
            }
          })
        }
      })
    },
    onClearData() {
      uni.showModal({
        title: '清除数据',
        content: '将清除所有学习任务、复习卡片和翻译缓存，昵称和头像会保留。确定吗？',
        success: (res) => {
          if (res.confirm) {
            this.clearAllData()
            this.resetReviewTime()
            this.clearSources()
            this.resetReminders({ persist: false })
            uni.showToast({ title: '已清除', icon: 'success' })
            // 重新加载数据
            this.$nextTick(() => {
              this.plannerTasks.splice(0)
              this.reviewCards.splice(0)
            })
          }
        }
      })
    },
    onLogout() {
      uni.showModal({
        title: '退出登录',
        content: '退出后下次进入需要重新登录，学习数据会保留。',
        cancelText: '取消',
        confirmText: '退出',
        success: (res) => {
          if (!res.confirm) return
          this.logout()
          uni.reLaunch({ url: '/pages/auth/auth' })
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
  --bg: #F6F7FC;
  --bg-card: #FFFFFF;
  --text: #172033;
  --text-secondary: #69758C;
  --border: rgba(32, 48, 83, 0.1);
  --accent: #3157D5;
  --accent-light: #E9EEFF;
}
.page.dark {
  --bg: #121826;
  --bg-card: #1B2435;
  --text: #EEF2FF;
  --text-secondary: #AAB5CB;
  --border: rgba(184, 197, 225, 0.12);
  --accent: #4F6DE6;
  --accent-light: #24355F;
}

.nav-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  padding-top: calc(env(safe-area-inset-top) + 24rpx);
}
.home-btn {
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.home-icon {
  font-size: 36rpx;
  color: var(--text-secondary);
}
.nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text);
}
.main-content {
  padding: 0 32rpx;
}

/* 头像区域 */
.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 38rpx 0 28rpx;
}
.avatar {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: var(--accent-light);
  border: 1rpx solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
  overflow: visible;
}
.avatar-emoji {
  font-size: 60rpx;
}
.avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}
.avatar-edit-indicator {
  position: absolute;
  right: -4rpx;
  bottom: -4rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: var(--accent);
  border: 4rpx solid var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-edit-icon {
  color: #FFFFFF;
  font-size: 22rpx;
  line-height: 1;
}
.nickname-area {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 12rpx;
}
.nickname {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text);
}
.nickname-edit {
  font-size: 26rpx;
  color: var(--text-secondary);
}
.streak-badge {
  padding: 8rpx 24rpx;
  background: rgba(245, 158, 11, 0.12);
  border-radius: 32rpx;
}
.streak-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #F59E0B;
}

/* 分区标题 */
.section-title {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--text);
  display: block;
  margin: 28rpx 0 16rpx;
}

/* 统计 */
.stats-row {
  display: flex;
  gap: 16rpx;
}
.secondary-stats {
  margin-top: 16rpx;
}
.stat-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 12rpx;
  background: var(--bg-card);
  border-radius: 18rpx;
  border: 1rpx solid var(--border);
}
.stat-card.wide {
  flex: 2;
}
.stat-num {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--accent);
}
.stat-num.small {
  font-size: 24rpx;
  line-height: 1.35;
  min-height: 64rpx;
  display: flex;
  align-items: center;
  text-align: center;
}
.stat-label {
  font-size: 22rpx;
  color: var(--text-secondary);
  margin-top: 6rpx;
}

/* 成就 */
.achievement-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  align-items: stretch;
}
.achievement-item {
  box-sizing: border-box;
  width: calc(50% - 8rpx);
  min-height: 176rpx;
  padding: 28rpx;
  background: var(--bg-card);
  border-radius: 18rpx;
  border: 1rpx solid var(--border);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.achievement-item.full {
  width: 100%;
}
.achievement-item.locked {
  opacity: 0.45;
}
.achievement-icon {
  font-size: 50rpx;
  line-height: 1;
  margin-bottom: 18rpx;
}
.achievement-name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text);
  line-height: 1.3;
  margin-bottom: 8rpx;
}
.achievement-desc {
  font-size: 24rpx;
  color: var(--text-secondary);
  line-height: 1.35;
}

/* 设置 */
.settings-list {
  background: var(--bg-card);
  border-radius: 18rpx;
  border: 1rpx solid var(--border);
  overflow: hidden;
}
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid var(--border);
}
.setting-item:last-child {
  border-bottom: none;
}
.setting-label {
  font-size: 28rpx;
  color: var(--text);
}
.setting-label.danger {
  color: #EF4444;
}
.setting-value {
  font-size: 26rpx;
  color: var(--text-secondary);
}

/* 弹窗 */
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
  border-radius: 24rpx 24rpx 0 0;
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
.avatar-image-action {
  border: 1rpx solid var(--border, rgba(0,0,0,0.06));
  background: var(--accent-light, #E9EEFF);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 28rpx;
}
.avatar-image-action.active {
  border-color: var(--accent, #3157D5);
}
.avatar-image-action-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text, #1A1A1A);
  margin-bottom: 8rpx;
}
.avatar-image-action-subtitle {
  display: block;
  font-size: 24rpx;
  color: var(--text-secondary, #8C8C8C);
}
.avatar-picker-label {
  display: block;
  font-size: 24rpx;
  color: var(--text-secondary, #8C8C8C);
  margin-bottom: 20rpx;
}
.avatar-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  justify-content: center;
}
.avatar-option {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: var(--bg, #F6F7FC);
  border: 2rpx solid var(--border, rgba(0,0,0,0.06));
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-option.active {
  border-color: var(--accent, #3157D5);
  background: var(--accent-light, rgba(37,99,235,0.08));
}
.avatar-option-emoji {
  font-size: 48rpx;
}
.about-text {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text, #1A1A1A);
  display: block;
  margin-bottom: 12rpx;
}
.about-sub {
  font-size: 24rpx;
  color: var(--text-secondary, #8C8C8C);
  display: block;
  margin-bottom: 8rpx;
}

.bottom-spacer {
  height: 40rpx;
}
</style>
