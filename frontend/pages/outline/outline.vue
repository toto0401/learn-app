<template>
  <view class="page" :class="{ dark: isDark }">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="home-btn" @tap="goHome">
        <text class="home-icon">&#8962;</text>
      </view>
      <view class="back-btn" @tap="goBack">
        <text class="back-icon">←</text>
      </view>
      <text class="nav-title">Writing Outline</text>
      <view class="nav-btn theme-btn" @tap="toggleTheme">
        <text class="theme-icon">{{ isDark ? '☀️' : '🌙' }}</text>
      </view>
    </view>

    <view class="main-content">
      <!-- 模板选择 -->
      <TemplateSelector
        :templates="templates"
        :selected="template"
        @update:selected="template = $event"
      />

      <!-- 自定义要求输入 -->
      <view class="requirement-area">
        <text class="requirement-label">写作要求（可选）</text>
        <textarea
          class="requirement-input"
          v-model="requirement"
          placeholder="例如：重点分析经济影响、字数 800 字左右、需要包含数据对比..."
          placeholder-class="placeholder"
          :maxlength="500"
          auto-height
        />
      </view>

      <!-- 生成按钮 -->
      <view class="generate-area">
        <view
          class="generate-btn"
          :class="{ disabled: status === 'generating' || !hasSummary }"
          @tap="onGenerate"
        >
          <text class="generate-text">
            {{ status === 'generating' ? '生成中...' : '生成提纲' }}
          </text>
        </view>
      </view>

      <!-- 错误提示 -->
      <view v-if="status === 'error'" class="error-card">
        <text class="error-text">{{ errorMessage }}</text>
      </view>

      <!-- 提纲展示 -->
      <OutlineView :outline="outline" @copy="onCopy" />

      <view v-if="status === 'done' && outline" class="link-area">
        <view class="planner-link-btn" @tap="onCreatePlannerTasks">
          <text class="planner-link-text">把提纲拆成学习任务</text>
        </view>
      </view>

      <!-- 流式生成光标 -->
      <view v-if="status === 'generating' && outline" class="streaming-hint">
        <text class="streaming-text">正在生成... ▊</text>
      </view>

      <view class="bottom-spacer"></view>
    </view>
  </view>
</template>

<script>
import { useOutline } from '@/composables/useOutline.js'
import { useTheme } from '@/composables/useTheme.js'
import { usePlanner } from '@/composables/usePlanner.js'
import { useAuth } from '@/composables/useAuth.js'
import { copyToClipboard } from '@/utils/clipboard.js'
import TemplateSelector from '@/components/TemplateSelector.vue'
import OutlineView from '@/components/OutlineView.vue'

export default {
  components: { TemplateSelector, OutlineView },
  setup() {
    const outlineState = useOutline()
    const { isDark, toggle: toggleTheme } = useTheme()
    const planner = usePlanner()
    const { requireLogin } = useAuth()
    return { ...outlineState, isDark, toggleTheme, addPlannerTask: planner.addTask, requireLogin }
  },
  data() {
    return {
      researchSummary: '',
      researchSources: [],
      requirement: ''
    }
  },
  computed: {
    hasSummary() {
      return this.researchSummary.length > 0
    }
  },
  onLoad() {
    const eventChannel = this.getOpenerEventChannel()
    eventChannel.on('researchData', (data) => {
      this.researchSummary = data.summary || ''
      this.researchSources = data.sources || []
    })
  },
  onShow() {
    this.requireLogin()
  },
  methods: {
    goHome() {
      uni.navigateTo({ url: '/pages/home/home' })
    },
    goBack() {
      uni.navigateBack()
    },
    onGenerate() {
      if (this.status === 'generating' || !this.hasSummary) return
      this.generate(this.researchSummary, this.researchSources, this.requirement)
    },
    onCopy() {
      copyToClipboard(this.outline)
        .then(() => {
          uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
        })
        .catch(() => {
          uni.showToast({ title: '复制失败', icon: 'none' })
        })
    },
    onCreatePlannerTasks() {
      const headings = this.outline
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('## ') && !line.includes('References') && !line.includes('Writing Requirements'))
        .map(line => line.replace(/^##\s+/, '').trim())
        .filter(Boolean)
        .slice(0, 6)

      if (headings.length === 0) {
        uni.showToast({ title: '没有可拆分的章节', icon: 'none' })
        return
      }

      headings.forEach((heading, index) => {
        this.addPlannerTask('文学', `写作提纲：${heading}`, 30, { dayIndex: index % 5 })
      })

      uni.showModal({
        title: '已加入学习规划',
        content: `已创建 ${headings.length} 个写作任务，分配到本周工作日。`,
        cancelText: '继续编辑',
        confirmText: '去查看',
        success: (res) => {
          if (res.confirm) {
            uni.switchTab({ url: '/pages/planner/planner' })
          }
        }
      })
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 104rpx;
  background: var(--bg);
  flex-shrink: 0;
}
.home-btn {
  padding: 8rpx;
}
.home-icon {
  font-size: 36rpx;
  color: var(--text-secondary);
}
.back-btn {
  padding: 8rpx;
}
.back-icon {
  font-size: 32rpx;
  color: var(--text-secondary);
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.5rpx;
}
.nav-btn {
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

.requirement-area {
  padding: 0 0 24rpx;
}
.requirement-label {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 12rpx;
}
.requirement-input {
  width: 100%;
  min-height: 120rpx;
  padding: 20rpx 24rpx;
  background: var(--bg-card);
  border-radius: 18rpx;
  border: 1rpx solid var(--border);
  font-size: 27rpx;
  color: var(--text);
  line-height: 1.6;
  box-sizing: border-box;
}
.placeholder {
  color: var(--text-secondary);
}

.generate-area {
  padding: 0 0 24rpx;
}
.generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 84rpx;
  background: var(--accent);
  border-radius: 18rpx;
}
.generate-btn.disabled {
  opacity: 0.4;
}
.generate-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #FFFFFF;
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
}

.link-area {
  padding: 0 0 24rpx;
}
.planner-link-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 76rpx;
  border-radius: 18rpx;
  background: var(--accent-light);
  border: 1rpx solid var(--accent);
}
.planner-link-text {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--accent);
}

.streaming-hint {
  padding: 16rpx 0;
}
.streaming-text {
  font-size: 24rpx;
  color: var(--accent);
  animation: blink 1s step-end infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .streaming-text {
    animation: none;
  }
}

.bottom-spacer {
  height: 80rpx;
}
</style>
