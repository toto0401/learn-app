import { computed, ref } from 'vue'
import { request, resolveApiUrl } from '@/api/request.js'
import { initializeStudyData, prepareStudyData, flushStudyDataSync } from '@/composables/useStudySync.js'
import { startReminderScheduler, stopReminderScheduler } from '@/composables/useReminders.js'
import { activateProfileForUser } from '@/composables/profileStorage.js'
import {
  deleteAvatar as deleteAvatarApi,
  loginBySms as loginBySmsApi,
  registerWithSms as registerWithSmsApi,
  resetPasswordBySms as resetPasswordBySmsApi,
  sendSms as sendSmsApi,
  updateNickname as updateNicknameApi,
  uploadAvatar as uploadAvatarApi
} from '@/api/auth.js'

const SESSION_KEY = 'auth_session'
const currentUser = ref(null)

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase()
}

function saveSession(response) {
  const session = {
    accessToken: response.access_token,
    tokenType: response.token_type,
    id: response.user.id,
    username: response.user.username,
    phone: response.user.phone,
    nickname: response.user.nickname,
    avatarUrl: resolveApiUrl(response.user.avatar_url),
    loginAt: Date.now()
  }
  return saveCurrentSession(session)
}

function saveCurrentSession(session) {
  if (currentUser.value && currentUser.value.id !== session.id) {
    uni.$emit('study-data-pausing')
    flushStudyDataSync()
  }
  uni.setStorageSync(SESSION_KEY, JSON.stringify(session))
  currentUser.value = session
  prepareStudyData(session)
  activateProfileForUser(session)
  startReminderScheduler()
  return session
}

function loadSession() {
  try {
    const raw = uni.getStorageSync(SESSION_KEY)
    const session = raw ? JSON.parse(raw) : null
    currentUser.value = session && session.accessToken ? session : null
  } catch {
    currentUser.value = null
  }
  return currentUser.value
}

function requireLogin() {
  const session = loadSession()
  if (session) {
    initializeStudyData(session).catch(() => {})
    return true
  }
  uni.reLaunch({ url: '/pages/auth/auth' })
  return false
}

function validateCredentials(username, password) {
  if (username.length < 3) {
    throw new Error('账号至少需要3个字符')
  }
  if (password.length < 6) {
    throw new Error('密码至少需要6位')
  }
}

function validatePhone(phone) {
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    throw new Error('请输入正确的11位手机号')
  }
}

function validateSmsCode(code) {
  if (!/^\d{6}$/.test(code)) {
    throw new Error('请输入6位数字验证码')
  }
}

export function useAuth() {
  async function sendSms(phone, scene) {
    const cleanPhone = String(phone || '').trim()
    validatePhone(cleanPhone)
    return sendSmsApi(cleanPhone, scene)
  }

  async function registerWithSms({ username, phone, smsCode, password, nickname, registrationMethod = 'password' }) {
    const cleanUsername = normalizeUsername(username)
    const cleanPhone = String(phone || '').trim()
    const cleanSmsCode = String(smsCode || '').trim()
    const cleanPassword = String(password || '')
    const cleanNickname = String(nickname || '').trim()
    if (!['password', 'sms'].includes(registrationMethod)) {
      throw new Error('不支持的注册方式')
    }
    if (registrationMethod === 'password') validateCredentials(cleanUsername, cleanPassword)
    else if (cleanUsername.length < 3) throw new Error('账号至少需要3个字符')
    validatePhone(cleanPhone)
    validateSmsCode(cleanSmsCode)

    const response = await registerWithSmsApi({
      username: cleanUsername,
      phone: cleanPhone,
      sms_code: cleanSmsCode,
      registration_method: registrationMethod,
      password: registrationMethod === 'password' ? cleanPassword : null,
      nickname: cleanNickname || cleanUsername
    })
    const session = saveSession(response)
    await initializeStudyData(session).catch(() => {})
    return session
  }

  async function login({ username, password }) {
    const cleanUsername = normalizeUsername(username)
    const cleanPassword = String(password || '')
    validateCredentials(cleanUsername, cleanPassword)

    const response = await request({
      url: '/auth/login',
      method: 'POST',
      data: { username: cleanUsername, password: cleanPassword }
    })
    const session = saveSession(response)
    await initializeStudyData(session).catch(() => {})
    return session
  }

  async function loginBySms(phone, code) {
    const cleanPhone = String(phone || '').trim()
    const cleanCode = String(code || '').trim()
    validatePhone(cleanPhone)
    validateSmsCode(cleanCode)
    const session = saveSession(await loginBySmsApi(cleanPhone, cleanCode))
    await initializeStudyData(session).catch(() => {})
    return session
  }

  async function resetPasswordBySms(phone, code, newPassword) {
    const cleanPhone = String(phone || '').trim()
    const cleanCode = String(code || '').trim()
    const cleanNewPassword = String(newPassword || '')
    if (cleanNewPassword.length < 6) throw new Error('密码至少需要6位')
    validatePhone(cleanPhone)
    validateSmsCode(cleanCode)
    return resetPasswordBySmsApi(cleanPhone, cleanCode, cleanNewPassword)
  }

  async function uploadAvatar(filePath) {
    const session = loadSession()
    if (!session) throw new Error('登录已失效，请重新登录')

    const user = await uploadAvatarApi(filePath, session.accessToken)
    const avatarUrl = resolveApiUrl(user.avatar_url)
    saveCurrentSession({ ...session, avatarUrl })
    return avatarUrl
  }

  async function deleteAvatar() {
    const session = loadSession()
    if (!session || !session.avatarUrl) return ''

    await deleteAvatarApi(session.accessToken)
    saveCurrentSession({ ...session, avatarUrl: '' })
    return ''
  }

  async function updateNickname(nickname) {
    const cleanNickname = String(nickname || '').trim()
    if (!cleanNickname) throw new Error('昵称不能为空')

    const session = loadSession()
    if (!session) throw new Error('登录已失效，请重新登录')

    const user = await updateNicknameApi(cleanNickname, session.accessToken)
    saveCurrentSession({ ...session, nickname: user.nickname })
    return user.nickname
  }

  function logout() {
    uni.$emit('study-data-pausing')
    flushStudyDataSync()
    stopReminderScheduler()
    uni.removeStorageSync(SESSION_KEY)
    currentUser.value = null
  }

  return {
    currentUser,
    isLoggedIn: computed(() => Boolean(currentUser.value)),
    loadSession,
    requireLogin,
    sendSms,
    registerWithSms,
    login,
    loginBySms,
    resetPasswordBySms,
    uploadAvatar,
    deleteAvatar,
    updateNickname,
    logout
  }
}
