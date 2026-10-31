import { computed, ref } from 'vue'

const STORAGE_KEY = 'managed_sources'

const TRUST_LEVELS = [
  { key: 'high', label: '可信' },
  { key: 'medium', label: '待核对' },
  { key: 'low', label: '谨慎引用' }
]

const globalSources = ref([])
let loaded = false

function getSourceKey(source) {
  return source.url || source.title || ''
}

function normalizeSource(source) {
  return {
    id: getSourceKey(source),
    title: source.title || 'Untitled source',
    url: source.url || '',
    content: source.content || '',
    source: source.source || '',
    note: source.note || '',
    trust: source.trust || 'medium',
    savedAt: source.savedAt || Date.now(),
    updatedAt: Date.now()
  }
}

function loadSources() {
  if (loaded) return
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    globalSources.value = raw ? JSON.parse(raw) : []
  } catch {
    globalSources.value = []
  }
  loaded = true
}

function reloadSources() {
  loaded = false
  loadSources()
}

function saveSources() {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(globalSources.value))
  } catch {}
}

export function useSources() {
  loadSources()

  const savedSources = globalSources
  const sourceCount = computed(() => savedSources.value.length)

  function findSource(source) {
    const key = getSourceKey(source)
    return savedSources.value.find(item => item.id === key)
  }

  function isSaved(source) {
    return Boolean(findSource(source))
  }

  function addSource(source) {
    const existing = findSource(source)
    if (existing) return existing

    const managed = normalizeSource(source)
    savedSources.value.unshift(managed)
    saveSources()
    return managed
  }

  function removeSource(source) {
    const key = getSourceKey(source)
    savedSources.value = savedSources.value.filter(item => item.id !== key)
    saveSources()
  }

  function toggleSource(source) {
    if (isSaved(source)) {
      removeSource(source)
      return false
    }
    addSource(source)
    return true
  }

  function updateSource(source, patch) {
    const managed = addSource(source)
    Object.assign(managed, patch, { updatedAt: Date.now() })
    saveSources()
    return managed
  }

  function cycleTrust(source) {
    const managed = addSource(source)
    const currentIndex = TRUST_LEVELS.findIndex(item => item.key === managed.trust)
    const next = TRUST_LEVELS[(currentIndex + 1) % TRUST_LEVELS.length]
    managed.trust = next.key
    managed.updatedAt = Date.now()
    saveSources()
    return managed.trust
  }

  function trustLabel(trust) {
    return TRUST_LEVELS.find(item => item.key === trust)?.label || '待核对'
  }

  function clearSources() {
    savedSources.value = []
    saveSources()
  }

  return {
    savedSources,
    sourceCount,
    TRUST_LEVELS,
    addSource,
    findSource,
    isSaved,
    removeSource,
    toggleSource,
    updateSource,
    cycleTrust,
    trustLabel,
    loadSources,
    reloadSources,
    clearSources
  }
}
