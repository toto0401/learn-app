<template>
  <view class="page">
    <view class="auth-shell">
      <view class="brand-panel">
        <view class="brand-row">
          <view class="brand-mark">
            <text class="brand-letter">R</text>
          </view>
          <view class="brand-copy">
            <text class="brand-title">学习桌面</text>
            <text class="brand-subtitle">研究、规划、复习，在同一个学习节奏里完成。</text>
          </view>
        </view>
        <view class="signal-row">
          <view class="signal-item">
            <text class="signal-num">研究</text>
            <text class="signal-label">从问题开始</text>
          </view>
          <view class="signal-item">
            <text class="signal-num">规划</text>
            <text class="signal-label">安排每一步</text>
          </view>
          <view class="signal-item">
            <text class="signal-num">复习</text>
            <text class="signal-label">记住学过的</text>
          </view>
        </view>
      </view>

      <view class="form">
        <view class="form-head">
          <text class="form-title">{{ formTitle }}</text>
          <text class="form-subtitle">{{ formSubtitle }}</text>
        </view>

        <view class="mode-tabs">
          <view class="mode-tab" :class="{ active: mode === 'login' }" @tap="switchMode('login')">
            <text class="mode-text" :class="{ active: mode === 'login' }">登录</text>
          </view>
          <view class="mode-tab" :class="{ active: mode === 'register' }" @tap="switchMode('register')">
            <text class="mode-text" :class="{ active: mode === 'register' }">注册</text>
          </view>
        </view>

        <view v-if="mode === 'login'" class="mode-tabs login-method-tabs">
          <view class="mode-tab" :class="{ active: loginMethod === 'password' }" @tap="switchLoginMethod('password')">
            <text class="mode-text" :class="{ active: loginMethod === 'password' }">密码登录</text>
          </view>
          <view class="mode-tab" :class="{ active: loginMethod === 'sms' }" @tap="switchLoginMethod('sms')">
            <text class="mode-text" :class="{ active: loginMethod === 'sms' }">验证码登录</text>
          </view>
        </view>

        <view v-if="mode === 'register'" class="mode-tabs register-method-tabs">
          <view class="mode-tab" :class="{ active: registerMethod === 'password' }" @tap="switchRegisterMethod('password')">
            <text class="mode-text" :class="{ active: registerMethod === 'password' }">密码注册</text>
          </view>
          <view class="mode-tab" :class="{ active: registerMethod === 'sms' }" @tap="switchRegisterMethod('sms')">
            <text class="mode-text" :class="{ active: registerMethod === 'sms' }">验证码注册</text>
          </view>
        </view>

        <view v-if="mode === 'register'" class="field">
          <text class="field-label">昵称</text>
          <input
            class="field-input"
            v-model="nickname"
            placeholder="比如：学习者"
            placeholder-class="input-placeholder"
            maxlength="16"
          />
        </view>

        <view v-if="mode === 'register' || (mode === 'login' && loginMethod === 'password')" class="field">
          <text class="field-label">账号</text>
          <input
            class="field-input"
            v-model="username"
            placeholder="至少3个字符"
            placeholder-class="input-placeholder"
            maxlength="24"
          />
        </view>

        <view v-if="mode !== 'login' || loginMethod === 'sms'" class="field">
          <text class="field-label">手机号</text>
          <input
            class="field-input"
            v-model="phone"
            type="number"
            placeholder="请输入11位手机号"
            placeholder-class="input-placeholder"
            maxlength="11"
          />
        </view>

        <view v-if="mode !== 'login' || loginMethod === 'sms'" class="field">
          <text class="field-label">短信验证码</text>
          <view class="sms-row">
            <input
              class="field-input sms-input"
              v-model="smsCode"
              type="number"
              placeholder="6位数字验证码"
              placeholder-class="input-placeholder"
              maxlength="6"
            />
            <view class="sms-button" :class="{ disabled: !canSendSms }" @tap="onSendSms">
              <text class="sms-button-text">{{ smsButtonText }}</text>
            </view>
          </view>
        </view>

        <view v-if="mode === 'reset' || (mode === 'login' && loginMethod === 'password') || (mode === 'register' && registerMethod === 'password')" class="field">
          <text class="field-label">{{ mode === 'reset' ? '新密码' : '密码' }}</text>
          <input
            class="field-input"
            v-model="password"
            password
            placeholder="至少6位"
            placeholder-class="input-placeholder"
            maxlength="32"
            @confirm="onSubmit"
          />
        </view>

        <view v-if="mode === 'reset'" class="field">
          <text class="field-label">确认新密码</text>
          <input
            class="field-input"
            v-model="confirmPassword"
            password
            placeholder="再次输入新密码"
            placeholder-class="input-placeholder"
            maxlength="32"
            @confirm="onSubmit"
          />
        </view>

        <view class="submit-btn" :class="{ disabled: isSubmitting }" @tap="onSubmit">
          <text class="submit-text">{{ isSubmitting ? '请稍候...' : submitText }}</text>
        </view>

        <text v-if="mode === 'login'" class="forgot-tip" @tap="switchMode('reset')">忘记密码？重置密码</text>
        <text class="switch-tip" @tap="toggleMode">
          {{ switchTip }}
        </text>
      </view>
    </view>
  </view>
</template>

<script>
import { useAuth } from '@/composables/useAuth.js'

export default {
  setup() {
    return { ...useAuth() }
  },
  data() {
    return {
      mode: 'login',
      loginMethod: 'password',
      registerMethod: 'password',
      nickname: '',
      username: '',
      phone: '',
      smsCode: '',
      password: '',
      confirmPassword: '',
      isSubmitting: false,
      isSendingSms: false,
      smsCountdown: 0,
      smsTimer: null
    }
  },
  computed: {
    formTitle() {
      if (this.mode === 'register') return '创建账号'
      if (this.mode === 'reset') return '重置密码'
      return '登录账号'
    },
    formSubtitle() {
      if (this.mode === 'register') return this.registerMethod === 'sms'
        ? '验证手机号后即可使用验证码登录'
        : '验证手机号并设置登录密码'
      if (this.mode === 'reset') return '使用账号设置新的登录密码'
      return this.loginMethod === 'sms' ? '使用手机号和验证码登录' : '使用账号和密码登录'
    },
    submitText() {
      if (this.mode === 'register') return this.registerMethod === 'sms' ? '验证码注册并登录' : '注册并登录'
      if (this.mode === 'reset') return '确认重置'
      return this.loginMethod === 'sms' ? '验证码登录' : '密码登录'
    },
    switchTip() {
      if (this.mode === 'register') return '已有账号？去登录'
      if (this.mode === 'reset') return '想起密码了？去登录'
      return '还没有账号？去注册'
    },
    canSendSms() {
      return !this.isSendingSms && this.smsCountdown === 0
    },
    smsButtonText() {
      if (this.isSendingSms) return '发送中...'
      if (this.smsCountdown > 0) return `${this.smsCountdown}s 后重发`
      return '获取验证码'
    }
  },
  onShow() {
    if (this.loadSession()) {
      uni.reLaunch({ url: '/pages/home/home' })
    }
  },
  onUnload() {
    this.clearSmsCountdown()
  },
  methods: {
    switchMode(mode) {
      this.mode = mode
      this.loginMethod = 'password'
      this.registerMethod = 'password'
      this.username = ''
      this.phone = ''
      this.smsCode = ''
      this.password = ''
      this.confirmPassword = ''
      this.clearSmsCountdown()
    },
    switchLoginMethod(method) {
      if (this.loginMethod === method) return
      this.loginMethod = method
      this.username = ''
      this.phone = ''
      this.smsCode = ''
      this.password = ''
      this.clearSmsCountdown()
    },
    startRegistrationFromLogin() {
      const username = this.loginMethod === 'password' ? this.username.trim() : ''
      const phone = this.loginMethod === 'sms' ? this.phone.trim() : ''
      this.mode = 'register'
      this.registerMethod = this.loginMethod === 'sms' ? 'sms' : 'password'
      this.username = username
      this.phone = phone
      this.smsCode = ''
      this.password = ''
      this.confirmPassword = ''
      this.clearSmsCountdown()
      uni.showToast({ title: '账号未注册，请完成注册', icon: 'none' })
    },
    switchRegisterMethod(method) {
      if (this.registerMethod === method) return
      this.registerMethod = method
      this.password = ''
    },
    toggleMode() {
      this.switchMode(this.mode === 'login' ? 'register' : 'login')
    },
    syncProfileNickname(session) {
      if (!session || !session.nickname) return
      try {
        const ownerId = String(uni.getStorageSync('profile_data_owner_id') || '')
        const raw = ownerId === String(session.id) ? uni.getStorageSync('profile_data') : ''
        const profile = raw ? JSON.parse(raw) : {}
        uni.setStorageSync('profile_data', JSON.stringify({
          ...profile,
          nickname: session.nickname
        }))
        uni.setStorageSync('profile_data_owner_id', String(session.id))
      } catch {}
    },
    clearSmsCountdown() {
      if (this.smsTimer) clearInterval(this.smsTimer)
      this.smsTimer = null
      this.smsCountdown = 0
    },
    startSmsCountdown() {
      this.clearSmsCountdown()
      this.smsCountdown = 60
      this.smsTimer = setInterval(() => {
        this.smsCountdown -= 1
        if (this.smsCountdown <= 0) this.clearSmsCountdown()
      }, 1000)
    },
    async onSendSms() {
      if (!this.canSendSms) return
      this.isSendingSms = true
      try {
        const scene = this.mode === 'register'
          ? 'register'
          : this.mode === 'reset'
            ? 'reset_password'
            : 'login'
        const result = await this.sendSms(this.phone, scene)
        this.startSmsCountdown()
        uni.showToast({ title: result.message || '验证码已发送', icon: 'success' })
      } catch (err) {
        if (this.mode === 'login' && err.statusCode === 404) {
          this.startRegistrationFromLogin()
          return
        }
        uni.showToast({ title: err.message || '验证码发送失败', icon: 'none' })
      } finally {
        this.isSendingSms = false
      }
    },
    async onSubmit() {
      if (this.isSubmitting) return
      this.isSubmitting = true
      try {
        if (this.mode === 'reset') {
          if (this.password !== this.confirmPassword) throw new Error('两次输入的密码不一致')
          const result = await this.resetPasswordBySms(this.phone, this.smsCode, this.password)
          uni.showToast({ title: result.message || '密码已重置', icon: 'success' })
          this.switchMode('login')
          return
        }

        const session = this.mode === 'login'
          ? this.loginMethod === 'sms'
            ? await this.loginBySms(this.phone, this.smsCode)
            : await this.login({ username: this.username, password: this.password })
          : await this.registerWithSms({
              username: this.username,
              phone: this.phone,
              smsCode: this.smsCode,
              password: this.password,
              nickname: this.nickname,
              registrationMethod: this.registerMethod
            })

        this.syncProfileNickname(session)
        uni.showToast({
          title: this.mode === 'login' ? '登录成功' : '注册成功',
          icon: 'success'
        })
        uni.reLaunch({ url: '/pages/home/home' })
      } catch (err) {
        if (this.mode === 'login' && err.statusCode === 404) {
          this.startRegistrationFromLogin()
          return
        }
        uni.showToast({
          title: err.message || '操作失败',
          icon: 'none'
        })
      } finally {
        this.isSubmitting = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background: #F6F7FC;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(env(safe-area-inset-top) + 48rpx) 32rpx calc(env(safe-area-inset-bottom) + 48rpx);
  box-sizing: border-box;
}
.page::before,
.page::after {
  content: '';
  position: fixed;
  z-index: 0;
  border-radius: 50%;
  pointer-events: none;
}
.page::before {
  width: 420rpx;
  height: 420rpx;
  top: -230rpx;
  right: -155rpx;
  border: 1rpx solid rgba(49, 87, 213, 0.16);
  box-shadow: 0 0 0 54rpx rgba(49, 87, 213, 0.035), 0 0 0 108rpx rgba(49, 87, 213, 0.025);
}
.page::after {
  width: 250rpx;
  height: 250rpx;
  bottom: -150rpx;
  left: -105rpx;
  background: rgba(49, 87, 213, 0.055);
}
.auth-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 620rpx;
}
.brand-panel {
  padding: 32rpx;
  margin-bottom: 20rpx;
  background: linear-gradient(135deg, #FFFFFF, #F5F7FF);
  border: 1rpx solid rgba(32, 48, 83, 0.1);
  border-radius: 28rpx;
  box-shadow: 0 18rpx 42rpx rgba(34, 52, 91, 0.08);
}
.brand-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.brand-mark {
  width: 92rpx;
  height: 92rpx;
  border-radius: 28rpx;
  background: #3157D5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.brand-letter {
  color: #FFFFFF;
  font-size: 44rpx;
  font-weight: 800;
}
.brand-copy {
  flex: 1;
  min-width: 0;
}
.brand-title {
  display: block;
  font-size: 44rpx;
  line-height: 1.2;
  font-weight: 700;
  color: #172033;
}
.brand-subtitle {
  display: block;
  font-size: 24rpx;
  line-height: 1.45;
  color: #69758C;
  margin-top: 10rpx;
}
.signal-row {
  display: flex;
  gap: 12rpx;
  margin-top: 30rpx;
}
.signal-item {
  flex: 1;
  padding: 16rpx 14rpx;
  background: rgba(49, 87, 213, 0.06);
  border-radius: 16rpx;
}
.signal-num {
  display: block;
  font-size: 23rpx;
  font-weight: 700;
  color: #3157D5;
  margin-bottom: 6rpx;
}
.signal-label {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: #69758C;
}
.form {
  background: #FFFFFF;
  border: 1rpx solid rgba(32, 48, 83, 0.1);
  border-radius: 28rpx;
  padding: 32rpx;
  box-shadow: 0 18rpx 42rpx rgba(34, 52, 91, 0.08);
}
.form-head {
  margin-bottom: 24rpx;
}
.form-title {
  display: block;
  font-size: 34rpx;
  line-height: 1.25;
  font-weight: 700;
  color: #172033;
}
.form-subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #69758C;
}
.mode-tabs {
  display: flex;
  padding: 6rpx;
  background: #EEF1FA;
  border-radius: 18rpx;
  margin-bottom: 24rpx;
}
.login-method-tabs {
  margin-top: -8rpx;
}
.register-method-tabs {
  margin-top: -8rpx;
}
.mode-tab {
  flex: 1;
  height: 72rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mode-tab.active {
  background: #FFFFFF;
}
.mode-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #69758C;
}
.mode-text.active {
  color: #3157D5;
}
.field {
  margin-bottom: 24rpx;
}
.field-label {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: #172033;
  margin-bottom: 10rpx;
}
.field-input {
  box-sizing: border-box;
  width: 100%;
  height: 88rpx;
  padding: 0 22rpx;
  background: #F6F7FC;
  border: 1rpx solid rgba(32, 48, 83, 0.12);
  border-radius: 16rpx;
  color: #172033;
  font-size: 28rpx;
}
.input-placeholder {
  color: #8D99AE;
}
.sms-row {
  display: flex;
  gap: 16rpx;
}
.sms-input {
  flex: 1;
  min-width: 0;
}
.sms-button {
  width: 190rpx;
  height: 88rpx;
  padding: 0 12rpx;
  border-radius: 16rpx;
  background: #E9EEFF;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sms-button.disabled {
  opacity: 0.58;
}
.sms-button-text {
  font-size: 23rpx;
  font-weight: 600;
  color: #3157D5;
  text-align: center;
}
.submit-btn {
  height: 92rpx;
  background: #3157D5;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8rpx;
}
.submit-btn:active {
  opacity: 0.92;
  transform: scale(0.98);
}
.submit-btn.disabled {
  opacity: 0.65;
}
.submit-text {
  color: #FFFFFF;
  font-size: 30rpx;
  font-weight: 700;
}
.switch-tip {
  display: block;
  text-align: center;
  color: #3157D5;
  font-size: 26rpx;
  margin-top: 28rpx;
}
.forgot-tip {
  display: block;
  text-align: center;
  color: #69758C;
  font-size: 24rpx;
  margin-top: 24rpx;
}
</style>
