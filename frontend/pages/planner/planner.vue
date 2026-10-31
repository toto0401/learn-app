<template>
  <view class="page" :class="{ dark: isDark }">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="home-btn" @tap="goHome">
        <text class="home-icon">&#8962;</text>
      </view>
      <text class="nav-title">学习规划</text>
    </view>

    <view class="main-content">
      <!-- 周切换 -->
      <view class="week-header">
        <view class="week-arrow" @tap="prevWeek">
          <text class="arrow-text">‹</text>
        </view>
        <view class="week-label-wrap" @tap="goThisWeek">
          <text class="week-label">{{ weekLabel }}</text>
        </view>
        <view class="week-arrow" @tap="nextWeek">
          <text class="arrow-text">›</text>
        </view>
      </view>

      <!-- 日期 tab -->
      <scroll-view scroll-x class="day-scroll" :show-scrollbar="false">
        <view class="day-tabs">
          <view
            v-for="day in weekDays"
            :key="day.dayIndex"
            class="day-tab"
            :class="{ active: selectedDay === day.dayIndex, today: day.isToday }"
            @tap="selectedDay = day.dayIndex"
          >
            <text class="day-name" :class="{ active: selectedDay === day.dayIndex }">{{ day.label }}</text>
            <text class="day-date" :class="{ active: selectedDay === day.dayIndex }">{{ day.dateStr }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 周统计 -->
      <view class="stats-row">
        <view class="stat-card">
          <text class="stat-num">{{ weekStats.completed }}/{{ weekStats.total }}</text>
          <text class="stat-label">本周任务</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">{{ formatMinutes(weekStats.completedMinutes) }}</text>
          <text class="stat-label">已学习</text>
        </view>
      </view>

      <!-- 任务列表 -->
      <view v-if="dayTasks.length === 0" class="empty-day">
        <view class="empty-intro">
          <view class="empty-copy">
            <text class="empty-day-text">今天还没有学习任务</text>
            <text class="empty-day-sub">从一个小目标开始，把想做的事放进今天。</text>
          </view>
        </view>
      </view>

      <view v-for="task in dayTasks" :key="task.id" class="task-card">
        <view class="task-left" @tap="onToggleDone(task.id)">
          <view class="checkbox" :class="{ done: task.done }">
            <text v-if="task.done" class="check-icon">✓</text>
          </view>
        </view>
        <view class="task-info">
          <view class="task-top">
            <text class="task-subject" :style="{ background: subjectColor(task.subject) }">{{ task.subject || '任务' }}</text>
            <text class="task-duration">{{ task.duration }}分钟</text>
          </view>
          <text class="task-desc" :class="{ done: task.done }">{{ task.description }}</text>
          <!-- 计时区域 -->
          <view class="timer-row">
            <view
              v-if="timingTaskId === task.id"
              class="timer-btn timing"
              @tap="stopTimer"
            >
              <text class="timer-btn-text timing">⏸ 剩余 {{ formatTimer(remainingSeconds) }}</text>
            </view>
            <view
              v-else
              class="timer-btn"
              @tap="startTimer(task.id)"
            >
              <text class="timer-btn-text">▶ 开始计时</text>
            </view>
            <text v-if="task.elapsed && timingTaskId !== task.id" class="elapsed-text">已学 {{ formatTimer(task.elapsed) }}</text>
          </view>
        </view>
        <view class="task-delete" @tap="onDelete(task.id)">
          <text class="delete-icon">×</text>
        </view>
      </view>

      <view class="quick-start">
        <view class="quick-start-head">
          <text class="quick-start-title">快速开始</text>
          <text class="quick-start-hint">先选一个轻量任务</text>
        </view>
        <view
          v-for="preset in quickStarts"
          :key="preset.title"
          class="quick-option"
          @tap="openPreset(preset)"
        >
          <view class="quick-option-copy">
            <text class="quick-option-title">{{ preset.title }}</text>
            <text class="quick-option-desc">{{ preset.description }}</text>
          </view>
          <view class="quick-option-meta">
            <text class="quick-option-duration">{{ preset.duration }} 分钟</text>
            <text class="quick-option-arrow">→</text>
          </view>
        </view>
      </view>

      <!-- 添加按钮 -->
      <view class="add-btn" @tap="openTaskForm">
        <text class="add-btn-text">+ 添加学习任务</text>
      </view>

      <view class="bottom-spacer"></view>
    </view>

    <!-- 添加任务弹窗 -->
    <TaskFormModal
      :show="showForm"
      :subjects="SUBJECTS"
      :durations="DURATIONS"
      :preset="presetTask"
      @close="showForm = false"
      @submit="onAddTask"
    />
  </view>
</template>

<script>
import { useTheme } from '@/composables/useTheme.js'
import { usePlanner } from '@/composables/usePlanner.js'
import { useProfile } from '@/composables/useProfile.js'
import { useAuth } from '@/composables/useAuth.js'
import TaskFormModal from '@/components/TaskFormModal.vue'

const SUBJECT_COLORS = [
  'rgba(239,68,68,0.15)', 'rgba(34,197,94,0.15)', 'rgba(59,130,246,0.15)',
  'rgba(168,85,247,0.15)', 'rgba(245,158,11,0.15)', 'rgba(236,72,153,0.15)',
  'rgba(20,184,166,0.15)', 'rgba(99,102,241,0.15)', 'rgba(234,88,12,0.15)',
  'rgba(14,165,233,0.15)', 'rgba(107,114,128,0.15)', 'rgba(156,163,175,0.15)'
]

export default {
  components: { TaskFormModal },
  setup() {
    const { isDark } = useTheme()
    const planner = usePlanner()
    const { checkin } = useProfile()
    const { requireLogin } = useAuth()
    return { isDark, ...planner, checkin, requireLogin }
  },
  data() {
    return {
      showForm: false,
      presetTask: null,
      startTimerAfterAdd: false,
      quickStarts: [
        { title: '复盘笔记', description: '整理今天已经学过的内容', duration: 15 },
        { title: '专注阅读', description: '读完一小段资料或章节', duration: 25 },
        { title: '练习巩固', description: '完成一组题目或错题', duration: 30 }
      ]
    }
  },
  onShow() {
    this.requireLogin()
  },
  methods: {
    goHome() {
      uni.navigateTo({ url: '/pages/home/home' })
    },
    subjectColor(subject) {
      const idx = this.SUBJECTS.indexOf(subject)
      return SUBJECT_COLORS[idx >= 0 ? idx : SUBJECT_COLORS.length - 1]
    },
    formatMinutes(m) {
      if (m === 0) return '0分钟'
      const h = Math.floor(m / 60)
      const min = m % 60
      if (h === 0) return `${min}分钟`
      if (min === 0) return `${h}小时`
      return `${h}小时${min}分钟`
    },
    openTaskForm() {
      this.presetTask = null
      this.startTimerAfterAdd = false
      this.showForm = true
    },
    openPreset(preset) {
      this.presetTask = { ...preset }
      this.startTimerAfterAdd = true
      this.showForm = true
    },
    onAddTask({ subject, description, duration }) {
      const taskId = this.addTask(subject, description, duration)
      const shouldStartTimer = this.startTimerAfterAdd
      this.showForm = false
      this.presetTask = null
      this.startTimerAfterAdd = false
      if (shouldStartTimer) {
        this.$nextTick(() => this.startTimer(taskId))
      }
    },
    onToggleDone(id) {
      const task = this.tasks.find(t => t.id === id)
      const wasDone = task && task.done
      this.toggleDone(id)
      // 标记完成时打卡
      if (task && !wasDone) {
        this.checkin()
      }
      this.$nextTick(() => {
        const wt = this.weekTasks
        if (wt.length > 0 && wt.every(t => t.done)) {
          const praises = [
            '太厉害了，本周任务全部完成！你是学习之星 ⭐',
            '全部搞定！你的努力让人佩服 💪',
            '完美通关！这周的你超级棒 🎉',
            '所有任务都完成了，给自己一个大大的赞 👏',
            '本周满分！继续保持这个节奏 🚀'
          ]
          const msg = praises[Math.floor(Math.random() * praises.length)]
          uni.showModal({
            title: '🎊 全部完成！',
            content: msg,
            showCancel: false,
            confirmText: '谢谢夸奖'
          })
        }
      })
    },
    onDelete(id) {
      uni.showModal({
        title: '删除任务',
        content: '确定要删除这个任务吗？',
        success: (res) => {
          if (res.confirm) this.removeTask(id)
        }
      })
    },
    formatTimer(seconds) {
      const h = Math.floor(seconds / 3600)
      const m = Math.floor((seconds % 3600) / 60)
      const s = seconds % 60
      const pad = n => String(n).padStart(2, '0')
      return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
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

/* 周切换 */
.week-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 36rpx;
  margin: 28rpx 0 32rpx;
}
.week-arrow {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
  background: var(--bg-card);
  border: 1rpx solid var(--border);
}
.arrow-text {
  font-size: 36rpx;
  color: var(--text);
}
.week-label-wrap {
  padding: 10rpx 36rpx;
}
.week-label {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text);
}

/* 日期 tab */
.day-scroll {
  white-space: nowrap;
  margin: 0 0 28rpx;
  padding: 0 8rpx;
  box-sizing: border-box;
}
.day-tabs {
  display: flex;
  gap: 20rpx;
  padding-bottom: 4rpx;
}
.day-tab {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 28rpx;
  border-radius: 18rpx;
  background: var(--bg-card);
  border: 1rpx solid var(--border);
  min-width: 100rpx;
}
.day-tab.active {
  background: var(--accent);
  border-color: var(--accent);
}
.day-tab.today:not(.active) {
  border-color: var(--accent);
}
.day-name {
  font-size: 22rpx;
  color: var(--text-secondary);
  margin-bottom: 4rpx;
}
.day-name.active { color: #FFFFFF; }
.day-date {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text);
}
.day-date.active { color: #FFFFFF; }

/* 统计 */
.stats-row {
  display: flex;
  gap: 16rpx;
  margin: 20rpx 0;
}
.stat-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx;
  background: var(--bg-card);
  border-radius: 18rpx;
  border: 1rpx solid var(--border);
}
.stat-num {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--accent);
}
.stat-label {
  font-size: 22rpx;
  color: var(--text-secondary);
  margin-top: 4rpx;
}

/* 空状态 */
.empty-day {
  display: flex;
  flex-direction: column;
  padding: 44rpx 8rpx 28rpx;
}
.empty-intro {
  display: flex;
  align-items: center;
  padding: 0;
}
.empty-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.empty-day-text {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text);
  line-height: 1.35;
}
.empty-day-sub {
  font-size: 23rpx;
  color: var(--text-secondary);
  line-height: 1.45;
  margin-top: 4rpx;
}
.quick-start {
  margin-top: 40rpx;
  padding: 12rpx 28rpx;
  background: var(--bg-card);
  border: 1rpx solid var(--border);
  border-radius: 20rpx;
}
.quick-start-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 22rpx 0 16rpx;
}
.quick-start-title {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--text);
}
.quick-start-hint {
  font-size: 21rpx;
  color: var(--text-secondary);
}
.quick-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 112rpx;
  padding: 18rpx 0;
  border-top: 1rpx solid var(--border);
}
.quick-option:active {
  opacity: 0.72;
}
.quick-option-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding-right: 16rpx;
}
.quick-option-title {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text);
}
.quick-option-desc {
  font-size: 22rpx;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-top: 4rpx;
}
.quick-option-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}
.quick-option-duration {
  font-size: 21rpx;
  color: var(--accent);
}
.quick-option-arrow {
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: var(--accent-light);
  color: var(--accent);
  font-size: 22rpx;
}

/* 任务卡片 */
.task-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: var(--bg-card);
  border-radius: 18rpx;
  border: 1rpx solid var(--border);
  margin-bottom: 16rpx;
}
.task-left {
  margin-right: 20rpx;
}
.checkbox {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  border: 2rpx solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
}
.checkbox.done {
  background: var(--accent);
  border-color: var(--accent);
}
.check-icon {
  font-size: 24rpx;
  color: #FFFFFF;
}
.task-info {
  flex: 1;
}
.task-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.task-subject {
  font-size: 20rpx;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  color: var(--text);
}
.task-duration {
  font-size: 20rpx;
  color: var(--text-secondary);
}
.task-desc {
  font-size: 28rpx;
  color: var(--text);
  line-height: 1.4;
}
.task-desc.done {
  text-decoration: line-through;
  opacity: 0.5;
}

/* 计时 */
.timer-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 12rpx;
}
.timer-btn {
  padding: 6rpx 20rpx;
  border-radius: 12rpx;
  background: var(--accent-light);
}
.timer-btn.timing {
  background: var(--accent);
}
.timer-btn-text {
  font-size: 22rpx;
  color: var(--accent);
}
.timer-btn-text.timing {
  color: #FFFFFF;
}
.elapsed-text {
  font-size: 22rpx;
  color: var(--text-secondary);
}

.task-delete {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12rpx;
}
.delete-icon {
  font-size: 36rpx;
  color: var(--text-secondary);
}

/* 添加按钮 */
.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 84rpx;
  background: var(--accent);
  border-radius: 18rpx;
  margin-top: 32rpx;
  box-shadow: 0 12rpx 22rpx rgba(49, 87, 213, 0.18);
}
.add-btn:active {
  opacity: 0.92;
  transform: scale(0.98);
}
.add-btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.bottom-spacer {
  height: 64rpx;
}
</style>
