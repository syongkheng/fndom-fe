<script lang="ts" setup>
import { useNav } from '@/hooks/useNav'
import { useAuthenticationStore } from '@/stores/authentication'
import { useLayoutStateStore } from '@/stores/layoutState'
import { Message, Lock, User } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { computed, ref, nextTick, watch } from 'vue'
import OtpInput from '@/components/common/OtpInput.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const layoutStore = useLayoutStateStore()
const authStore = useAuthenticationStore()
const navigate = useNav()

const { authenticationStep, form, loading, registerError } = storeToRefs(authStore)
const {
  handleAuthenticate,
  handleLogin,
  handleRegister,
  handleVerifyEmail,
  handleResendCode,
  resetForm
} = authStore

// ── Computed UI text ──────────────────────────────────────────────────────────
const stepTitle = computed(() =>
  t(`auth.stepTitles.${authenticationStep.value}`)
)

const buttonText = computed(() => {
  const map = {
    email: loading.value ? 'checking' : 'continue',
    register: loading.value ? 'creating' : 'create',
    login: loading.value ? 'loggingIn' : 'login',
    verify: loading.value ? 'verifying' : 'verify',
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
    email: _handleAuthenticate,
    register: _handleRegister,
    login: _handleLogin,
    verify: _handleVerify,
  }
  actions[authenticationStep.value]()
}

const handleBack = () => {
  authenticationStep.value = 'email'
  form.value.password = ''
  form.value.verifyCode = ''
  registerError.value = ''
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
  <el-dialog v-model="layoutStore.loginDialog.isVisible" :show-close="false" class="login-dialog"
    style="width: 90%; max-width: 400px;" :before-close="handleOnClose">
    <div class="login-dialog-content-container">

      <!-- Title -->
      <div class="login-title-container">
        <h3>{{ stepTitle }}</h3>

        <p v-if="authenticationStep === 'verify'" class="step-hint">
          {{ t('auth.verify.hint') }}
          <strong>{{ form.email }}</strong>
        </p>
      </div>

      <el-form @submit.prevent="handleSubmit">

        <!-- EMAIL -->
        <el-form-item v-if="authenticationStep === 'email'">
          <el-input v-model="form.email" :placeholder="t('auth.email.placeholder')" :prefix-icon="Message" clearable />
        </el-form-item>

        <!-- REGISTER -->
        <template v-else-if="authenticationStep === 'register'">
          <el-form-item>
            <el-input v-model="form.email" disabled />
          </el-form-item>

          <el-form-item>
            <el-input v-model="form.username" :placeholder="t('auth.username.placeholder')" :prefix-icon="User" />
          </el-form-item>

          <el-form-item>
            <el-input v-model="form.password" :placeholder="t('auth.password.placeholder')" :prefix-icon="Lock"
              type="password" show-password />
          </el-form-item>
        </template>

        <!-- LOGIN -->
        <template v-else-if="authenticationStep === 'login'">
          <el-form-item>
            <el-input v-model="form.email" disabled />
          </el-form-item>

          <el-form-item>
            <el-input v-model="form.password" :placeholder="t('auth.password.placeholder')" :prefix-icon="Lock"
              type="password" show-password />
          </el-form-item>
        </template>

        <!-- VERIFY -->
        <OtpInput v-else ref="otpRef" v-model="verifyDigits" @update:model-value="onOtpUpdate"
          @complete="handleSubmit" />

        <!-- Error -->
        <p v-if="registerError" class="error-text">
          {{ registerError }}
        </p>

        <!-- Submit -->
        <el-button type="primary" native-type="submit" class="submit-button" :loading="loading">
          {{ buttonText }}
        </el-button>

        <!-- Resend -->
        <div v-if="authenticationStep === 'verify'" class="resend-row">
          <span>{{ t('auth.verify.resend') }}</span>
          <el-button link @click="handleResendCode">
            {{ t('auth.verify.resendAction') }}
          </el-button>
        </div>

        <!-- Back -->
        <div v-if="authenticationStep !== 'email'" class="back-row">
          <el-button link @click="handleBack">
            {{ t('auth.back.useDifferentEmail') }}
          </el-button>
        </div>

        <!-- Terms -->
        <template v-if="termsMessage">
          <el-divider />
          <p class="disclaimer">
            {{ termsMessage }}
            <span class="hyperlink">
              {{ t('auth.terms.suffix') }}
            </span>
          </p>
        </template>

      </el-form>
    </div>
  </el-dialog>
</template>

<style lang="css" scoped>
.login-dialog :deep(.el-dialog__header) {
  display: none;
}

.login-dialog :deep(.el-dialog) {
  border-radius: 0.75rem;
  max-width: 400px;
  width: 90%;
}

.login-dialog-content-container {
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-title-container {
  text-align: center;
  margin-bottom: 0.5rem;
}

.login-title-container h3 {
  color: var(--color-heading);
  font-size: 1.5rem;
  margin: 0 0 4px;
}

.step-hint {
  font-size: 0.82rem;
  color: var(--color-text);
  opacity: 0.7;
  margin: 4px 0 0;
}

.submit-button {
  width: 100%;
  margin-top: 0.5rem;
}

.error-text {
  color: var(--el-color-danger);
  font-size: 0.82rem;
  margin: -6px 0 4px;
}

.resend-row,
.back-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 0.82rem;
  color: var(--color-text);
  margin-top: -4px;
}

.disclaimer {
  color: var(--color-text);
  opacity: 0.6;
  font-size: 0.82rem;
  line-height: 1.4;
}

.hyperlink {
  color: var(--el-color-primary);
  cursor: pointer;
}


@media (max-width: 600px) {
  .login-dialog :deep(.el-dialog) {
    width: 95%;
    margin: 0 1rem;
  }

  .login-dialog-content-container {
    padding: 0.75rem;
  }

  .login-title-container h3 {
    font-size: 1.25rem;
  }

  .submit-button {
    font-size: 0.95rem;
    padding: 0.75rem;
  }
}
</style>
