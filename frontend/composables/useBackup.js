import { ref } from 'vue'
import { DEFAULT_REMINDER_SETTINGS } from './useReminders.js'
import { scheduleStudyDataSync } from './useStudySync.js'
import { validateBackupData } from '@/utils/backupValidation.js'

const BACKUP_VERSION = 1
const STORAGE_DEFAULTS = {
  planner_tasks: [],
  review_cards: [],
  profile_data: {
    nickname: '学习者',
    avatarIndex: 0,
    checkinDays: []
  },
  study_statistics: {
    reviewSeconds: 0
  },
  translate_cache: {},
  translate_cache_v2: {},
  managed_sources: [],
  reminder_settings: { ...DEFAULT_REMINDER_SETTINGS }
}

const STORAGE_KEYS = Object.keys(STORAGE_DEFAULTS)

function cloneDefault(key) {
  return JSON.parse(JSON.stringify(STORAGE_DEFAULTS[key]))
}

export function useBackup() {
  const lastBackupAt = ref(uni.getStorageSync('last_backup_at') || 0)

  function buildBackup() {
    const data = {}
    STORAGE_KEYS.forEach((key) => {
      try {
        const raw = uni.getStorageSync(key)
        data[key] = raw ? JSON.parse(raw) : cloneDefault(key)
      } catch {
        data[key] = cloneDefault(key)
      }
    })

    return {
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      app: 'Research & Writing Assistant',
      data
    }
  }

  function exportBackup() {
    const backup = buildBackup()
    const text = JSON.stringify(backup, null, 2)
    uni.setStorageSync('last_backup_at', backup.exportedAt)
    lastBackupAt.value = backup.exportedAt
    return text
  }

  function importBackup(text) {
    const parsed = JSON.parse(text)
    if (!parsed || parsed.version !== BACKUP_VERSION || !parsed.data) {
      throw new Error('备份文件格式不正确')
    }

    const data = validateBackupData(parsed.data, STORAGE_DEFAULTS)
    const importedAt = Date.now()
    const updates = Object.entries(data).map(([key, value]) => [key, JSON.stringify(value)])
    updates.push(['last_backup_at', importedAt])
    const previous = updates.map(([key]) => [key, uni.getStorageSync(key)])
    const written = []
    try {
      updates.forEach(([key, value], index) => {
        uni.setStorageSync(key, value)
        written.push(previous[index])
      })
    } catch (error) {
      // Validation and serialization have completed before the first write.
      // Restore successful writes if the device rejects a later storage write.
      written.reverse().forEach(([key, value]) => {
        if (value === '' || value === undefined) uni.removeStorageSync(key)
        else uni.setStorageSync(key, value)
      })
      throw error
    }

    lastBackupAt.value = importedAt
    scheduleStudyDataSync()
    // Reload all study singletons before any page can edit the restored data.
    if (typeof uni.$emit === 'function') uni.$emit('study-data-updated')
  }

  return {
    lastBackupAt,
    exportBackup,
    importBackup
  }
}
