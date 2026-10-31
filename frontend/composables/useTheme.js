import { ref } from 'vue'

const THEME_KEY = 'theme_dark'
const isDark = ref(false)

/**
 * 深色模式 composable
 */
export function useTheme() {
  // 初始化：读取持久化的偏好
  function init() {
    try {
      isDark.value = uni.getStorageSync(THEME_KEY) === 'true'
    } catch {
      isDark.value = false
    }
    applyTheme()
  }

  function toggle() {
    isDark.value = !isDark.value
    try {
      uni.setStorageSync(THEME_KEY, String(isDark.value))
    } catch {
      // 存储失败忽略
    }
    applyTheme()
  }

  function applyTheme() {
    // #ifdef H5
    const el = document.documentElement
    if (isDark.value) {
      el.classList.add('dark')
    } else {
      el.classList.remove('dark')
    }
    // #endif

    // 设置导航栏颜色
    uni.setNavigationBarColor({
      frontColor: isDark.value ? '#ffffff' : '#000000',
      backgroundColor: isDark.value ? '#121826' : '#F6F7FC',
      animation: { duration: 300, timingFunc: 'easeIn' }
    })

    uni.setTabBarStyle({
      color: isDark.value ? '#AAB5CB' : '#7A849A',
      selectedColor: isDark.value ? '#6F8CFF' : '#3157D5',
      backgroundColor: isDark.value ? '#121826' : '#FFFFFF',
      borderStyle: 'black',
      animation: { duration: 300, timingFunc: 'easeIn' }
    })
  }

  init()

  return { isDark, toggle }
}
