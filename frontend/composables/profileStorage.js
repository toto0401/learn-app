const STORAGE_KEY = 'profile_data'
const PROFILE_OWNER_KEY = 'profile_data_owner_id'
const PROFILE_ARCHIVE_KEY = 'profile_data_by_user'

function parseStorage(key, fallback) {
  try {
    const raw = uni.getStorageSync(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function normalizeProfile(profile = {}, fallbackNickname = '学习者') {
  return {
    nickname: String(profile.nickname || fallbackNickname).trim() || fallbackNickname,
    avatarIndex: Number.isInteger(profile.avatarIndex) ? profile.avatarIndex : 0,
    avatarImage: String(profile.avatarImage || ''),
    checkinDays: Array.isArray(profile.checkinDays) ? profile.checkinDays : []
  }
}

function readArchivedProfiles() {
  const profiles = parseStorage(PROFILE_ARCHIVE_KEY, {})
  return profiles && typeof profiles === 'object' ? profiles : {}
}

function writeArchivedProfiles(profiles) {
  uni.setStorageSync(PROFILE_ARCHIVE_KEY, JSON.stringify(profiles))
}

function writeActiveProfile(userId, profile) {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(profile))
  if (userId) uni.setStorageSync(PROFILE_OWNER_KEY, String(userId))
}

function archiveProfile(userId, profile) {
  if (!userId) return
  const profiles = readArchivedProfiles()
  profiles[String(userId)] = profile
  writeArchivedProfiles(profiles)
}

export function activateProfileForUser(user = {}) {
  const userId = String(user.id || '')
  const fallbackNickname = String(user.nickname || '学习者')
  const activeProfile = normalizeProfile(parseStorage(STORAGE_KEY, {}), fallbackNickname)
  const activeOwnerId = String(uni.getStorageSync(PROFILE_OWNER_KEY) || '')

  if (!userId) return activeProfile

  // Preserve the previous account's local-only avatar before showing this user.
  if (activeOwnerId && activeOwnerId !== userId) archiveProfile(activeOwnerId, activeProfile)

  const archived = readArchivedProfiles()[userId]
  const profile = activeOwnerId === userId
    ? activeProfile
    : normalizeProfile(archived, fallbackNickname)

  writeActiveProfile(userId, profile)
  archiveProfile(userId, profile)
  return profile
}

export function saveProfileForUser(user = {}, profile = {}) {
  const userId = String(user.id || '')
  const fallbackNickname = String(user.nickname || '学习者')
  const normalized = normalizeProfile(profile, fallbackNickname)
  writeActiveProfile(userId, normalized)
  archiveProfile(userId, normalized)
  return normalized
}

export function clearProfileForUser(user = {}) {
  const userId = String(user.id || '')
  const profiles = readArchivedProfiles()
  if (userId) delete profiles[userId]
  writeArchivedProfiles(profiles)
  if (String(uni.getStorageSync(PROFILE_OWNER_KEY) || '') === userId) {
    uni.removeStorageSync(STORAGE_KEY)
    uni.removeStorageSync(PROFILE_OWNER_KEY)
  }
}
