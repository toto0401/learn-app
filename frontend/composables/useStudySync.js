import { getStudyData, saveStudyData } from '@/api/study.js'
import { activateProfileForUser, saveProfileForUser } from './profileStorage.js'

const SESSION_KEY = 'auth_session'
const OWNER_KEY = 'study_data_owner_id'
const DIRTY_KEY = 'study_data_dirty'
const TASKS_KEY = 'planner_tasks'
const CARDS_KEY = 'review_cards'
const STUDY_STATISTICS_KEY = 'study_statistics'

let syncTimer = null
const initializationPromises = new Map()
let initializedSessionKey = ''
let localRevision = 0
const uploadQueues = new Map()

function parseStorage(key, fallback) {
  try {
    const raw = uni.getStorageSync(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function getSession() {
  const session = parseStorage(SESSION_KEY, null)
  return session && session.accessToken ? session : null
}

function getSessionKey(session) {
  return session ? `${session.id}:${session.accessToken}` : ''
}

function isActiveSession(session) {
  return getSessionKey(getSession()) === getSessionKey(session)
}

function getLocalData(ownerId = uni.getStorageSync(OWNER_KEY)) {
  const profile = String(uni.getStorageSync('profile_data_owner_id')) === String(ownerId)
    ? parseStorage('profile_data', {})
    : (parseStorage('profile_data_by_user', {})[String(ownerId)] || {})
  const studyStatistics = parseStorage(STUDY_STATISTICS_KEY, {})
  return {
    tasks: parseStorage(TASKS_KEY, []),
    review_cards: parseStorage(CARDS_KEY, []),
    checkin_days: Array.isArray(profile.checkinDays) ? profile.checkinDays : [],
    review_seconds: Math.max(0, Math.floor(Number(studyStatistics.reviewSeconds) || 0))
  }
}

function saveLocalData(data, session, dirty = false) {
  // A response from a previous account must never overwrite the active account.
  if (!isActiveSession(session)) return false

  const profile = activateProfileForUser(session)
  uni.setStorageSync(TASKS_KEY, JSON.stringify(data.tasks || []))
  uni.setStorageSync(CARDS_KEY, JSON.stringify(data.review_cards || []))
  saveProfileForUser(session, {
    ...profile,
    nickname: profile.nickname || session.nickname || '学习者',
    checkinDays: data.checkin_days || []
  })
  uni.setStorageSync(STUDY_STATISTICS_KEY, JSON.stringify({
    reviewSeconds: Math.max(0, Math.floor(Number(data.review_seconds) || 0))
  }))
  uni.setStorageSync(OWNER_KEY, String(session.id))
  uni.setStorageSync(DIRTY_KEY, dirty ? '1' : '0')
  localRevision++
  if (typeof uni.$emit === 'function') uni.$emit('study-data-updated')
  return true
}

function emptyStudyData() {
  return { tasks: [], review_cards: [], checkin_days: [], review_seconds: 0 }
}

function hasLocalOwner(userId) {
  return String(uni.getStorageSync(OWNER_KEY) || '') === String(userId)
}

function isDirty() {
  return uni.getStorageSync(DIRTY_KEY) === '1'
}

export function prepareStudyData(session = getSession()) {
  if (!session || !isActiveSession(session)) return

  let owner = String(uni.getStorageSync(OWNER_KEY) || '')
  // Older versions saved the profile owner but never assigned a study owner.
  // Capture this before activating the next account's profile.
  if (!owner) {
    owner = String(uni.getStorageSync('profile_data_owner_id') || '')
    if (owner) {
      uni.setStorageSync(OWNER_KEY, owner)
      const legacy = getLocalData(owner)
      if (legacy.tasks.length || legacy.review_cards.length || legacy.checkin_days.length || legacy.review_seconds) {
        uni.setStorageSync(DIRTY_KEY, '1')
      }
    }
  }
  if (hasLocalOwner(session.id)) return

  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = null
  const previous = getLocalData(owner)
  if (owner) {
    uni.setStorageSync(`study_data_user_${owner}`, JSON.stringify({ data: previous, dirty: isDirty() }))
  } else if (previous.tasks.length || previous.review_cards.length || previous.checkin_days.length || previous.review_seconds) {
    // Never assign data of unknown origin to a newly signed-in account.
    uni.setStorageSync(`study_data_unassigned_${Date.now()}`, JSON.stringify(previous))
  }
  const archived = parseStorage(`study_data_user_${session.id}`, null)
  initializedSessionKey = ''
  saveLocalData(archived ? archived.data : emptyStudyData(), session, Boolean(archived && archived.dirty))
}

function uploadStudyData(session) {
  // Serialize writes for each account so an earlier PUT cannot finish last.
  const key = String(session.id)
  const previous = uploadQueues.get(key) || Promise.resolve()
  const upload = previous.catch(() => {}).then(async () => {
    if (!isActiveSession(session) || !hasLocalOwner(session.id)) return null
    const revision = localRevision
    const saved = await saveStudyData(getLocalData(), session.accessToken)
    if (isActiveSession(session) && hasLocalOwner(session.id) && revision === localRevision) {
      uni.setStorageSync(DIRTY_KEY, '0')
    }
    return saved
  })
  uploadQueues.set(key, upload)
  const cleanup = () => {
    if (uploadQueues.get(key) === upload) uploadQueues.delete(key)
  }
  upload.then(cleanup, cleanup)
  return upload
}

export async function initializeStudyData(session = getSession()) {
  if (!session || !isActiveSession(session)) return
  // Clear another account's visible data synchronously, even if GET fails.
  prepareStudyData(session)

  const sessionKey = getSessionKey(session)
  if (initializedSessionKey === sessionKey && !isDirty()) return

  const existingPromise = initializationPromises.get(sessionKey)
  if (existingPromise) return existingPromise

  const initializationPromise = (async () => {
    const revision = localRevision
    const remote = await getStudyData(session.accessToken)
    if (!isActiveSession(session)) return

    if (isDirty() || !remote.initialized) {
      // The local copy is already current. Do not replace edits made while
      // this upload was in flight with its older response.
      await uploadStudyData(session)
    } else if (revision === localRevision) {
      saveLocalData(remote, session)
    }
    if (isActiveSession(session)) initializedSessionKey = sessionKey
  })()

  initializationPromises.set(sessionKey, initializationPromise)

  try {
    await initializationPromise
  } finally {
    if (initializationPromises.get(sessionKey) === initializationPromise) {
      initializationPromises.delete(sessionKey)
    }
  }
}

export function scheduleStudyDataSync() {
  const session = getSession()
  if (!session || !hasLocalOwner(session.id)) return

  uni.setStorageSync(DIRTY_KEY, '1')
  localRevision++
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    uploadStudyData(session).catch(() => {
      // Keep the local data marked dirty and retry it on the next app launch.
      if (isActiveSession(session)) uni.setStorageSync(DIRTY_KEY, '1')
    })
  }, 1200)
}

export function flushStudyDataSync() {
  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }
  const session = getSession()
  if (!session || !hasLocalOwner(session.id) || !isDirty()) return Promise.resolve()
  return uploadStudyData(session).catch(() => {
    if (isActiveSession(session)) uni.setStorageSync(DIRTY_KEY, '1')
  })
}
