import { ref } from 'vue'
import { searchArticles, getArticleSummary } from '@/api/search.js'
import { translateWord } from '@/api/translate.js'

/**
 * 研究流程编排 — 搜索 Wikipedia → 获取详细摘要 → 提取关键词
 * 全部使用免费公开 API，无需任何 Key
 */
export function useResearch() {
  const query = ref('')
  const subject = ref('')
  const status = ref('idle') // idle | searching | generating | done | error
  const summary = ref('')
  const sources = ref([])
  const vocabulary = ref([])
  const vocabularyLoading = ref(false)
  const vocabularyError = ref('')
  const errorMessage = ref('')

  function normalizeTranslation(value) {
    return String(value || '').trim()
  }

  function hasTranslation(value) {
    const translation = normalizeTranslation(value)
    return Boolean(translation && translation !== '-' && translation !== '翻译失败')
  }

  function normalizeVocabularyWord(word) {
    return String(word || '').trim().toLowerCase()
  }

  function findVocabularyIndex(word) {
    const target = normalizeVocabularyWord(word)
    if (!target) return -1
    return vocabulary.value.findIndex(item => normalizeVocabularyWord(item.en) === target)
  }

  function upsertVocabularyWord(word, zh = '', meta = {}) {
    const front = String(word || '').trim()
    if (!front) return null

    const nextItem = {
      en: front,
      zh: normalizeTranslation(zh),
      manual: Boolean(meta.manual),
      source: meta.source || (meta.manual ? 'manual' : 'auto'),
      addedAt: meta.addedAt || Date.now(),
      updatedAt: Date.now()
    }

    const idx = findVocabularyIndex(front)
    if (idx >= 0) {
      const current = vocabulary.value[idx]
      const merged = {
        ...current,
        ...nextItem,
        manual: Boolean(current.manual || nextItem.manual),
        zh: nextItem.zh || current.zh || '',
        source: current.source || nextItem.source,
        addedAt: current.addedAt || nextItem.addedAt
      }
      vocabulary.value.splice(idx, 1, merged)
      return merged
    }

    if (nextItem.manual) {
      vocabulary.value.unshift(nextItem)
    } else {
      vocabulary.value.push(nextItem)
    }
    return nextItem
  }

  function addVocabularyWord(word, zh = '') {
    if (!hasTranslation(zh)) return null
    return upsertVocabularyWord(word, zh, { manual: true, source: 'manual' })
  }

  function removeVocabularyWord(word) {
    const idx = findVocabularyIndex(word)
    if (idx < 0) return false
    vocabulary.value.splice(idx, 1)
    return true
  }

  function isVocabularySaved(word) {
    return findVocabularyIndex(word) >= 0
  }

  async function startResearch(searchText = '') {
    const activeQuery = String(typeof searchText === 'string' ? searchText : query.value || '').trim()
    if (!activeQuery) return
    query.value = activeQuery

    // 重置状态
    summary.value = ''
    sources.value = []
    vocabulary.value = []
    vocabularyLoading.value = false
    vocabularyError.value = ''
    errorMessage.value = ''
    status.value = 'searching'

    try {
      // 第一步：搜索 Wikipedia
      const searchQuery = subject.value
        ? `${subject.value} ${activeQuery}`
        : activeQuery
      const results = await searchArticles(searchQuery)
      sources.value = results

      if (results.length === 0) {
        errorMessage.value = '没有找到相关资料，请尝试换个关键词'
        status.value = 'error'
        return
      }

      // 第二步：获取前 3 篇文章的详细摘要
      status.value = 'generating'

      const topTitles = results.slice(0, 3).map(r => r.title)
      const summaries = await Promise.allSettled(
        topTitles.map(title => getArticleSummary(title))
      )

      // 合并摘要
      const paragraphs = []
      summaries.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.extract) {
          paragraphs.push(
            `${result.value.extract} [${index + 1}]`
          )
        }
      })

      if (paragraphs.length === 0) {
        // 如果详细摘要都失败了，用搜索结果的 snippet
        results.slice(0, 5).forEach((r) => {
          if (r.content) {
            paragraphs.push(`${r.content} [${r.id}]`)
          }
        })
      }

      summary.value = paragraphs.join('\n\n')

      // 第三步：提取关键词（从摘要中提取英文专业词汇）
      await extractVocabulary(summary.value)

      status.value = 'done'
    } catch (err) {
      errorMessage.value = err.message || '搜索失败，请检查网络'
      status.value = 'error'
    }
  }

  async function extractVocabulary(text) {
    // 提取看起来像专业术语的词（首字母大写、较长的词等）
    const words = text.match(/\b[A-Z][a-z]{3,}\b/g) || []
    // 去重 + 过滤常见词
    const commonWords = new Set([
      'This', 'That', 'They', 'There', 'Their', 'These', 'Those',
      'When', 'Where', 'Which', 'While', 'With', 'Were', 'What',
      'From', 'Have', 'Been', 'Also', 'After', 'Before', 'About',
      'Some', 'Most', 'Many', 'Such', 'Other', 'More', 'Over',
      'Into', 'Only', 'Under', 'Between', 'During', 'Several'
    ])
    const unique = [...new Set(words)].filter(w => !commonWords.has(w))
    const topWords = unique.slice(0, 15)

    topWords.forEach(word => {
      upsertVocabularyWord(word, '', { manual: false, source: 'auto' })
    })
    if (topWords.length === 0) return

    vocabularyLoading.value = true
    const translated = await Promise.all(topWords.map(async (word) => {
        try {
          const zh = await translateWord(word)
          if (!hasTranslation(zh)) return false
          upsertVocabularyWord(word, zh, { manual: false, source: 'auto' })
          return true
        } catch {
          return false
        }
      }))
    vocabularyLoading.value = false

    const failedCount = translated.filter(result => !result).length
    if (failedCount > 0) {
      vocabularyError.value = failedCount === topWords.length
        ? '关键词翻译失败，请检查后端服务后重新搜索。'
        : `${failedCount} 个关键词翻译失败，未保存到复习卡。`
    }
  }

  function abort() {
    status.value = 'idle'
  }

  return {
    query,
    subject,
    status,
    summary,
    sources,
    vocabulary,
    vocabularyLoading,
    vocabularyError,
    errorMessage,
    startResearch,
    abort,
    addVocabularyWord,
    removeVocabularyWord,
    isVocabularySaved
  }
}
