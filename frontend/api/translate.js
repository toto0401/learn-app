import { request } from '@/api/request.js'

function getAccessToken() {
  try {
    const session = JSON.parse(uni.getStorageSync('auth_session') || '{}')
    return session.accessToken || ''
  } catch {
    return ''
  }
}

/**
 * 翻译英文为简体中文
 * @param {string} text - 要翻译的文本
 * @returns {Promise<string>} 中文翻译
 */
export function translateWord(text) {
  return request({
    url: '/translate',
    method: 'POST',
    data: { text: String(text || '').trim() },
    token: getAccessToken()
  }).then(response => response.translation)
}
