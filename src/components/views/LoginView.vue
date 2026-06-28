<script lang="ts" setup>
import { useNav } from '@/hooks/useNav'
import { useAuthenticationStore } from '@/stores/authentication'
import { useLayoutStateStore } from '@/stores/layoutState'
import { Message, Lock, User } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { computed, ref, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import OtpInput from '@/components/common/OtpInput.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const layoutStore = useLayoutStateStore()
const authStore = useAuthenticationStore()
const navigate = useNav()

const { authenticationStep, form, loading, registerError, rules, registerRules } = storeToRefs(authStore)

const activeRules = computed(() =>
  authenticationStep.value === 'register' ? registerRules.value : rules.value
)

watch(form, () => { registerError.value = '' })
const {
  handleAuthenticate,
  handleLogin,
  handleRegister,
  handleVerifyEmail,
  handleResendCode,
  resetForm
} = authStore

// ── Step meta ────────────────────────────────────────────────────────────────
const stepTitle = computed(() => t(`auth.stepTitles.${authenticationStep.value}`))

const stepIndex = computed(() => {
  const map = { email: 0, register: 1, login: 1, verify: 2 }
  return map[authenticationStep.value]
})

const totalSteps = computed(() =>
  authenticationStep.value === 'login' ? 2 : 3
)

const buttonText = computed(() => {
  const map = {
    email:    loading.value ? 'checking'  : 'continue',
    register: loading.value ? 'creating'  : 'create',
    login:    loading.value ? 'loggingIn' : 'login',
    verify:   loading.value ? 'verifying' : 'verify',
  }
  return t(`auth.buttons.${map[authenticationStep.value]}`)
})

const termsMessage = computed(() => {
  if (authenticationStep.value === 'verify') return null
  return t(`auth.terms.${authenticationStep.value}`)
})

// ── Actions ───────────────────────────────────────────────────────────────────
const _handleAuthenticate = async () => {
  const exists = await handleAuthenticate()
  authenticationStep.value = exists ? 'login' : 'register'
}

const _handleLogin = async () => {
  const ok = await handleLogin()
  if (ok) {
    handleOnClose()
    if (authStore.redirectAfterLogin) navigate.redirectToDashboard()
  }
}

const _handleRegister = async () => {
  await handleRegister()
}

const _handleVerify = async () => {
  const ok = await handleVerifyEmail()
  if (ok) {
    handleOnClose()
    navigate.redirectToDashboard()
  }
}

const handleSubmit = () => {
  const actions = {
    email:    _handleAuthenticate,
    register: _handleRegister,
    login:    _handleLogin,
    verify:   _handleVerify,
  }
  actions[authenticationStep.value]()
}

const handleBack = () => {
  authenticationStep.value = 'email'
  form.value.password = ''
  form.value.verifyCode = ''
  registerError.value = ''
}

const handleForgotPassword = () => {
  ElMessage.info(t('auth.forgotPasswordMessage'))
}

// ── OTP ───────────────────────────────────────────────────────────────────────
const verifyDigits = ref<string[]>(['', '', '', '', '', ''])
const otpRef = ref<{ focus: () => void } | null>(null)

watch(authenticationStep, (step) => {
  if (step === 'verify') {
    verifyDigits.value = ['', '', '', '', '', '']
    nextTick(() => otpRef.value?.focus())
  }
})

watch(() => form.value.verifyCode, (val) => {
  if (!val) verifyDigits.value = ['', '', '', '', '', '']
})

const onOtpUpdate = (digits: string[]) => {
  verifyDigits.value = digits
  form.value.verifyCode = digits.join('')
}

const handleOnClose = () => {
  layoutStore.loginDialog.toggle()
  resetForm()
}
</script>

<template>
  <el-dialog
    v-model="layoutStore.loginDialog.isVisible"
    :show-close="false"
    class="login-dialog"
    style="width: 90%; max-width: 420px;"
    :before-close="handleOnClose"
  >
    <div class="dlg">

      <!-- Close button -->
      <button class="dlg-close" @click="handleOnClose" aria-label="Close">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
        </svg>
      </button>

      <!-- Brand header -->
      <div class="dlg-brand">
        <img src="/awense-logo.png" alt="Awense" width="32" class="dlg-logo" />
        <span class="dlg-brand-name">Awense</span>
      </div>

      <!-- Step progress -->
      <div class="step-track" aria-hidden="true">
        <div
          v-for="i in totalSteps"
          :key="i"
          class="step-segment"
          :class="{
            'step-segment--done':   i - 1 < stepIndex,
            'step-segment--active': i - 1 === stepIndex,
          }"
        />
      </div>

      <!-- Title + email context -->
      <div class="dlg-heading">
        <p class="dlg-eyebrow">{{ t(`auth.eyebrow.${authenticationStep}`) }}</p>
        <h3 class="dlg-title">{{ stepTitle }}</h3>

        <!-- Email chip shown on steps after email entry -->
        <button
          v-if="authenticationStep !== 'email'"
          class="email-chip"
          @click="handleBack"
          type="button"
        >
          {{ form.email }}
          <span class="email-chip-change">{{ t('auth.emailChipChange') }}</span>
        </button>

        <!-- Verify hint -->
        <p v-if="authenticationStep === 'verify'" class="verify-hint">
          {{ t('auth.verify.hint') }} <strong>{{ form.email }}</strong>
        </p>
      </div>

      <!-- Form -->
      <el-form :model="form" :rules="activeRules" @submit.prevent="handleSubmit" class="dlg-form">

        <!-- EMAIL -->
        <el-form-item v-if="authenticationStep === 'email'" prop="email">
          <el-input
            v-model="form.email"
            :placeholder="t('auth.email.placeholder')"
            :prefix-icon="Message"
            clearable
            size="large"
          />
        </el-form-item>

        <!-- REGISTER -->
        <template v-else-if="authenticationStep === 'register'">
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              :placeholder="t('auth.username.placeholder')"
              :prefix-icon="User"
              size="large"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              :placeholder="t('auth.password.placeholder')"
              :prefix-icon="Lock"
              type="password"
              show-password
              size="large"
            />
          </el-form-item>
          <p class="pw-req">{{ t('profile.password.requirement') }}</p>
        </template>

        <!-- LOGIN -->
        <template v-else-if="authenticationStep === 'login'">
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              :placeholder="t('auth.password.placeholder')"
              :prefix-icon="Lock"
              type="password"
              show-password
              size="large"
            />
          </el-form-item>
          <div class="forgot-row">
            <button type="button" class="forgot-link" @click="handleForgotPassword">
              {{ t('auth.forgotPassword') }}
            </button>
          </div>
        </template>

        <!-- VERIFY (OTP) -->
        <OtpInput
          v-else
          ref="otpRef"
          v-model="verifyDigits"
          @update:model-value="onOtpUpdate"
          @complete="handleSubmit"
        />

        <!-- Error -->
        <p v-if="registerError" class="error-text">{{ registerError }}</p>

        <!-- Submit -->
        <el-button
          type="primary"
          native-type="submit"
          class="submit-btn"
          size="large"
          :loading="loading"
        >
          {{ buttonText }}
        </el-button>

        <!-- Resend -->
        <div v-if="authenticationStep === 'verify'" class="resend-row">
          <span>{{ t('auth.verify.resend') }}</span>
          <el-button link @click="handleResendCode">
            {{ t('auth.verify.resendAction') }}
          </el-button>
        </div>

        <!-- Terms -->
        <p v-if="termsMessage" class="terms-text">
          {{ termsMessage }}
          <span class="terms-link">{{ t('auth.terms.suffix') }}</span>
        </p>

      </el-form>
    </div>
  </el-dialog>
</template>

<style lang="css" scoped>
/* ── Dialog shell ───────────────────────────────────────── */
.login-dialog :deep(.el-dialog__header) { display: none; }
.login-dialog :deep(.el-dialog__body)   { padding: 0; }
.login-dialog :deep(.el-dialog) {
  border-radius: 18px;
  overflow: hidden;
}

.dlg {
  padding: 28px 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
}

/* ── Close ──────────────────────────────────────────────── */
.dlg-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
  opacity: 0.35;
  transition: opacity 0.15s, background 0.15s;
}

.dlg-close:hover {
  opacity: 0.75;
  background: var(--color-background-mute);
}

/* ── Brand ──────────────────────────────────────────────── */
.dlg-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 22px;
}

.dlg-logo { display: block; }

.dlg-brand-name {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--color-heading);
  letter-spacing: -0.2px;
}

/* ── Step track ─────────────────────────────────────────── */
.step-track {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}

.step-segment {
  height: 3px;
  flex: 1;
  border-radius: 999px;
  background: var(--color-border);
  transition: background 0.25s;
}

.step-segment--done,
.step-segment--active {
  background: var(--el-color-primary);
}

.step-segment--active {
  opacity: 0.55;
}

/* ── Heading ────────────────────────────────────────────── */
.dlg-heading {
  margin-bottom: 20px;
}

.dlg-eyebrow {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--el-color-primary);
  margin-bottom: 6px;
}

.dlg-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--color-heading);
  margin: 0 0 10px;
}

/* Email chip — replaces the disabled input */
.email-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-background-mute);
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-text);
  cursor: pointer;
  transition: border-color 0.15s;
  margin-bottom: 4px;
}

.email-chip:hover {
  border-color: var(--el-color-primary);
}

.email-chip-change {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--el-color-primary);
  opacity: 0.8;
}

/* Verify hint */
.verify-hint {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.65;
  margin: 8px 0 0;
  line-height: 1.5;
}

/* ── Form ───────────────────────────────────────────────── */
.dlg-form {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dlg-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

/* Password requirement hint */
.pw-req {
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.4;
  margin: -6px 0 10px;
  line-height: 1.4;
}

/* Forgot password */
.forgot-row {
  display: flex;
  justify-content: flex-end;
  margin: -6px 0 10px;
}

.forgot-link {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--el-color-primary);
  opacity: 0.75;
  transition: opacity 0.15s;
}

.forgot-link:hover { opacity: 1; }

/* Error */
.error-text {
  color: var(--el-color-danger);
  font-size: 0.8rem;
  margin: -4px 0 8px;
}

/* Submit */
.submit-btn {
  width: 100%;
  margin-top: 4px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

/* Resend row */
.resend-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.7;
  margin-top: 10px;
}

/* Terms */
.terms-text {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.5;
  line-height: 1.5;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
}

.terms-link {
  color: var(--el-color-primary);
  opacity: 0.9;
  cursor: pointer;
}

/* ── Mobile ─────────────────────────────────────────────── */
@media (max-width: 480px) {
  .dlg { padding: 22px 20px 20px; }
  .dlg-title { font-size: 1.2rem; }
}
</style>
