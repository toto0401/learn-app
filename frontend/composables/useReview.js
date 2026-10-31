import { ref, computed } from 'vue'
import { scheduleStudyDataSync } from './useStudySync.js'
import { translateWord } from '@/api/translate.js'

const STORAGE_KEY = 'review_cards'
const SUBJECTS = ['科学', '生物', '化学', '物理', '历史', '文学', '地理', '数学', '经济', '心理学', '计算机科学', '其他']
const MASTERED_THRESHOLD = 21 // interval >= 21天视为已掌握
const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE
const MEMORY_STATUS_BY_RATING = ['未记住', '记得不牢', '已记住', '很熟悉']
const globalCards = ref([])
let syncListenerRegistered = false
const pendingTranslations = new Set()

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function isEnglishWord(value) {
  return /^[A-Za-z][A-Za-z\s'-]*$/.test(String(value || '').trim())
}

function hasChinese(value) {
  return /[\u4e00-\u9fff]/.test(String(value || ''))
}

function compactTranslation(value) {
  const text = String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/^(?:[a-z]+\.\s*|【[^】]+】\s*)+/i, '')
    .trim()
  if (!hasChinese(text)) return text

  const meanings = text
    .split(/[，、；;,]/)
    .map(part => part.replace(/^(?:[a-z]+\.\s*|【[^】]+】\s*)+/i, '').trim().replace(/[。．.]+$/, ''))
    .filter(part => hasChinese(part))
    .slice(0, 2)
  return meanings.length ? meanings.join('；') : text
}

export function useReview() {
  const cards = globalCards
  const reviewNow = ref(Date.now())
  let dueRefreshTimer = null

  function startDueRefresh() {
    stopDueRefresh()
    reviewNow.value = Date.now()
    dueRefreshTimer = setInterval(() => { reviewNow.value = Date.now() }, 1000)
  }

  function stopDueRefresh() {
    if (dueRefreshTimer) clearInterval(dueRefreshTimer)
    dueRefreshTimer = null
  }

  // --- 持久化 ---
  function loadCards() {
    try {
      const raw = uni.getStorageSync(STORAGE_KEY)
      const storedCards = raw ? JSON.parse(raw) : []
      // Reading a card must never rewrite a user's answer.
      cards.value = Array.isArray(storedCards) ? storedCards : []
    } catch {
      cards.value = []
    }
    reviewNow.value = Date.now()
  }

  function saveCards() {
    try {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(cards.value))
  } catch {}
    scheduleStudyDataSync()
  }

  // --- 计算属性 ---
  const dueCards = computed(() => {
    const now = reviewNow.value
    return cards.value
      .filter(c => c.nextReview <= now)
      .sort((a, b) => a.nextReview - b.nextReview)
  })

  const masteredCount = computed(() =>
    cards.value.filter(c => c.interval >= MASTERED_THRESHOLD).length
  )

  const stats = computed(() => ({
    total: cards.value.length,
    dueToday: dueCards.value.length,
    mastered: masteredCount.value
  }))

  // --- CRUD ---
  function addCard(front, back, subject = '') {
    cards.value.push({
      id: generateId(),
      front: front.trim(),
      back: back.trim(),
      subject,
      createdAt: Date.now(),
      nextReview: Date.now(),
      interval: 0,
      ease: 2.5,
      reviewCount: 0,
      memoryStatus: '未复习'
    })
    saveCards()
  }

  function addCards(vocabArray, subject = '') {
    const existingFronts = new Set(
      cards.value.map(c => c.front.trim().toLowerCase())
    )
    let added = 0
    for (const item of vocabArray) {
      const front = (item.en || item.front || '').trim()
      const back = compactTranslation(item.zh || item.back || '')
      if (!front || !hasChinese(back)) continue
      if (existingFronts.has(front.toLowerCase())) continue
      existingFronts.add(front.toLowerCase())
      cards.value.push({
        id: generateId(),
        front,
        back,
        subject,
        createdAt: Date.now(),
        nextReview: Date.now(),
        interval: 0,
        ease: 2.5,
        reviewCount: 0,
        memoryStatus: '未复习'
      })
      added++
    }
    if (added > 0) saveCards()
    return added
  }

  function removeCard(id) {
    cards.value = cards.value.filter(c => c.id !== id)
    saveCards()
  }

  async function ensureCardTranslation(id) {
    const card = cards.value.find(item => item.id === id)
    if (!card) return false

    // Numeric, formula and English answers are just as valid as Chinese ones.
    if (String(card.back || '').trim()) return true
    if (!isEnglishWord(card.front) || pendingTranslations.has(id)) return false

    const session = uni.getStorageSync('auth_session')
    pendingTranslations.add(id)
    try {
      const translation = await translateWord(card.front)
      if (!hasChinese(translation)) return false
      // An import, deletion or account switch may have replaced this card.
      if (uni.getStorageSync('auth_session') !== session || !cards.value.includes(card)) return false
      card.back = compactTranslation(translation)
      saveCards()
      return true
    } catch {
      return false
    } finally {
      pendingTranslations.delete(id)
    }
  }

  // --- SM-2 间隔重复 ---
  function reviewCard(id, rating) {
    // rating: 0=忘了, 1=困难, 2=一般, 3=简单
    const card = cards.value.find(c => c.id === id)
    if (!card) return

    const now = Date.now()
    reviewNow.value = now
    card.memoryStatus = MEMORY_STATUS_BY_RATING[rating] || '未复习'
    if (rating === 0) {
      // Revisit forgotten cards soon instead of waiting until the next day.
      card.interval = 0
      card.ease = Math.max(1.3, card.ease - 0.2)
      card.nextReview = now + 10 * MINUTE
    } else if (card.interval === 0) {
      // The first rating must reflect the user's choice. Previously all four
      // buttons scheduled the card for one day later.
      card.interval = rating === 1 ? 1 : 3
      if (rating === 1) card.ease = Math.max(1.3, card.ease - 0.15)
      if (rating === 3) card.ease += 0.15
      card.nextReview = now + card.interval * DAY
    } else {
      // Later reviews extend the current interval according to the rating.
      if (rating === 1) {
        card.ease = Math.max(1.3, card.ease - 0.15)
      } else if (rating === 3) {
        card.ease += 0.15
      }
      const multiplier = rating === 1 ? Math.max(1.2, card.ease - 0.5)
        : rating === 3 ? card.ease + 0.5
          : card.ease
      card.interval = Math.max(1, Math.round(card.interval * multiplier))
      card.nextReview = now + card.interval * DAY
    }

    card.reviewCount++
    saveCards()
  }

  loadCards()
  if (!syncListenerRegistered && typeof uni.$on === 'function') {
    uni.$on('study-data-updated', () => {
      loadCards()
    })
    syncListenerRegistered = true
  }

  return {
    cards,
    dueCards,
    stats,
    addCard,
    addCards,
    removeCard,
    reviewCard,
    ensureCardTranslation,
    loadCards,
    reviewNow,
    startDueRefresh,
    stopDueRefresh,
    SUBJECTS
  }
}
