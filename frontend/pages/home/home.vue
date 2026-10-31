<template>
  <view class="page" :class="{ dark: isDark }">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-brand">
        <view class="nav-mark">
          <text class="nav-mark-text">R</text>
        </view>
        <text class="nav-title">学习桌面</text>
      </view>
      <view class="nav-btn theme-btn" @tap="toggleTheme">
        <text class="theme-icon">{{ isDark ? '☀️' : '🌙' }}</text>
      </view>
    </view>

    <view class="main-content">
      <view class="hero">
        <view class="hero-topline">
          <text class="hero-kicker">今天，慢慢学</text>
          <view class="hero-orbit"><view class="hero-orbit-core"></view></view>
        </view>
        <text class="brand-title">把好奇心，变成
          <text class="brand-title-accent">自己的知识。</text>
        </text>
        <text class="brand-subtitle">从一个问题开始，整理资料、形成思路，再沉淀为能记住的内容。</text>
        <view class="start-btn" @tap="goResearch">
          <text class="start-text">开始研究</text>
          <view class="start-arrow-wrap"><text class="start-arrow">→</text></view>
        </view>
      </view>

      <view class="quick-grid">
        <view class="quick-card planner-card" @tap="goPlanner">
          <view class="quick-icon planner-icon"><text>⌁</text></view>
          <view class="quick-top">
            <text class="quick-label">学习规划</text>
            <text class="quick-arrow">→</text>
          </view>
          <text class="quick-desc">把今天要做的事排进日程。</text>
        </view>
        <view class="quick-card review-card" @tap="goReview">
          <view class="quick-icon review-icon"><text>✦</text></view>
          <view class="quick-top">
            <text class="quick-label">复习卡片</text>
            <text class="quick-arrow">→</text>
          </view>
          <text class="quick-desc">回收遗忘点，保持记忆节奏。</text>
        </view>
      </view>

      <view class="steps">
        <view class="steps-heading">
          <text class="steps-title">学习流程</text>
          <text class="steps-hint">从问题到记忆</text>
        </view>
        <view class="steps-row">
          <view class="step-card">
            <view class="step-num"><text>1</text></view>
            <text class="step-name">搜索研究</text>
            <text class="step-desc">输入主题，整理资料来源</text>
          </view>
          <view class="step-card">
            <view class="step-num"><text>2</text></view>
            <text class="step-name">生成提纲</text>
            <text class="step-desc">把信息变成写作结构</text>
          </view>
          <view class="step-card">
            <view class="step-num"><text>3</text></view>
            <text class="step-name">复习巩固</text>
            <text class="step-desc">沉淀词汇和知识点</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { useTheme } from '@/composables/useTheme.js'
import { useAuth } from '@/composables/useAuth.js'

export default {
  setup() {
    const { isDark, toggle: toggleTheme } = useTheme()
    const { requireLogin } = useAuth()
    return { isDark, toggleTheme, requireLogin }
  },
  onShow() {
    this.requireLogin()
  },
  methods: {
    goResearch() {
      uni.switchTab({ url: '/pages/index/index' })
    },
    goReview() {
      uni.switchTab({ url: '/pages/review/review' })
    },
    goPlanner() {
      uni.switchTab({ url: '/pages/planner/planner' })
    }
  }
}
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg);
  --bg: #F6F7FC;
  --bg-card: #FFFFFF;
  --bg-muted: #EEF1FA;
  --text: #172033;
  --text-secondary: #69758C;
  --border: rgba(32, 48, 83, 0.1);
  --accent: #3157D5;
  --accent-deep: #243E9E;
  --accent-light: #E9EEFF;
  --green: #177B68;
  --amber: #A86616;
  --shadow: 0 18rpx 42rpx rgba(34, 52, 91, 0.08);
}
.page.dark {
  --bg: #121826;
  --bg-card: #1B2435;
  --bg-muted: #202B40;
  --text: #EEF2FF;
  --text-secondary: #AAB5CB;
  --border: rgba(184, 197, 225, 0.12);
  --accent: #4F6DE6;
  --accent-deep: #7F97FF;
  --accent-light: #24355F;
  --green: #6AD3BE;
  --amber: #F1BF6B;
  --shadow: 0 18rpx 42rpx rgba(0, 0, 0, 0.25);
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  padding-top: env(safe-area-inset-top);
  min-height: 104rpx;
  flex-shrink: 0;
}
.nav-brand {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.nav-mark {
  width: 48rpx;
  height: 48rpx;
  border-radius: 16rpx;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-mark-text {
  color: #FFFFFF;
  font-size: 24rpx;
  font-weight: 800;
}
.nav-title {
  font-size: 28rpx;
  color: var(--text);
  font-weight: 700;
}
.theme-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 18rpx;
  background: var(--accent-light);
  display: flex;
  align-items: center;
  justify-content: center;
}
.theme-icon {
  font-size: 28rpx;
}

.main-content {
  flex: 1;
  padding: 18rpx 32rpx 64rpx;
  box-sizing: border-box;
}
.hero {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  position: relative;
  overflow: hidden;
  padding: 34rpx 32rpx 30rpx;
  background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card) 63%, var(--accent-light) 100%);
  border: 1rpx solid var(--border);
  border-radius: 28rpx;
  box-shadow: var(--shadow);
}
.hero::after {
  content: '';
  position: absolute;
  width: 260rpx;
  height: 260rpx;
  top: -162rpx;
  right: -88rpx;
  border: 1rpx solid var(--accent);
  border-radius: 50%;
  opacity: 0.16;
}
.hero-topline {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22rpx;
}
.hero-kicker {
  font-size: 22rpx;
  color: var(--accent);
  font-weight: 700;
  letter-spacing: 1rpx;
}
.hero-orbit {
  position: relative;
  width: 48rpx;
  height: 48rpx;
  border: 1rpx solid var(--accent);
  border-radius: 50%;
  opacity: 0.7;
}
.hero-orbit-core {
  position: absolute;
  top: 14rpx;
  left: 14rpx;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: var(--accent);
}
.brand-title {
  position: relative;
  z-index: 1;
  font-size: 50rpx;
  line-height: 1.2;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 16rpx;
  letter-spacing: -1.2rpx;
}
.brand-title-accent {
  color: var(--accent);
}
.brand-subtitle {
  position: relative;
  z-index: 1;
  font-size: 28rpx;
  line-height: 1.55;
  color: var(--text-secondary);
  margin-bottom: 28rpx;
}
.start-btn {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 92rpx;
  padding: 0 16rpx 0 28rpx;
  box-sizing: border-box;
  background: var(--accent);
  border-radius: 20rpx;
  box-shadow: 0 12rpx 20rpx rgba(49, 87, 213, 0.2);
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.start-btn:active {
  opacity: 0.92;
  transform: scale(0.98);
}
.start-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #FFFFFF;
}
.start-arrow {
  font-size: 34rpx;
  line-height: 1;
  color: #FFFFFF;
}
.start-arrow-wrap {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.16);
}
.quick-grid {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}
.quick-card {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-height: 184rpx;
  padding: 24rpx;
  background: var(--bg-card);
  border-radius: 24rpx;
  border: 1rpx solid var(--border);
  box-sizing: border-box;
}
.quick-card:active {
  transform: scale(0.98);
}
.quick-icon {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}
.quick-icon text {
  font-size: 31rpx;
  font-weight: 700;
}
.planner-icon {
  background: rgba(168, 102, 22, 0.12);
}
.planner-icon text {
  color: var(--amber);
}
.review-icon {
  background: rgba(23, 123, 104, 0.12);
}
.review-icon text {
  color: var(--green);
}
.quick-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
}
.quick-label {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text);
}
.quick-arrow {
  font-size: 28rpx;
  color: var(--text-secondary);
  line-height: 1;
}
.quick-desc {
  font-size: 23rpx;
  color: var(--text-secondary);
  line-height: 1.45;
}
.planner-card .quick-label {
  color: var(--amber);
}
.review-card .quick-label {
  color: var(--green);
}

.steps {
  padding-top: 40rpx;
}
.steps-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 18rpx;
}
.steps-title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--text);
}
.steps-hint {
  font-size: 22rpx;
  color: var(--text-secondary);
}
.steps-row {
  display: flex;
  gap: 16rpx;
}
.step-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 202rpx;
  padding: 22rpx 18rpx 20rpx;
  background: transparent;
  border-radius: 18rpx;
  border: 1rpx solid var(--border);
  box-sizing: border-box;
}
.step-num {
  width: 38rpx;
  height: 38rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-light);
  color: var(--accent);
  border-radius: 12rpx;
  margin-bottom: 18rpx;
}
.step-num text {
  font-size: 20rpx;
  font-weight: 800;
}
.step-name {
  font-size: 25rpx;
  line-height: 1.25;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8rpx;
}
.step-desc {
  font-size: 21rpx;
  color: var(--text-secondary);
  line-height: 1.4;
}

@media (prefers-reduced-motion: reduce) {
  .start-btn,
  .quick-card {
    transition: none;
  }
}
</style>
