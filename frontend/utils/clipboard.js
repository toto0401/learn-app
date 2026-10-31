/**
 * 跨平台复制到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<void>}
 */
export function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(resolve).catch(() => {
        // fallback
        fallbackCopy(text) ? resolve() : reject(new Error('复制失败'))
      })
      return
    }
    fallbackCopy(text) ? resolve() : reject(new Error('复制失败'))
    // #endif

    // #ifndef H5
    uni.setClipboardData({
      data: text,
      success: () => resolve(),
      fail: (err) => reject(new Error(err.errMsg))
    })
    // #endif
  })
}

// H5 fallback
function fallbackCopy(text) {
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}
