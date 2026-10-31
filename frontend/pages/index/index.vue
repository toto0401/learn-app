<template>
  <view class="page" :class="{ dark: isDark }">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="nav-left">
        <view class="home-btn" @tap="goHome">
          <text class="home-icon">&#8962;</text>
        </view>
        <view class="reset-btn" @tap="resetPage" v-if="status !== 'idle'">
          <text class="reset-icon">↺</text>
        </view>
        <text class="nav-title">Research Assistant</text>
      </view>
      <view class="nav-actions">
        <view class="nav-btn" @tap="openVocab" v-if="vocabulary.length > 0">
          <text class="nav-btn-text">词汇表</text>
        </view>
        <view class="nav-btn theme-btn" @tap="toggleTheme">
          <text class="theme-icon">{{ isDark ? '☀️' : '🌙' }}</text>
        </view>
      </view>
    </view>

    <view class="main-content">
      <!-- 搜索栏 -->
      <SearchBar
        :query="query"
        :subject="subject"
        :loading="status === 'searching' || status === 'generating'"
        @update:query="query = $event"
        @update:subject="subject = $event"
        @search="onStartResearch"
      />

      <view v-if="status === 'idle' && !summary && sources.length === 0" class="research-welcome">
        <text class="welcome-kicker">研究入口</text>
        <text class="welcome-title">选一个科目，输入今天要弄明白的问题。</text>
        <text class="welcome-desc">你可以从下面的主题开始，也可以直接输入自己的研究课题。</text>
        <view class="topic-list">
          <view
            v-for="topic in quickTopics"
            :key="topic.query"
            class="topic-chip"
            @tap="fillQuickTopic(topic)"
          >
            <text class="topic-subject">{{ topic.subject }}</text>
            <text class="topic-text">{{ topic.query }}</text>
          </view>
        </view>
      </view>

      <!-- 进度条 -->
      <ProgressBar v-if="status !== 'idle'" :status="status" />

      <!-- 错误提示 -->
      <view v-if="status === 'error'" class="error-card">
        <text class="error-text">{{ errorMessage }}</text>
        <view class="retry-btn" @tap="startResearch">
          <text class="retry-text">重试</text>
        </view>
      </view>

      <!-- 摘要卡片 -->
      <SummaryCard
        :summary="summary"
        :streaming="status === 'generating'"
        @word-tap="onWordTap"
        @explain="onExplain"
      />

      <!-- 参考资料 -->
      <ReferenceList :sources="sources" />

      <!-- 生成提纲按钮 -->
      <view v-if="status === 'done'" class="action-area">
        <view class="outline-btn" @tap="goToOutline">
          <text class="outline-btn-text">生成写作提纲 →</text>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="bottom-spacer"></view>
    </view>

    <!-- 点词翻译气泡 -->
    <WordBubble
      :show="translateState.showBubble"
      :word="translateState.currentWord"
      :translation="translateState.currentResult"
      :loading="translateState.loading"
      :saved="isVocabularySaved(translateState.currentWord)"
      :x="translateState.bubblePosition.x"
      :y="translateState.bubblePosition.y"
      @add-vocab="onAddVocabularyWord"
    />
    <!-- 点击其他地方关闭气泡 -->
    <view
      v-if="translateState.showBubble"
      class="bubble-overlay"
      @tap="translateState.closeBubble()"
    ></view>

    <!-- 词汇表侧边栏 -->
    <VocabSidebar
      :show="showVocab"
      :vocabulary="vocabulary"
      :loading="vocabularyLoading"
      :error-message="vocabularyError"
      @close="showVocab = false"
      @save-to-review="onSaveVocabToReview"
      @remove-word="onRemoveVocabularyWord"
    />

    <!-- 段落解释弹窗 -->
    <ExplainPopup
      :show="showExplain"
      :loading="explainLoading"
      :explanation="explainText"
      :originalText="explainOriginal"
      @close="showExplain = false"
    />
  </view>
</template>

<script>
import { reactive } from 'vue'
import { useResearch } from '@/composables/useResearch.js'
import { useTranslate } from '@/composables/useTranslate.js'
import { useTheme } from '@/composables/useTheme.js'
import { useReview } from '@/composables/useReview.js'
import { useAuth } from '@/composables/useAuth.js'
import { translateWord } from '@/api/translate.js'
import SearchBar from '@/components/SearchBar.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import SummaryCard from '@/components/SummaryCard.vue'
import ReferenceList from '@/components/ReferenceList.vue'
import WordBubble from '@/components/WordBubble.vue'
import VocabSidebar from '@/components/VocabSidebar.vue'
import ExplainPopup from '@/components/ExplainPopup.vue'

export default {
  components: { SearchBar, ProgressBar, SummaryCard, ReferenceList, WordBubble, VocabSidebar, ExplainPopup },
  setup() {
    const research = useResearch()
    const translateState = reactive(useTranslate())
    const { isDark, toggle: toggleTheme } = useTheme()
    const { addCards } = useReview()
    const { requireLogin } = useAuth()

    return {
      ...research,
      translateState,
      isDark,
      toggleTheme,
      addCards,
      requireLogin
    }
  },
  data() {
    return {
      showVocab: false,
      showExplain: false,
      explainLoading: false,
      explainText: '',
      explainOriginal: '',
      quickTopics: [
        { subject: '生物', query: 'Impact of Penicillin' },
        { subject: '历史', query: '丝绸之路如何影响文化交流' },
        { subject: '计算机科学', query: 'How neural networks learn' }
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
    resetPage() {
      this.query = ''
      this.subject = ''
      this.status = 'idle'
      this.summary = ''
      this.sources = []
      this.vocabulary = []
      this.errorMessage = ''
      this.showVocab = false
      this.showExplain = false
      this.translateState.closeBubble()
    },
    onWordTap({ word, x, y }) {
      this.translateState.translate(word, { x, y })
    },
    onStartResearch(searchQuery) {
      if (searchQuery) this.query = searchQuery
      this.startResearch(searchQuery)
    },
    fillQuickTopic(topic) {
      this.subject = topic.subject
      this.query = topic.query
    },
    openVocab() {
      this.translateState.closeBubble()
      this.showVocab = true
    },
    async onExplain({ paragraph }) {
      this.explainOriginal = paragraph
      this.explainText = ''
      this.explainLoading = true
      this.showExplain = true

      try {
        // MyMemory 单次限制 500 字符，按句子分段翻译
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph]
        const chunks = []
        let current = ''
        for (const s of sentences) {
          if ((current + s).length > 450) {
            if (current) chunks.push(current)
            current = s
          } else {
            current += s
          }
        }
        if (current) chunks.push(current)

        const results = []
        for (const chunk of chunks) {
          const result = await translateWord(chunk)
          results.push(result)
        }
        this.explainText = results.join('')
      } catch {
        this.explainText = '翻译失败，请重试'
      } finally {
        this.explainLoading = false
      }
    },
    goToOutline() {
      const data = {
        summary: this.summary,
        sources: JSON.parse(JSON.stringify(this.sources))
      }
      uni.navigateTo({
        url: '/pages/outline/outline',
        success: (res) => {
          res.eventChannel.emit('researchData', data)
        }
      })
    },
    onSaveVocabToReview() {
      if (this.vocabularyLoading) {
        uni.showToast({ title: '关键词翻译中，请稍候', icon: 'none' })
        return
      }
      // "手选" only marks words added by the user. Both hand-picked and
      // automatically extracted words belong in the review deck.
      const added = this.addCards(this.vocabulary, this.subject || '')
      if (added > 0) {
        uni.showModal({
          title: '已保存到复习',
          content: `已添加 ${added} 张词汇卡片。要现在开始复习吗？`,
          cancelText: '稍后',
          confirmText: '去复习',
          success: (res) => {
            if (res.confirm) uni.switchTab({ url: '/pages/review/review' })
          }
        })
      } else {
        const hasTranslatedWord = this.vocabulary.some(item => {
          const translation = String(item.zh || '').trim()
          return /[\u4e00-\u9fff]/.test(translation)
        })
        uni.showToast({
          title: hasTranslatedWord ? '这些词汇已存在' : '暂无可保存的翻译结果',
          icon: 'none'
        })
      }
    },
    onAddVocabularyWord() {
      const word = this.translateState.currentWord
      const translation = this.translateState.currentResult
      const added = this.addVocabularyWord(word, translation)
      if (added) {
        uni.showToast({ title: '已加入词汇表', icon: 'success' })
      } else if (!translation || translation === '翻译失败') {
        uni.showToast({ title: '翻译未完成或失败，暂不能加入', icon: 'none' })
      } else {
        uni.showToast({ title: '已在词汇表中', icon: 'none' })
      }
      setTimeout(() => {
        this.translateState.closeBubble()
      }, 500)
    },
    onRemoveVocabularyWord(word) {
      const removed = this.removeVocabularyWord(word)
      if (removed) {
        uni.showToast({ title: '已移除', icon: 'none' })
      }
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
  --text: #172033;
  --text-secondary: #69758C;
  --border: rgba(32, 48, 83, 0.1);
  --border-light: rgba(32, 48, 83, 0.07);
  --accent: #3157D5;
  --accent-light: #E9EEFF;
  --shadow: 0 18rpx 42rpx rgba(34, 52, 91, 0.08);
}
.page.dark {
  --bg: #121826;
  --bg-card: #1B2435;
  --text: #EEF2FF;
  --text-secondary: #AAB5CB;
  --border: rgba(184, 197, 225, 0.12);
  --border-light: rgba(184, 197, 225, 0.07);
  --accent: #4F6DE6;
  --accent-light: #24355F;
  --shadow: 0 18rpx 42rpx rgba(0, 0, 0, 0.25);
}

.nav-bar {
  position: sticky;
  top: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 104rpx;
  background: var(--bg);
  flex-shrink: 0;
  box-sizing: border-box;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.home-btn {
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.home-icon {
  font-size: 32rpx;
  color: var(--text-secondary);
}
.reset-btn {
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.reset-icon {
  font-size: 36rpx;
  color: var(--text-secondary);
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--text);
}
.nav-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.nav-btn {
  padding: 10rpx 20rpx;
  border-radius: 14rpx;
  background: var(--accent-light);
}
.nav-btn-text {
  font-size: 24rpx;
  color: var(--accent);
  font-weight: 500;
}
.theme-btn {
  padding: 8rpx;
}
.theme-icon {
  font-size: 28rpx;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 32rpx;
}

.research-welcome {
  margin-top: 12rpx;
  padding: 32rpx;
  background: var(--bg-card);
  border: 1rpx solid var(--border);
  border-radius: 24rpx;
  box-shadow: var(--shadow);
}
.welcome-kicker {
  display: block;
  font-size: 22rpx;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 14rpx;
  letter-spacing: 1rpx;
}
.welcome-title {
  display: block;
  font-size: 38rpx;
  line-height: 1.32;
  font-weight: 800;
  color: var(--text);
}
.welcome-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 25rpx;
  line-height: 1.45;
  color: var(--text-secondary);
}
.topic-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 28rpx;
}
.topic-chip {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
  background: var(--accent-light);
  border-radius: 16rpx;
}
.topic-chip:active {
  transform: scale(0.99);
}
.topic-subject {
  width: 116rpx;
  flex-shrink: 0;
  font-size: 23rpx;
  font-weight: 700;
  color: var(--accent);
}
.topic-text {
  flex: 1;
  min-width: 0;
  font-size: 25rpx;
  line-height: 1.35;
  color: var(--text);
}

.error-card {
  margin: 24rpx 0;
  padding: 24rpx;
  background: rgba(239, 68, 68, 0.06);
  border-radius: 12rpx;
}
.error-text {
  font-size: 26rpx;
  color: #EF4444;
  display: block;
  margin-bottom: 16rpx;
}
.retry-btn {
  display: inline-flex;
  padding: 10rpx 24rpx;
  background: #EF4444;
  border-radius: 8rpx;
}
.retry-text {
  font-size: 24rpx;
  color: #fff;
}

.action-area {
  padding: 24rpx 0;
}
.outline-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 92rpx;
  background: var(--accent);
  border-radius: 18rpx;
}
.outline-btn-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #FFFFFF;
  letter-spacing: 0.5rpx;
}

.bubble-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.bottom-spacer {
  height: 80rpx;
}
</style>
