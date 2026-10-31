import { request } from '@/api/request.js'

export function getStudyData(token) {
  return request({ url: '/study-data', token })
}

export function saveStudyData(data, token) {
  return request({
    url: '/study-data',
    method: 'PUT',
    data,
    token
  })
}
