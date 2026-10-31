import { ref } from 'vue'
import { getArticleSections } from '@/api/search.js'

const TEMPLATES = {
  argumentative: {
    id: 'argumentative',
    name: '议论文',
    nameEn: 'Argumentative Essay',
    generate(topic, sections, sources) {
      let outline = `## I. Introduction\n### 1.1 Background of ${topic}\n### 1.2 Thesis Statement\n\n`
      // 从 Wikipedia 章节中提取关键主题作为论点
      const mainSections = sections.filter(s => s.level === 1).slice(0, 3)
      mainSections.forEach((s, i) => {
        outline += `## ${['II', 'III', 'IV'][i]}. ${s.title}\n`
        outline += `### ${i + 2}.1 Claim\n### ${i + 2}.2 Evidence\n### ${i + 2}.3 Analysis\n\n`
      })
      if (mainSections.length === 0) {
        outline += `## II. Main Argument\n### 2.1 Claim\n### 2.2 Evidence\n### 2.3 Analysis\n\n`
        outline += `## III. Supporting Argument\n### 3.1 Claim\n### 3.2 Evidence\n### 3.3 Analysis\n\n`
      }
      outline += `## ${mainSections.length > 0 ? ['V', 'VI', 'VII'][mainSections.length - 1] : 'IV'}. Counterargument & Rebuttal\n\n`
      outline += `## Conclusion\n`
      return outline
    }
  },
  research: {
    id: 'research',
    name: '研究报告',
    nameEn: 'Research Report',
    generate(topic, sections) {
      let outline = `## Abstract\n\n## I. Introduction\n### 1.1 Background of ${topic}\n### 1.2 Research Question\n\n`
      outline += `## II. Literature Review\n`
      const lit = sections.filter(s => s.level === 1).slice(0, 3)
      lit.forEach(s => { outline += `### - ${s.title}\n` })
      outline += `\n## III. Methodology\n\n`
      outline += `## IV. Findings\n`
      const findings = sections.filter(s => s.level === 1).slice(3, 6)
      findings.forEach((s, i) => { outline += `### 4.${i + 1} ${s.title}\n` })
      if (findings.length === 0) {
        outline += `### 4.1 Key Finding 1\n### 4.2 Key Finding 2\n### 4.3 Key Finding 3\n`
      }
      outline += `\n## V. Discussion\n\n## VI. Conclusion\n`
      return outline
    }
  },
  comparative: {
    id: 'comparative',
    name: '对比分析',
    nameEn: 'Comparative Analysis',
    generate(topic, sections) {
      let outline = `## I. Introduction\n### 1.1 Overview of ${topic}\n### 1.2 Purpose of Comparison\n\n`
      const parts = sections.filter(s => s.level === 1)
      if (parts.length >= 2) {
        outline += `## II. ${parts[0].title}\n### 2.1 Key Characteristics\n### 2.2 Strengths\n### 2.3 Limitations\n\n`
        outline += `## III. ${parts[1].title}\n### 3.1 Key Characteristics\n### 3.2 Strengths\n### 3.3 Limitations\n\n`
      } else {
        outline += `## II. Subject A Analysis\n### 2.1 Key Characteristics\n### 2.2 Strengths\n### 2.3 Limitations\n\n`
        outline += `## III. Subject B Analysis\n### 3.1 Key Characteristics\n### 3.2 Strengths\n### 3.3 Limitations\n\n`
      }
      outline += `## IV. Comparative Discussion\n### 4.1 Similarities\n### 4.2 Differences\n### 4.3 Implications\n\n`
      outline += `## V. Conclusion\n`
      return outline
    }
  },
  presentation: {
    id: 'presentation',
    name: '演示稿',
    nameEn: 'Presentation',
    generate(topic, sections) {
      let outline = `## Slide 1: ${topic}\n\n## Slide 2: Background\n\n`
      const points = sections.filter(s => s.level === 1).slice(0, 4)
      points.forEach((s, i) => {
        outline += `## Slide ${i + 3}: ${s.title}\n### Key points\n\n`
      })
      if (points.length === 0) {
        outline += `## Slide 3: Key Point 1\n### Supporting Detail\n\n`
        outline += `## Slide 4: Key Point 2\n### Supporting Detail\n\n`
        outline += `## Slide 5: Key Point 3\n### Supporting Detail\n\n`
      }
      outline += `## Slide ${points.length + 3}: Evidence & Data\n\n`
      outline += `## Slide ${points.length + 4}: Conclusion\n\n`
      outline += `## Slide ${points.length + 5}: Q&A\n`
      return outline
    }
  }
}

export function useOutline() {
  const template = ref('argumentative')
  const outline = ref('')
  const status = ref('idle') // idle | generating | done | error
  const errorMessage = ref('')

  async function generate(summary, sources, requirement = '') {
    outline.value = ''
    errorMessage.value = ''
    status.value = 'generating'

    try {
      const tmpl = TEMPLATES[template.value] || TEMPLATES.argumentative

      // 获取第一篇文章的章节结构来辅助生成提纲
      let sections = []
      if (sources.length > 0) {
        try {
          sections = await getArticleSections(sources[0].title)
        } catch {
          sections = []
        }
      }

      const topic = sources.length > 0 ? sources[0].title : 'Topic'
      outline.value = tmpl.generate(topic, sections, sources)

      // 如果有自定义要求，在提纲开头添加要求说明
      if (requirement.trim()) {
        outline.value = `## Writing Requirements\n${requirement.trim()}\n\n${outline.value}`
      }

      // 附加参考网站
      const refs = sources
        .map((s, i) => `[${i + 1}] ${s.title} - ${s.url}`)
        .join('\n')
      outline.value += `\n\n## References\n${refs}`

      status.value = 'done'
    } catch (err) {
      errorMessage.value = err.message || '生成提纲失败'
      status.value = 'error'
    }
  }

  return {
    template,
    outline,
    status,
    errorMessage,
    templates: Object.values(TEMPLATES).map(t => ({ id: t.id, name: t.name, nameEn: t.nameEn })),
    generate
  }
}
