/**
 * 轻量 Markdown 解析器 — 只处理 ##/### 标题和普通段落
 * 将 Markdown 文本转换为结构化数组，供 OutlineView 渲染
 *
 * @param {string} markdown
 * @returns {Array<{type: 'h2'|'h3'|'paragraph'|'reference', text: string}>}
 */
export function parseMarkdown(markdown) {
  if (!markdown) return []

  const lines = markdown.split('\n')
  const result = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('### ')) {
      result.push({ type: 'h3', text: trimmed.slice(4) })
    } else if (trimmed.startsWith('## ')) {
      result.push({ type: 'h2', text: trimmed.slice(3) })
    } else if (trimmed.startsWith('[') && trimmed.includes('](')) {
      // Markdown 链接行 — 当作参考来源
      result.push({ type: 'reference', text: trimmed })
    } else {
      result.push({ type: 'paragraph', text: trimmed })
    }
  }

  return result
}
