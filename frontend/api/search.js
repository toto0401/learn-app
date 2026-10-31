/**
 * 搜索层 — 多源搜索（全部免费，无需 Key，支持跨域）
 * 来源：Wikipedia + DuckDuckGo + CrossRef（学术论文）
 * 中文输入自动翻译为英文，始终返回英文资料
 */

const REQUEST_TIMEOUT = 8000

function withFallbackTimeout(resolve, fallback) {
  let done = false
  const timer = setTimeout(() => finish(fallback), REQUEST_TIMEOUT)

  function finish(value) {
    if (done) return
    done = true
    clearTimeout(timer)
    resolve(value)
  }

  return finish
}

function withRejectTimeout(resolve, reject, message) {
  let done = false
  const timer = setTimeout(() => fail(new Error(message)), REQUEST_TIMEOUT)

  function finish(value) {
    if (done) return
    done = true
    clearTimeout(timer)
    resolve(value)
  }

  function fail(error) {
    if (done) return
    done = true
    clearTimeout(timer)
    reject(error)
  }

  return { finish, fail }
}

/**
 * 将中文翻译为英文（用于搜索）
 */
function translateToEnglish(text) {
  return new Promise((resolve) => {
    const finish = withFallbackTimeout(resolve, text)
    if (!/[\u4e00-\u9fff]/.test(text)) {
      finish(text)
      return
    }
    uni.request({
      url: 'https://api.mymemory.translated.net/get',
      method: 'GET',
      timeout: REQUEST_TIMEOUT,
      data: { q: text, langpair: 'zh|en' },
      success(res) {
        if (res.statusCode === 200 && res.data.responseData) {
          finish(res.data.responseData.translatedText || text)
        } else {
          finish(text)
        }
      },
      fail() { finish(text) }
    })
  })
}

/**
 * 多源搜索：Wikipedia + DuckDuckGo + CrossRef 并行
 * @param {string} query - 搜索关键词（中文或英文）
 * @returns {Promise<Array<{id, title, url, content, source}>>}
 */
export async function searchArticles(query) {
  const englishQuery = await translateToEnglish(query)

  const [wikiResults, ddgResults, crossrefResults] = await Promise.allSettled([
    searchWikipedia(englishQuery),
    searchDuckDuckGo(englishQuery),
    searchCrossRef(englishQuery)
  ])

  // 合并去重
  const all = []
  const seenUrls = new Set()

  const addResults = (result) => {
    if (result.status === 'fulfilled') {
      result.value.forEach(item => {
        if (!seenUrls.has(item.url) && item.content) {
          seenUrls.add(item.url)
          all.push(item)
        }
      })
    }
  }

  addResults(wikiResults)
  addResults(ddgResults)
  addResults(crossrefResults)

  // 编号
  return all.slice(0, 10).map((item, index) => ({
    ...item,
    id: index + 1
  }))
}

// ---------- Wikipedia ----------
function searchWikipedia(query) {
  return new Promise((resolve) => {
    const finish = withFallbackTimeout(resolve, [])
    uni.request({
      url: 'https://en.wikipedia.org/w/api.php',
      method: 'GET',
      timeout: REQUEST_TIMEOUT,
      data: {
        action: 'query',
        list: 'search',
        srsearch: query,
        srlimit: 5,
        srprop: 'snippet',
        format: 'json',
        origin: '*'
      },
      success(res) {
        if (res.statusCode === 200 && res.data.query) {
          finish(res.data.query.search.map(item => ({
            title: item.title,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
            content: stripHtml(item.snippet),
            source: 'Wikipedia'
          })))
        } else {
          finish([])
        }
      },
      fail() { finish([]) }
    })
  })
}

// ---------- DuckDuckGo Instant Answer ----------
function searchDuckDuckGo(query) {
  return new Promise((resolve) => {
    const finish = withFallbackTimeout(resolve, [])
    uni.request({
      url: 'https://api.duckduckgo.com/',
      method: 'GET',
      timeout: REQUEST_TIMEOUT,
      data: {
        q: query,
        format: 'json',
        no_redirect: 1,
        no_html: 1,
        skip_disambig: 1
      },
      success(res) {
        if (res.statusCode !== 200) { finish([]); return }
        const data = res.data
        const results = []

        // 主要摘要
        if (data.Abstract && data.AbstractURL) {
          results.push({
            title: data.Heading || query,
            url: data.AbstractURL,
            content: data.Abstract,
            source: data.AbstractSource || 'DuckDuckGo'
          })
        }

        // 相关主题
        if (data.RelatedTopics) {
          data.RelatedTopics.forEach(topic => {
            if (topic.Text && topic.FirstURL) {
              results.push({
                title: topic.Text.split(' - ')[0].substring(0, 80),
                url: topic.FirstURL,
                content: topic.Text,
                source: 'DuckDuckGo'
              })
            }
          })
        }

        finish(results.slice(0, 4))
      },
      fail() { finish([]) }
    })
  })
}

// ---------- CrossRef（学术论文检索）----------
function searchCrossRef(query) {
  return new Promise((resolve) => {
    const finish = withFallbackTimeout(resolve, [])
    uni.request({
      url: 'https://api.crossref.org/works',
      method: 'GET',
      timeout: REQUEST_TIMEOUT,
      data: {
        query: query,
        rows: 3,
        sort: 'relevance',
        select: 'title,URL,abstract,container-title'
      },
      success(res) {
        if (res.statusCode === 200 && res.data.message && res.data.message.items) {
          const results = res.data.message.items
            .filter(item => item.title && item.title.length > 0)
            .map(item => ({
              title: (item.title[0] || '').substring(0, 120),
              url: item.URL || '',
              content: item.abstract
                ? stripHtml(item.abstract).substring(0, 300)
                : `Published in: ${(item['container-title'] && item['container-title'][0]) || 'Academic Journal'}`,
              source: 'CrossRef'
            }))
          finish(results)
        } else {
          finish([])
        }
      },
      fail() { finish([]) }
    })
  })
}

/**
 * 获取 Wikipedia 文章的详细摘要
 */
export function getArticleSummary(title) {
  return new Promise((resolve, reject) => {
    const { finish, fail } = withRejectTimeout(resolve, reject, '获取文章详情超时')
    uni.request({
      url: `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      method: 'GET',
      timeout: REQUEST_TIMEOUT,
      success(res) {
        if (res.statusCode === 200) {
          finish({
            title: res.data.title,
            extract: res.data.extract || '',
            url: res.data.content_urls?.desktop?.page || ''
          })
        } else {
          fail(new Error('获取文章详情失败'))
        }
      },
      fail(err) { fail(new Error(`请求失败: ${err.errMsg}`)) }
    })
  })
}

/**
 * 获取 Wikipedia 文章的章节结构（用于生成提纲）
 */
export function getArticleSections(title) {
  return new Promise((resolve) => {
    const finish = withFallbackTimeout(resolve, [])
    uni.request({
      url: 'https://en.wikipedia.org/w/api.php',
      method: 'GET',
      timeout: REQUEST_TIMEOUT,
      data: {
        action: 'parse',
        page: title,
        prop: 'sections',
        format: 'json',
        origin: '*'
      },
      success(res) {
        if (res.statusCode === 200 && res.data.parse) {
          finish(res.data.parse.sections.map(s => ({
            level: parseInt(s.toclevel),
            title: s.line,
            anchor: s.anchor
          })))
        } else {
          finish([])
        }
      },
      fail() { finish([]) }
    })
  })
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}
