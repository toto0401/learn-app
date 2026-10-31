import { request, uploadFile } from '@/api/request.js'

export function sendSms(phone, scene) {
  return request({
    url: '/auth/send-sms',
    method: 'POST',
    data: { phone, scene }
  })
}

export function registerWithSms(data) {
  return request({
    url: '/auth/register',
    method: 'POST',
    data
  })
}

export function loginBySms(phone, code) {
  return request({
    url: '/auth/login-by-sms',
    method: 'POST',
    data: { phone, sms_code: code }
  })
}

export function resetPasswordBySms(phone, code, newPassword) {
  return request({
    url: '/auth/forgot-password',
    method: 'POST',
    data: {
      phone,
      sms_code: code,
      new_password: newPassword
    }
  })
}

export function uploadAvatar(filePath, token) {
  return uploadFile({
    url: '/auth/me/avatar',
    filePath,
    name: 'avatar',
    token
  })
}

export function deleteAvatar(token) {
  return request({
    url: '/auth/me/avatar',
    method: 'DELETE',
    token
  })
}

export function updateNickname(nickname, token) {
  return request({
    url: '/auth/me/nickname',
    method: 'PUT',
    data: { nickname },
    token
  })
}
