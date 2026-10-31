import { computed, ref } from 'vue'

const STORAGE_KEY = 'reminder_settings'
const SHOWN_REMINDERS_KEY = 'shown_reminders'
const CHECK_INTERVAL = 30 * 1000

const DEFAULT_SETTINGS = {
  enabled: false,
  studyTime: '20:00',
  reviewTime: '21:00',
  remindStudy: true,
  remindReview: true
}

export { DEFAULT_SETTINGS as DEFAULT_REMINDER_SETTINGS }

const settings = ref({ ...DEFAULT_SETTINGS })
let loaded = false
let reminderTimer = null
let reminderModalOpen = false

function loadReminders() {
  if (loaded) return
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    settings.value = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS }
  } catch {
    settings.value = { ...DEFAULT_SETTINGS }
  }
  loaded = true
}

function reloadReminders() {
  loaded = false
  loadReminders()
}

function saveReminders() {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(settings.value))
  } catch {}
}

function minutesFromTime(time) {
  const [h, m] = String(time).split(':').map(n => parseInt(n, 10))
  if (Number.isNaN(h) || Number.isNaN(m)) return 0
  return h * 60 + m
}

function formatTime(time) {
  const [h, m] = String(time).split(':')
  return `${String(h || '00').padStart(2, '0')}:${String(m || '00').padStart(2, '0')}`
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function loadShownReminders() {
  try {
    const raw = uni.getStorageSync(SHOWN_REMINDERS_KEY)
    const shown = raw ? JSON.parse(raw) : {}
    return shown && typeof shown === 'object' ? shown : {}
  } catch {
    return {}
  }
}

function hasShownReminder(key) {
  return Boolean(loadShownReminders()[key])
}

function markReminderShown(key, today) {
  const shown = loadShownReminders()

  // Keep only today's entries so the local storage does not grow indefinitely.
  Object.keys(shown).forEach((storedKey) => {
    if (!storedKey.startsWith(`${today}:`)) delete shown[storedKey]
  })
  shown[key] = true

  try {
    uni.setStorageSync(SHOWN_REMINDERS_KEY, JSON.stringify(shown))
  } catch {}
}

function openReminderModal(reminder) {
  reminderModalOpen = true
  uni.showModal({
    title: reminder.title,
    content: reminder.content,
    cancelText: '稍后',
    confirmText: reminder.confirmText,
    success: (result) => {
      if (result.confirm) {
        uni.switchTab({ url: reminder.targetUrl })
      }
    },
    complete: () => {
      reminderModalOpen = false
    }
  })
}

/**
 * Check reminders while the app is visible. Native background notifications require
 * platform-specific configuration, but this gives users a clear in-app prompt.
 */
export function checkDueReminders() {
  loadReminders()
  if (!settings.value.enabled || reminderModalOpen) return false

  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const today = formatDate(now)
  const reminders = [
    {
      type: 'study',
      enabled: settings.value.remindStudy,
      time: settings.value.studyTime,
      title: '学习提醒',
      content: '到学习时间了，开始完成今天的学习计划吧。',
      confirmText: '去规划',
      targetUrl: '/pages/planner/planner'
    },
    {
      type: 'review',
      enabled: settings.value.remindReview,
      time: settings.value.reviewTime,
      title: '复习提醒',
      content: '到复习时间了，花几分钟巩固今天学过的内容吧。',
      confirmText: '去复习',
      targetUrl: '/pages/review/review'
    }
  ]

  const dueReminder = reminders.find((reminder) => {
    const key = `${today}:${reminder.type}:${formatTime(reminder.time)}`
    return reminder.enabled && formatTime(reminder.time) === currentTime && !hasShownReminder(key)
  })

  if (!dueReminder) return false

  const key = `${today}:${dueReminder.type}:${formatTime(dueReminder.time)}`
  markReminderShown(key, today)
  openReminderModal(dueReminder)
  return true
}

export function startReminderScheduler() {
  checkDueReminders()
  if (reminderTimer) return
  reminderTimer = setInterval(checkDueReminders, CHECK_INTERVAL)
}

export function stopReminderScheduler() {
  if (!reminderTimer) return
  clearInterval(reminderTimer)
  reminderTimer = null
}

export function useReminders() {
  loadReminders()

  const enabledLabels = computed(() => {
    if (!settings.value.enabled) return '未开启'
    const labels = []
    if (settings.value.remindStudy) labels.push(`学习 ${formatTime(settings.value.studyTime)}`)
    if (settings.value.remindReview) labels.push(`复习 ${formatTime(settings.value.reviewTime)}`)
    return labels.length ? labels.join(' · ') : '未选择提醒类型'
  })

  const nextReminderLabel = computed(() => {
    if (!settings.value.enabled) return '开启后显示下一次提醒'

    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const candidates = []

    if (settings.value.remindStudy) {
      candidates.push({ label: '学习', time: settings.value.studyTime, minutes: minutesFromTime(settings.value.studyTime) })
    }
    if (settings.value.remindReview) {
      candidates.push({ label: '复习', time: settings.value.reviewTime, minutes: minutesFromTime(settings.value.reviewTime) })
    }
    if (!candidates.length) return '未选择提醒类型'

    const today = candidates
      .filter(item => item.minutes >= currentMinutes)
      .sort((a, b) => a.minutes - b.minutes)[0]
    const next = today || candidates.sort((a, b) => a.minutes - b.minutes)[0]
    const day = today ? '今天' : '明天'
    return `${day} ${formatTime(next.time)} ${next.label}提醒`
  })

  function setEnabled(enabled) {
    settings.value.enabled = enabled
    saveReminders()
  }

  function updateReminder(patch) {
    settings.value = { ...settings.value, ...patch }
    saveReminders()
  }

  function resetReminders(options = {}) {
    settings.value = { ...DEFAULT_SETTINGS }
    if (options.persist !== false) {
      saveReminders()
    }
  }

  return {
    reminderSettings: settings,
    enabledLabels,
    nextReminderLabel,
    setEnabled,
    updateReminder,
    resetReminders,
    loadReminders,
    reloadReminders
  }
}
