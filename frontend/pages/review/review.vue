<template>
  <view class="page" :class="{ dark: isDark }">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="home-btn" @tap="goHome">
        <text class="home-icon">&#8962;</text>
      </view>
      <text class="nav-title">复习</text>
    </view>

    <view class="main-content">
      <!-- 统计栏 -->
      <view class="stats-row">
        <view class="stat-card">
          <text class="stat-num">{{ stats.total }}</text>
          <text class="stat-label">总卡片</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">{{ stats.dueToday }}</text>
          <text class="stat-label">待复习</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">{{ stats.mastered }}</text>
          <text class="stat-label">已掌握</text>
        </view>
      </view>

      <!-- Tab 切换 -->
      <view class="tab-bar">
        <view class="tab" :class="{ active: tab === 'review' }" @tap="setTab('review')">
          <text class="tab-text" :class="{ active: tab === 'review' }">复习</text>
        </view>
        <view class="tab" :class="{ active: tab === 'deck' }" @tap="setTab('deck')">
          <text class="tab-text" :class="{ active: tab === 'deck' }">卡组</text>
        </view>
      </view>

      <!-- ========== 复习模式 ========== -->
      <view v-if="tab === 'review'">
        <!-- 无待复习卡片 -->
        <view v-if="stats.total === 0" class="empty-state">
          <text class="empty-icon">🃏</text>
          <text class="empty-text">还没有复习卡</text>
          <text class="empty-sub">切换到「卡组」手动添加，或从研究页导入词汇</text>
        </view>

        <view v-else-if="dueCards.length === 0" class="empty-state">
          <text class="empty-icon">🎉</text>
          <text class="empty-text">暂时没有到期卡片</text>
          <text class="empty-sub">卡片到期后会自动加入复习</text>
        </view>

        <!-- 闪卡 -->
        <view v-else class="flashcard-area">
          <text class="progress-hint">还剩 {{ dueCards.length }} 张</text>

          <view class="flashcard" :class="{ flipped: flipped }" @tap="onFlip">
            <view class="card-face card-front" v-if="!flipped">
              <text class="card-subject" v-if="currentCard.subject">{{ currentCard.subject }}</text>
              <text class="card-main-text">{{ currentCard.front }}</text>
              <text class="card-hint">点击翻转</text>
            </view>
            <view class="card-face card-back" v-else>
              <text class="card-subject" v-if="currentCard.subject">{{ currentCard.subject }}</text>
              <text class="card-main-text">{{ displayCardBack(currentCard) }}</text>
              <text class="card-front-echo">{{ currentCard.front }}</text>
            </view>
          </view>

          <!-- 评分按钮（翻转后显示） -->
          <view class="rating-row" v-if="flipped">
            <view class="rating-btn forgot" @tap="onRate(0)">
              <text class="rating-text">忘了</text>
            </view>
            <view class="rating-btn hard" @tap="onRate(1)">
              <text class="rating-text">困难</text>
            </view>
            <view class="rating-btn good" @tap="onRate(2)">
              <text class="rating-text">一般</text>
            </view>
            <view class="rating-btn easy" @tap="onRate(3)">
              <text class="rating-text">简单</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ========== 卡组模式 ========== -->
      <view v-if="tab === 'deck'" class="deck-panel" :class="{ 'is-empty': cards.length === 0 }">
        <view v-if="cards.length === 0" class="empty-state">
          <text class="empty-icon">📦</text>
          <text class="empty-text">卡组是空的</text>
          <text class="empty-sub">点击下方按钮添加第一张卡片</text>
        </view>

        <view v-for="card in cards" :key="card.id" class="deck-card">
          <view class="deck-card-info">
            <view class="deck-card-top">
              <text class="deck-subject" v-if="card.subject" :style="{ background: subjectColor(card.subject) }">{{ card.subject }}</text>
              <text class="deck-interval">{{ intervalLabel(card) }}</text>
              <text class="memory-status" :class="memoryStatusClass(card)">{{ memoryStatusLabel(card) }}</text>
            </view>
            <text class="deck-front">{{ card.front }}</text>
            <text class="deck-back">{{ displayCardBack(card) }}</text>
          </view>
          <view class="deck-delete" @tap="onDelete(card.id)">
            <text class="delete-icon">×</text>
          </view>
        </view>

        <!-- 添加按钮 -->
        <view class="add-btn" @tap="showForm = true">
          <text class="add-btn-text">+ 添加复习卡</text>
        </view>
      </view>

      <view class="bottom-spacer"></view>
    </view>

    <!-- 添加卡片弹窗 -->
    <CardFormModal
      :show="showForm"
      :subjects="SUBJECTS"
      @close="showForm = false"
      @submit="onAddCard"
    />
  </view>
</template>

<script>
import { useTheme } from '@/composables/useTheme.js'
import { useReview } from '@/composables/useReview.js'
import { useStudyTime } from '@/composables/useStudyTime.js'
import { useAuth } from '@/composables/useAuth.js'
import CardFormModal from '@/components/CardFormModal.vue'

const SUBJECT_COLORS = [
  'rgba(239,68,68,0.15)', 'rgba(34,197,94,0.15)', 'rgba(59,130,246,0.15)',
  'rgba(168,85,247,0.15)', 'rgba(245,158,11,0.15)', 'rgba(236,72,153,0.15)',
  'rgba(20,184,166,0.15)', 'rgba(99,102,241,0.15)', 'rgba(234,88,12,0.15)',
  'rgba(14,165,233,0.15)', 'rgba(107,114,128,0.15)', 'rgba(156,163,175,0.15)'
]

export default {
  components: { CardFormModal },
  setup() {
    const { isDark } = useTheme()
    const review = useReview()
    const studyTime = useStudyTime()
    const { requireLogin } = useAuth()
    return { isDark, ...review, ...studyTime, requireLogin }
  },
  data() {
    return {
      tab: 'review',
      flipped: false,
      showForm: false,
      reviewVisible: false,
      translationMessage: '正在获取中文释义...'
    }
  },
  computed: {
    currentCard() {
      return this.dueCards[0] || {}
    }
  },
  watch: {
    'currentCard.id'() {
      this.flipped = false
      if (!this.reviewVisible) return
      this.loadCurrentCardTranslation()
      this.$nextTick(() => this.syncReviewTiming())
    }
  },
  async onShow() {
    if (!this.requireLogin()) return
    this.reviewVisible = true
    this.startDueRefresh()
    // 从其他页面切回时重新加载（可能从研究页导入了新卡片）
    this.loadCards()
    await this.loadCurrentCardTranslation()
    if (this.reviewVisible) this.$nextTick(() => this.syncReviewTiming())
  },
  onHide() {
    this.reviewVisible = false
    this.stopDueRefresh()
    this.stopReviewCardTiming()
  },
  onUnload() {
    this.reviewVisible = false
    this.stopDueRefresh()
    this.stopReviewCardTiming()
  },
  methods: {
    goHome() {
      uni.navigateTo({ url: '/pages/home/home' })
    },
    onRate(rating) {
      const id = this.currentCard.id
      if (!id) return
      this.recordReviewInteraction()
      this.reviewCard(id, rating)
      this.flipped = false
      this.$nextTick(() => {
        this.loadCurrentCardTranslation()
        this.syncReviewTiming()
      })
    },
    async onFlip() {
      this.recordReviewInteraction()
      this.flipped = !this.flipped
      if (!this.flipped || !this.currentCard.id) return

      await this.loadCurrentCardTranslation()
    },
    setTab(tab) {
      if (this.tab === tab) return
      this.tab = tab
      this.$nextTick(() => this.syncReviewTiming())
    },
    syncReviewTiming() {
      if (this.reviewVisible && this.tab === 'review' && this.currentCard.id) {
        this.startReviewCardTiming(this.currentCard.id)
      } else {
        this.stopReviewCardTiming()
      }
    },
    hasCardAnswer(card) {
      return Boolean(String(card && card.back || '').trim())
    },
    displayCardBack(card) {
      return this.hasCardAnswer(card)
        ? card.back
        : this.translationMessage
    },
    async loadCurrentCardTranslation() {
      const id = this.currentCard.id
      if (!id || this.hasCardAnswer(this.currentCard)) return

      this.translationMessage = '正在获取中文释义...'
      const translated = await this.ensureCardTranslation(id)
      if (this.currentCard.id !== id) return
      if (!translated && !this.hasCardAnswer(this.currentCard)) {
        this.translationMessage = '暂无答案，点击卡片重试'
      }
    },
    onAddCard({ front, back, subject }) {
      this.addCard(front, back, subject)
      this.showForm = false
      uni.showToast({ title: '已添加', icon: 'success' })
    },
    onDelete(id) {
      uni.showModal({
        title: '删除卡片',
        content: '确定要删除这张复习卡吗？',
        success: (res) => {
          if (res.confirm) this.removeCard(id)
        }
      })
    },
    subjectColor(subject) {
      const idx = this.SUBJECTS.indexOf(subject)
      return SUBJECT_COLORS[idx >= 0 ? idx : SUBJECT_COLORS.length - 1]
    },
    intervalLabel(card) {
      if (card.nextReview <= this.reviewNow) return '待复习'
      if (card.interval === 0) {
        const minutes = Math.max(1, Math.ceil((card.nextReview - this.reviewNow) / (60 * 1000)))
        return `${minutes}分钟后`
      }
      if (card.interval >= 21) return '已掌握'
      if (card.interval === 1) return '1天后'
      return `${card.interval}天后`
    },
    memoryStatusLabel(card) {
      return card.memoryStatus || '未复习'
    },
    memoryStatusClass(card) {
      const status = this.memoryStatusLabel(card)
      return {
        forgotten: status === '未记住',
        hard: status === '记得不牢',
        remembered: status === '已记住',
        familiar: status === '很熟悉'
      }
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

/* 统计栏 */
.stats-row {
  display: flex;
  gap: 16rpx;
  margin: 16rpx 0;
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

/* Tab 切换 */
.tab-bar {
  display: flex;
  gap: 0;
  margin: 16rpx 0;
  background: var(--bg-card);
  border-radius: 18rpx;
  border: 1rpx solid var(--border);
  overflow: hidden;
}
.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 76rpx;
}
.tab.active {
  background: var(--accent);
}
.tab-text {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-secondary);
}
.tab-text.active {
  color: #FFFFFF;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.deck-panel {
  min-height: calc(100vh - 460rpx);
  display: flex;
  flex-direction: column;
}
.deck-panel.is-empty .empty-state {
  flex: 1;
  padding: 56rpx 0 40rpx;
}
.deck-panel .add-btn {
  margin-top: auto;
  margin-bottom: calc(env(safe-area-inset-bottom) + 32rpx);
}
.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}
.empty-text {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 12rpx;
}
.empty-sub {
  font-size: 24rpx;
  color: var(--text-secondary);
  text-align: center;
  padding: 0 40rpx;
}

/* 闪卡区域 */
.flashcard-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
}
.progress-hint {
  font-size: 24rpx;
  color: var(--text-secondary);
  margin-bottom: 24rpx;
}
.flashcard {
  width: 100%;
  min-height: 360rpx;
  background: var(--bg-card);
  border-radius: 24rpx;
  border: 1rpx solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 18rpx 42rpx rgba(34, 52, 91, 0.08);
}
.card-face {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48rpx 40rpx;
  width: 100%;
}
.card-subject {
  font-size: 22rpx;
  color: var(--text-secondary);
  margin-bottom: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
  background: var(--accent-light);
}
.card-main-text {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--text);
  text-align: center;
  line-height: 1.4;
  word-break: break-word;
}
.card-hint {
  font-size: 22rpx;
  color: var(--text-secondary);
  margin-top: 32rpx;
  opacity: 0.6;
}
.card-front-echo {
  font-size: 24rpx;
  color: var(--text-secondary);
  margin-top: 20rpx;
}

/* 评分按钮 */
.rating-row {
  display: flex;
  gap: 12rpx;
  margin-top: 32rpx;
  width: 100%;
}
.rating-btn {
  flex: 1;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
}
.rating-btn.forgot { background: #EF4444; }
.rating-btn.hard { background: #F59E0B; }
.rating-btn.good { background: #3B82F6; }
.rating-btn.easy { background: #22C55E; }
.rating-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #FFFFFF;
}

/* 卡组列表 */
.deck-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: var(--bg-card);
  border-radius: 18rpx;
  border: 1rpx solid var(--border);
  margin-bottom: 16rpx;
}
.deck-card-info {
  flex: 1;
}
.deck-card-top {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.deck-subject {
  font-size: 20rpx;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  color: var(--text);
}
.deck-interval {
  font-size: 20rpx;
  color: var(--text-secondary);
}
.memory-status {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  color: var(--text-secondary);
  background: var(--accent-light);
}
.memory-status.forgotten { color: #D5363B; background: rgba(239, 68, 68, 0.12); }
.memory-status.hard { color: #B66A00; background: rgba(245, 158, 11, 0.14); }
.memory-status.remembered { color: #2066C7; background: rgba(59, 130, 246, 0.13); }
.memory-status.familiar { color: #14834A; background: rgba(34, 197, 94, 0.13); }
.deck-front {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text);
  display: block;
  margin-bottom: 4rpx;
}
.deck-back {
  font-size: 24rpx;
  color: var(--text-secondary);
  display: block;
}
.deck-delete {
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
  margin-top: 12rpx;
}
.add-btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.bottom-spacer {
  height: 40rpx;
}
</style>
