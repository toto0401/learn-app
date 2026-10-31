// Update this address if the development computer joins a different Wi-Fi network.
const NATIVE_API_HOST = '192.168.0.121'

function getApiBaseUrl() {
  // The H5 page works whether opened through localhost or the computer's LAN IP.
  // #ifdef H5
  const host = typeof window === 'undefined' ? NATIVE_API_HOST : window.location.hostname
  return `http://${host}:8000/api/v1`
  // #endif

  return `http://${NATIVE_API_HOST}:8000/api/v1`
}

const API_BASE_URL = getApiBaseUrl()
const API_ORIGIN_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '')

function getErrorMessage(response) {
  const detail = response && response.data && response.data.detail
  if (Array.isArray(detail)) {
    return detail[0] && detail[0].msg ? detail[0].msg : '请求参数不正确'
  }
  return typeof detail === 'string' ? detail : '请求失败，请稍后再试'
}

function parseResponseData(data) {
  if (typeof data !== 'string') return data
  try {
    return JSON.parse(data)
  } catch {
    return {}
  }
}

export function resolveApiUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${API_ORIGIN_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function request({ url, method = 'GET', data, token }) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      header: {
        'content-type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success: (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data)
          return
        }
        const error = new Error(getErrorMessage(response))
        error.statusCode = response.statusCode
        reject(error)
      },
      fail: () => reject(new Error('无法连接服务器，请检查后端是否已启动'))
    })
  })
}

export function uploadFile({ url, filePath, name, token }) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE_URL}${url}`,
      filePath,
      name,
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (response) => {
        const data = parseResponseData(response.data)
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(data)
          return
        }
        const error = new Error(getErrorMessage({ ...response, data }))
        error.statusCode = response.statusCode
        reject(error)
      },
      fail: () => reject(new Error('头像上传失败，请检查网络后重试'))
    })
  })
}

export { API_BASE_URL }
