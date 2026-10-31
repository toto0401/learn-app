import { computed, ref } from 'vue'
import { scheduleStudyDataSync } from './useStudySync.js'

const STORAGE_KEY = 'study_statistics'
const MAX_ACTIVE_INTERVAL_SECONDS = 60

const reviewSeconds = ref(0)
let loaded = false
let activeCardId = ''
let lastInteractionAt = 0
let syncListenerRegistered = false

function normalizeSeconds(value) {
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : 0
}

function loadStudyTime() {
  if (loaded) return
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : {}
    reviewSeconds.value = normalizeSeconds(data.reviewSeconds)
  } catch {
    reviewSeconds.value = 0
  }
  loaded = true
}

function saveStudyTime() {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify({ reviewSeconds: reviewSeconds.value }))
  } catch {}
  scheduleStudyDataSync()
}

function recordActiveInterval() {
  if (!activeCardId || !lastInteractionAt) return 0

  const now = Date.now()
  const elapsedSeconds = Math.floor((now - lastInteractionAt) / 1000)
  lastInteractionAt = now
  if (elapsedSeconds <= 0) return 0

  // A forgotten page must not turn into study time. A user can earn up to one
  // minute for each uninterrupted card-viewing interval.
  const creditedSeconds = Math.min(elapsedSeconds, MAX_ACTIVE_INTERVAL_SECONDS)
  reviewSeconds.value += creditedSeconds
  saveStudyTime()
  return creditedSeconds
}

export function useStudyTime() {
  loadStudyTime()
  if (!syncListenerRegistered && typeof uni.$on === 'function') {
    uni.$on('study-data-updated', () => {
      activeCardId = ''
      lastInteractionAt = 0
      loaded = false
      loadStudyTime()
    })
    uni.$on('study-data-pausing', stopReviewCardTiming)
    syncListenerRegistered = true
  }

  function startReviewCardTiming(cardId) {
    if (!cardId || activeCardId === cardId) return
    stopReviewCardTiming()
    activeCardId = cardId
    lastInteractionAt = Date.now()
  }

  function recordReviewInteraction() {
    return recordActiveInterval()
  }

  function stopReviewCardTiming() {
    const creditedSeconds = recordActiveInterval()
    activeCardId = ''
    lastInteractionAt = 0
    return creditedSeconds
  }

  function reloadStudyTime() {
    loaded = false
    loadStudyTime()
  }

  function resetReviewTime() {
    activeCardId = ''
    lastInteractionAt = 0
    reviewSeconds.value = 0
    saveStudyTime()
  }

  return {
    reviewSeconds,
    reviewMinutes: computed(() => Math.floor(reviewSeconds.value / 60)),
    startReviewCardTiming,
    recordReviewInteraction,
    stopReviewCardTiming,
    reloadStudyTime,
    resetReviewTime
  }
}
