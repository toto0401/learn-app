import { ref, reactive } from 'vue'
import { translateWord as apiTranslate } from '@/api/translate.js'

const CACHE_KEY = 'translate_cache_v2'

/**
 * 点词翻译 composable — 带 localStorage 缓存
 */
export function useTranslate() {
  const cache = reactive(loadCache())
  const loading = ref(false)
  const currentWord = ref('')
  const currentResult = ref('')
  const showBubble = ref(false)
  const bubblePosition = reactive({ x: 0, y: 0 })

  function loadCache() {
    try {
      return JSON.parse(uni.getStorageSync(CACHE_KEY) || '{}')
    } catch {
      return {}
    }
  }

  function saveCache() {
    try {
      uni.setStorageSync(CACHE_KEY, JSON.stringify(cache))
    } catch {
      // 存储失败忽略
    }
  }

  async function translate(word, position = { x: 0, y: 0 }) {
    const cleanWord = word.trim().toLowerCase()
    if (!cleanWord) return

    currentWord.value = word.trim()
    bubblePosition.x = position.x
    bubblePosition.y = position.y
    showBubble.value = true

    // 命中缓存
    if (cache[cleanWord]) {
      currentResult.value = cache[cleanWord]
      loading.value = false
      return
    }

    loading.value = true
    currentResult.value = ''

    try {
      const result = await apiTranslate(cleanWord)
      cache[cleanWord] = result
      saveCache()
      currentResult.value = result
    } catch {
      currentResult.value = '翻译失败'
    } finally {
      loading.value = false
    }
  }

  function closeBubble() {
    showBubble.value = false
    currentWord.value = ''
    currentResult.value = ''
  }

  return {
    loading,
    currentWord,
    currentResult,
    showBubble,
    bubblePosition,
    translate,
    closeBubble
  }
}
