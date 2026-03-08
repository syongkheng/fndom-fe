<script lang="ts" setup>
import { useNav } from '@/hooks/useNav'
import { useAuthenticationStore } from '@/stores/authentication'
import { useLayoutStateStore } from '@/stores/layoutState'
import { Message, Lock, User } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

const stepTitles = {
  email: 'Login / Register',
  register: 'Create account',
  login: 'Welcome back',
  verify: 'Verify your email',
}

const layoutStore = useLayoutStateStore()
const authStore = useAuthenticationStore()
const navigate = useNav()

const { authenticationStep, form, loading, registerError } = storeToRefs(authStore)
const { handleAuthenticate, handleLogin, handleRegister, handleVerifyEmail, handleResendCode, resetForm } = authStore

const buttonText = computed(() => ({
  email: loading.value ? 'Checking...' : 'Continue',
  register: loading.value ? 'Creating account...' : 'Create account',
  login: loading.value ? 'Logging in...' : 'Log in',
  verify: loading.value ? 'Verifying...' : 'Verify',
}[authenticationStep.value]))

const termsMessage = computed(() => ({
  email: 'By continuing, you agree to our',
  register: 'By registering, you agree to our',
  login: 'By logging in, you agree to our',
  verify: null,
}[authenticationStep.value]))

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
  // store sets authenticationStep to 'verify' on success
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
  form.password = ''
  form.verifyCode = ''
  registerError.value = ''
}

const handleOnClose = () => {
  layoutStore.loginDialog.toggle()
  resetForm()
}
</script>

<template>
  <el-dialog
    v-model="layoutStore.loginDialog.isVisible"
    class="login-dialog"
    :show-close="false"
    style="width: 90%; max-width: 400px;"
    :before-close="handleOnClose"
  >
    <div class="login-dialog-content-container">
      <div class="login-title-container">
        <h3>{{ stepTitles[authenticationStep] }}</h3>
        <p v-if="authenticationStep === 'verify'" class="step-hint">
          A 6-digit code was sent to <strong>{{ form.email }}</strong>
        </p>
      </div>

      <el-form :model="form" @submit.prevent="handleSubmit" class="register-form">

        <!-- Step: email -->
        <el-form-item v-if="authenticationStep === 'email'" size="large">
          <el-input
            v-model="form.email"
            placeholder="Email address"
            type="email"
            :prefix-icon="Message"
            clearable
            autocomplete="email"
          />
        </el-form-item>

        <!-- Step: register — display name + password -->
        <template v-else-if="authenticationStep === 'register'">
          <el-form-item size="large">
            <el-input
              v-model="form.email"
              placeholder="Email address"
              type="email"
              :prefix-icon="Message"
              disabled
            />
          </el-form-item>
          <el-form-item size="large">
            <el-input
              v-model="form.username"
              placeholder="Display name"
              :prefix-icon="User"
              clearable
              autocomplete="username"
            />
          </el-form-item>
          <el-form-item size="large">
            <el-input
              v-model="form.password"
              placeholder="Password"
              :prefix-icon="Lock"
              type="password"
              show-password
              autocomplete="new-password"
            />
          </el-form-item>
        </template>

        <!-- Step: login — password only -->
        <template v-else-if="authenticationStep === 'login'">
          <el-form-item size="large">
            <el-input
              v-model="form.email"
              placeholder="Email address"
              type="email"
              :prefix-icon="Message"
              disabled
            />
          </el-form-item>
          <el-form-item size="large">
            <el-input
              v-model="form.password"
              placeholder="Password"
              :prefix-icon="Lock"
              type="password"
              show-password
              autocomplete="current-password"
            />
          </el-form-item>
        </template>

        <!-- Step: verify — 6-digit code -->
        <el-form-item v-else-if="authenticationStep === 'verify'" size="large">
          <el-input
            v-model="form.verifyCode"
            placeholder="000000"
            maxlength="6"
            style="letter-spacing: 0.3em; font-size: 1.2rem;"
            clearable
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <!-- Error message -->
        <p v-if="registerError" class="error-text">{{ registerError }}</p>

        <!-- Submit -->
        <el-form-item>
          <el-button
            type="primary"
            native-type="submit"
            class="submit-button"
            :loading="loading"
          >
            {{ buttonText }}
          </el-button>
        </el-form-item>

        <!-- Resend code (verify step) -->
        <div v-if="authenticationStep === 'verify'" class="resend-row">
          <span>Didn't receive it?</span>
          <el-button link type="primary" @click="handleResendCode">Resend code</el-button>
        </div>

        <!-- Back link (not on email step) -->
        <div v-if="authenticationStep !== 'email'" class="back-row">
          <el-button link @click="handleBack">← Use a different email</el-button>
        </div>

        <!-- Terms -->
        <template v-if="termsMessage">
          <el-divider />
          <p class="disclaimer terms-text">
            {{ termsMessage }}
            <span class="hyperlink">Terms and Conditions.</span>
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
