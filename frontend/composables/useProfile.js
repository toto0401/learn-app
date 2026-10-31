import { ref, computed } from 'vue'
import { scheduleStudyDataSync } from './useStudySync.js'
import { activateProfileForUser, saveProfileForUser } from './profileStorage.js'

const AVATARS = ['🧑‍🎓', '👩‍🔬', '🧑‍💻', '👩‍🚀', '🦊', '🐱', '🐼', '🦉', '🌟', '🎯']

const ACHIEVEMENTS = [
  { id: 'first_done', icon: '🔥', name: '初次打卡', desc: '完成第一个任务' },
  { id: 'streak_3', icon: '📅', name: '坚持三天', desc: '连续打卡3天' },
  { id: 'streak_7', icon: '🔥', name: '一周不断', desc: '连续打卡7天' },
  { id: 'cards_20', icon: '📚', name: '卡片收藏家', desc: '复习卡达到20张' },
  { id: 'tasks_30', icon: '✅', name: '任务达人', desc: '累计完成30个任务' },
  { id: 'hours_10', icon: '🏆', name: '学习之星', desc: '累计学习时长超过10小时' },
  { id: 'mastered_10', icon: '🧠', name: '记忆大师', desc: '掌握10张复习卡' }
]

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function calcStreak(days) {
  if (!days.length) return 0
  const sorted = [...days].sort().reverse()
  const today = getToday()
  // 允许今天或昨天作为起点
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  if (sorted[0] !== today && sorted[0] !== yesterdayStr) return 0

  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diff = (prev - curr) / (24 * 60 * 60 * 1000)
    if (Math.round(diff) === 1) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export function useProfile() {
  const nickname = ref('学习者')
  const avatarIndex = ref(0)
  const avatarImage = ref('')
  const checkinDays = ref([])

  function getCurrentSession() {
    try {
      const session = JSON.parse(uni.getStorageSync('auth_session') || '{}')
      return session && session.accessToken ? session : null
    } catch {
      return null
    }
  }

  function resetProfile() {
    nickname.value = '学习者'
    avatarIndex.value = 0
    avatarImage.value = ''
    checkinDays.value = []
  }

  function load() {
    try {
      const session = getCurrentSession()
      const data = activateProfileForUser(session || {})
      nickname.value = data.nickname
      avatarIndex.value = data.avatarIndex
      avatarImage.value = data.avatarImage
      checkinDays.value = data.checkinDays
    } catch {
      resetProfile()
    }
  }

  function save() {
    try {
      const session = getCurrentSession()
      saveProfileForUser(session || {}, {
        nickname: nickname.value,
        avatarIndex: avatarIndex.value,
        avatarImage: avatarImage.value,
        checkinDays: checkinDays.value
      })
    } catch {}
    scheduleStudyDataSync()
  }

  function setNickname(name) {
    nickname.value = name.trim() || '学习者'
    save()
  }

  function setAvatar(index) {
    const previousImage = avatarImage.value
    avatarIndex.value = index
    avatarImage.value = ''
    save()
    removeSavedAvatar(previousImage)
  }

  function setRemoteAvatar(avatarUrl) {
    const previousImage = avatarImage.value
    avatarImage.value = avatarUrl || ''
    save()
    if (previousImage && previousImage !== avatarUrl) removeSavedAvatar(previousImage)
  }

  function removeSavedAvatar(filePath) {
    if (!filePath || typeof uni.removeSavedFile !== 'function') return
    uni.removeSavedFile({ filePath, fail: () => {} })
  }

  function checkin() {
    const today = getToday()
    if (!checkinDays.value.includes(today)) {
      checkinDays.value.push(today)
      save()
    }
  }

  const currentStreak = computed(() => calcStreak(checkinDays.value))

  // 成就解锁判定需要外部数据，返回一个函数
  function getUnlockedAchievements(plannerTasks, reviewCards, reviewSeconds = 0) {
    const completedTasks = plannerTasks.filter(t => t.done)
    const taskMinutes = completedTasks.reduce((s, t) => s + t.duration, 0)
    const totalMinutes = taskMinutes + Math.floor(Number(reviewSeconds) / 60)
    const masteredCards = reviewCards.filter(c => c.interval >= 21)
    const streak = calcStreak(checkinDays.value)

    const unlocked = new Set()

    if (completedTasks.length >= 1) unlocked.add('first_done')
    if (streak >= 3) unlocked.add('streak_3')
    if (streak >= 7) unlocked.add('streak_7')
    if (reviewCards.length >= 20) unlocked.add('cards_20')
    if (completedTasks.length >= 30) unlocked.add('tasks_30')
    if (totalMinutes >= 600) unlocked.add('hours_10')
    if (masteredCards.length >= 10) unlocked.add('mastered_10')

    return ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: unlocked.has(a.id)
    }))
  }

  function clearAllData() {
    try {
      uni.removeStorageSync('planner_tasks')
      uni.removeStorageSync('review_cards')
      uni.removeStorageSync('study_statistics')
      uni.removeStorageSync('translate_cache')
      uni.removeStorageSync('translate_cache_v2')
      uni.removeStorageSync('managed_sources')
      uni.removeStorageSync('reminder_settings')
      uni.removeStorageSync('last_backup_at')
      // Reset the current user's check-ins while retaining their nickname and avatar.
      checkinDays.value = []
      save()
    } catch {}
  }

  load()
  if (typeof uni.$on === 'function') {
    uni.$on('study-data-updated', load)
  }

  return {
    nickname,
    avatarIndex,
    avatarImage,
    checkinDays,
    currentStreak,
    checkin,
    setNickname,
    setAvatar,
    setRemoteAvatar,
    getUnlockedAchievements,
    clearAllData,
    load,
    AVATARS,
    ACHIEVEMENTS
  }
}
