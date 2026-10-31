// Validate the entire backup before changing storage. Study limits match the API.
const LABELS = {
  planner_tasks: '学习任务', review_cards: '复习卡', profile_data: '个人资料',
  study_statistics: '学习时长', managed_sources: '收藏来源',
  reminder_settings: '提醒设置', translate_cache: '翻译缓存', translate_cache_v2: '翻译缓存'
}
const MEMORY_STATUSES = ['未复习', '未记住', '记得不牢', '已记住', '很熟悉']
const MAX_TIMESTAMP = 4102444800000
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)

export function validateBackupData(data, defaults) {
  if (!isObject(data) || !Object.keys(defaults).some(key => Object.prototype.hasOwnProperty.call(data, key))) {
    throw new Error('备份文件格式不正确')
  }
  const result = {}
  for (const key of Object.keys(defaults)) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue
    const value = data[key] === null ? JSON.parse(JSON.stringify(defaults[key])) : data[key]
    const check = valid => {
      if (!valid) throw new Error(`备份中的${LABELS[key]}格式不正确，原数据已保留`)
    }
    const string = (input, max, min = 0) => {
      check(typeof input === 'string' && input.trim().length >= min && input.length <= max)
      return input.trim()
    }
    const number = (input, min, max, integer = true) => {
      check(typeof input === 'number' && Number.isFinite(input) && input >= min && input <= max && (!integer || Number.isInteger(input)))
      return input
    }
    const boolean = input => { check(typeof input === 'boolean'); return input }
    const dates = input => {
      check(Array.isArray(input) && input.length <= 36600)
      input.forEach(day => {
        check(typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day))
        const date = new Date(`${day}T00:00:00Z`)
        check(Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day)
      })
      return [...new Set(input)].sort()
    }
    if (key === 'planner_tasks' || key === 'review_cards') {
      check(Array.isArray(value) && value.length <= (key === 'planner_tasks' ? 2000 : 5000))
      const ids = new Set()
      result[key] = value.map(item => {
        check(isObject(item))
        const id = string(item.id, 80, 1)
        check(/^[A-Za-z0-9_-]+$/.test(id) && !ids.has(id))
        ids.add(id)
        const subject = string(item.subject ?? '', 64)
        if (key === 'planner_tasks') {
          const weekKey = string(item.weekKey, 8, 8)
          check(/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(weekKey))
          return {
            id, subject, weekKey,
            description: string(item.description, 500, 1),
            duration: number(item.duration, 1, 1440),
            dayIndex: number(item.dayIndex, 0, 6),
            done: boolean(item.done ?? false),
            elapsed: number(item.elapsed ?? 0, 0, 86400)
          }
        }
        const memoryStatus = item.memoryStatus ?? '未复习'
        check(MEMORY_STATUSES.includes(memoryStatus))
        return {
          id, subject, memoryStatus,
          front: string(item.front, 500, 1), back: string(item.back, 2000, 1),
          createdAt: number(item.createdAt, 0, MAX_TIMESTAMP),
          nextReview: number(item.nextReview, 0, MAX_TIMESTAMP),
          interval: number(item.interval ?? 0, 0, 36500),
          ease: number(item.ease ?? 2.5, 1.3, 10, false),
          reviewCount: number(item.reviewCount ?? 0, 0, 100000)
        }
      })
    } else if (key === 'managed_sources') {
      check(Array.isArray(value))
      result[key] = value.map(item => {
        check(isObject(item))
        const title = string(item.title, 2000, 1)
        const url = string(item.url ?? '', 10000)
        const trust = item.trust ?? 'medium'
        check(['high', 'medium', 'low'].includes(trust))
        return {
          id: url || title, title, url, trust,
          content: string(item.content ?? '', 100000),
          source: string(item.source ?? '', 1000), note: string(item.note ?? '', 100000),
          savedAt: number(item.savedAt ?? Date.now(), 0, MAX_TIMESTAMP),
          updatedAt: number(item.updatedAt ?? Date.now(), 0, MAX_TIMESTAMP)
        }
      })
    } else {
      check(isObject(value))
      if (key === 'profile_data') {
        result[key] = {
          nickname: string(value.nickname ?? '学习者', 24, 1),
          avatarIndex: number(value.avatarIndex ?? 0, 0, 9),
          avatarImage: string(value.avatarImage ?? '', 10000000),
          checkinDays: dates(value.checkinDays ?? [])
        }
      } else if (key === 'study_statistics') {
        result[key] = { reviewSeconds: number(value.reviewSeconds ?? 0, 0, 315360000) }
      } else if (key === 'reminder_settings') {
        const settings = { ...defaults[key], ...value }
        result[key] = {}
        for (const field of ['enabled', 'remindStudy', 'remindReview']) result[key][field] = boolean(settings[field])
        for (const field of ['studyTime', 'reviewTime']) {
          check(typeof settings[field] === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(settings[field]))
          result[key][field] = settings[field]
        }
      } else {
        check(Object.values(value).every(item => typeof item === 'string'))
        result[key] = value
      }
    }
  }
  return result
}
