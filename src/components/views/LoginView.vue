<script lang="ts" setup>
import { useNav } from '@/hooks/useNav'
import { useAuthenticationStore } from '@/stores/authentication'
import { useLayoutStateStore } from '@/stores/layoutState'
import { User, Lock } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

const stepTitles = {
  username: 'Login / Register',
  register: 'Create new account',
  login: 'Login'
}

const layoutStore = useLayoutStateStore()
const authStore = useAuthenticationStore()
const navigate = useNav()

const { authenticationStep, form, loading } = storeToRefs(authStore)
const { handleAuthenticate, handleLogin, handleRegister, resetForm, rules } = authStore

const buttonText = computed(() => {
  return {
    username: loading.value ? 'Loading...' : 'Log in / Register',
    register: loading.value ? 'Registering...' : 'Register and log in',
    login: loading.value ? 'Authenticating...' : 'Log in'
  }[authenticationStep.value]
})

const termsMessage = computed(() => {
  return {
    username: 'By logging in / registering, you are deemed to have read and agreed to the following',
    register: 'By registering, you are deemed to have read and agreed to the following',
    login: 'By logging in, you are deemed to have read and agreed to the following'
  }[authenticationStep.value]
})

const _handleAuthenticate = async () => {
  const res = await handleAuthenticate()
  authenticationStep.value = res ? 'login' : 'register'
}

const _handleLogin = async () => {
  const isLoginSuccessful = await handleLogin()
  if (isLoginSuccessful) {
    handleOnClose()
    if (authStore.redirectAfterLogin) navigate.redirectToDashboard()
  }
}

const _handleRegister = async () => {
  const token = await handleRegister()
  if (token) {
    handleOnClose()
    navigate.redirectToDashboard()
  }
}

const handleSubmit = () => {
  const actions = {
    username: _handleAuthenticate,
    register: _handleRegister,
    login: _handleLogin
  }
  actions[authenticationStep.value]()
}

const handleOnClose = () => {
  layoutStore.loginDialog.toggle()
  resetForm()
  authenticationStep.value = 'username'
}
</script>

<template>
  <el-dialog v-model="layoutStore.loginDialog.isVisible" class="login-dialog" :show-close="false"
    style="width: 90%; max-width: 400px;" :before-close="handleOnClose">
    <div class="login-dialog-content-container">
      <div class="login-title-container">
        <h3>{{ stepTitles[authenticationStep] }}</h3>
      </div>

      <el-form :model="form" :rules="rules" @submit.prevent="handleSubmit" class="register-form" ref="formRef">
        <el-form-item v-if="authenticationStep === 'username'" prop="identity" size="large">
          <el-input v-model="form.identity" placeholder="Username" :prefix-icon="User" clearable
            autocomplete="username" />
        </el-form-item>

        <el-form-item v-else prop="password" size="large">
          <el-input v-model="form.password" placeholder="Password" :prefix-icon="Lock" type="password" show-password
            autocomplete="current-password" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" native-type="submit" class="submit-button" :loading="loading">
            {{ buttonText }}
          </el-button>
        </el-form-item>

        <el-divider />
        <p class="disclaimer">An account is needed to store your itinerary and share them with your friends!</p>
        <p class="disclaimer terms-text">
          {{ termsMessage }}
          <span class="hyperlink">Terms and Conditions.</span>
        </p>
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
  color: #2c3e50;
  font-size: 1.5rem;
  margin: 0;
}

.submit-button {
  width: 100%;
  margin-top: 1rem;
}

.disclaimer {
  color: #666;
  font-size: 0.85rem;
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

  .disclaimer {
    font-size: 0.8rem;
  }
}
</style>
