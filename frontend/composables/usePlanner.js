import { ref, computed } from 'vue'
import { flushStudyDataSync, scheduleStudyDataSync } from './useStudySync.js'

const STORAGE_KEY = 'planner_tasks'
const SUBJECTS = ['科学', '生物', '化学', '物理', '历史', '文学', '地理', '数学', '经济', '心理学', '计算机科学', '其他']
const DURATIONS = [15, 30, 45, 60, 90, 120]
const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

// 全局单例：计时器状态（跨页面共享）
const globalTasks = ref([])
const timingTaskId = ref(null)
const remainingSeconds = ref(0)
let timerInterval = null
let tasksLoaded = false
let syncListenerRegistered = false

function loadTasks() {
  if (tasksLoaded) return
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    const storedTasks = raw ? JSON.parse(raw) : []
    globalTasks.value = Array.isArray(storedTasks) ? storedTasks : []
  } catch {
    globalTasks.value = []
  }
  tasksLoaded = true
}

function saveTasks() {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(globalTasks.value))
  } catch {}
  scheduleStudyDataSync()
}

function startTimer(id) {
  const task = globalTasks.value.find(t => t.id === id)
  if (!task) return
  if (timerInterval) stopTimer()
  timingTaskId.value = id
  const totalSec = task.duration * 60
  const elapsedSec = task.elapsed || 0
  remainingSeconds.value = Math.max(totalSec - elapsedSec, 0)
  if (remainingSeconds.value === 0) {
    uni.showModal({ title: '提示', content: '这个任务的学习时间已经用完了', showCancel: false })
    timingTaskId.value = null
    return
  }
  timerInterval = setInterval(() => {
    remainingSeconds.value--
    const t = globalTasks.value.find(t => t.id === timingTaskId.value)
    if (t) {
      t.elapsed = (t.elapsed || 0) + 1
      if (t.elapsed % 15 === 0) saveTasks()
    }
    if (remainingSeconds.value <= 0) {
      clearInterval(timerInterval)
      timerInterval = null
      const finishedTask = t
      if (finishedTask) { finishedTask.done = true; saveTasks() }
      timingTaskId.value = null
      remainingSeconds.value = 0
      uni.showModal({
        title: '⏰ 时间到！',
        content: `「${finishedTask ? finishedTask.description : ''}」学习完成，太棒了！`,
        cancelText: '结束',
        confirmText: '再来一次',
        success: (res) => {
          if (res.confirm && finishedTask) {
            // 重置 elapsed，重新开始倒计时
            finishedTask.elapsed = 0
            finishedTask.done = false
            saveTasks()
            startTimer(finishedTask.id)
          }
        }
      })
    }
  }, 1000)
}

function stopTimer() {
  if (!timerInterval) return
  clearInterval(timerInterval)
  timerInterval = null
  saveTasks()
  timingTaskId.value = null
  remainingSeconds.value = 0
  flushStudyDataSync()
}

function getWeekKey(offset) {
  const now = new Date()
  now.setDate(now.getDate() + offset * 7)
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + 1)
  const year = monday.getFullYear()
  const oneJan = new Date(year, 0, 1)
  const weekNum = Math.ceil(((monday - oneJan) / 86400000 + oneJan.getDay()) / 7)
  return `${year}-W${String(weekNum).padStart(2, '0')}`
}

function getWeekDays(offset) {
  const now = new Date()
  now.setDate(now.getDate() + offset * 7)
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + 1)

  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const today = new Date()
    const isToday = d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    days.push({
      label: DAY_LABELS[i],
      dateStr: `${d.getMonth() + 1}/${d.getDate()}`,
      dayIndex: i,
      isToday
    })
  }
  return days
}

export function usePlanner() {
  const tasks = globalTasks
  const weekOffset = ref(0)
  const selectedDay = ref(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)

  loadTasks()
  if (!syncListenerRegistered && typeof uni.$on === 'function') {
    uni.$on('study-data-updated', () => {
      // A replacement can reuse IDs. Stop without saving the old task array.
      if (timerInterval) clearInterval(timerInterval)
      timerInterval = null
      timingTaskId.value = null
      remainingSeconds.value = 0
      tasksLoaded = false
      loadTasks()
    })
    uni.$on('study-data-pausing', stopTimer)
    syncListenerRegistered = true
  }

  const currentWeekKey = computed(() => getWeekKey(weekOffset.value))
  const weekDays = computed(() => getWeekDays(weekOffset.value))

  const weekLabel = computed(() => {
    if (weekOffset.value === 0) return '本周'
    if (weekOffset.value === -1) return '上周'
    if (weekOffset.value === 1) return '下周'
    const days = getWeekDays(weekOffset.value)
    return `${days[0].dateStr} - ${days[6].dateStr}`
  })

  const weekTasks = computed(() =>
    tasks.value.filter(t => t.weekKey === currentWeekKey.value)
  )

  const dayTasks = computed(() =>
    weekTasks.value.filter(t => t.dayIndex === selectedDay.value)
  )

  const weekStats = computed(() => {
    const wt = weekTasks.value
    const completed = wt.filter(t => t.done)
    return {
      total: wt.length,
      completed: completed.length,
      totalMinutes: wt.reduce((s, t) => s + t.duration, 0),
      completedMinutes: completed.reduce((s, t) => s + t.duration, 0)
    }
  })

  function addTask(subject, description, duration, options = {}) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    tasks.value.push({
      id,
      subject,
      description,
      duration,
      done: false,
      elapsed: 0,
      weekKey: options.weekKey || currentWeekKey.value,
      dayIndex: typeof options.dayIndex === 'number' ? options.dayIndex : selectedDay.value
    })
    saveTasks()
    return id
  }

  function toggleDone(id) {
    const task = tasks.value.find(t => t.id === id)
    if (task) {
      task.done = !task.done
      saveTasks()
    }
  }

  function removeTask(id) {
    tasks.value = tasks.value.filter(t => t.id !== id)
    saveTasks()
  }

  function prevWeek() { weekOffset.value-- }
  function nextWeek() { weekOffset.value++ }
  function goThisWeek() {
    weekOffset.value = 0
    selectedDay.value = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  }

  return {
    tasks, weekOffset, selectedDay,
    currentWeekKey, weekDays, weekLabel, weekTasks, dayTasks, weekStats,
    timingTaskId, remainingSeconds,
    addTask, toggleDone, removeTask,
    startTimer, stopTimer,
    prevWeek, nextWeek, goThisWeek,
    SUBJECTS, DURATIONS
  }
}
