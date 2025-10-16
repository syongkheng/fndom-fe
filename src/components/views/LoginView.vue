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

const buttonText = computed(() => {
  return {
    username: loading.value ? 'Loading...' : 'Log in / Register',
    register: loading.value ? 'Registering' : 'Register and log in',
    login: loading.value ? 'Authenticating' : 'Log in'
  }[authenticationStep.value]
})

const termsMessage = computed(() => {
  return {
    username: "By logging in / registering, you are deemed to have read and agreed to the following",
    register: "By registering, you are deemed to have read and agreed to the following ",
    login: "By logging in, you are deemed to have read and agreed to the following ",
  }[authenticationStep.value]
}
)
const layoutStore = useLayoutStateStore()
const authStore = useAuthenticationStore()
const navigate = useNav()

const {
  authenticationStep,
  form,
  loading,
} = storeToRefs(authStore)

const {
  handleAuthenticate,
  handleLogin,
  handleRegister,
  resetForm,
  rules,
} = authStore


const _handleAuthenticate = async () => {
  const res = await handleAuthenticate()
  if (res) {
    authenticationStep.value = 'login'
  } else {
    authenticationStep.value = 'register'
  }
}

const _handleLogin = async () => {
  const isLoginSuccessful = await handleLogin()
  const redirectToDashboard = authStore.redirectAfterLogin
  if (isLoginSuccessful) {
    handleOnClose()
    if (redirectToDashboard) {
      return navigate.redirectToDashboard()
    }
  }
  return
}

const _handleRegister = async () => {
  const token = await handleRegister()

  if (token) {
    handleOnClose()
    return navigate.redirectToDashboard()
  }
}

const handleSubmit = () => {
  const handlers = {
    username: _handleAuthenticate,
    register: _handleRegister,
    login: _handleLogin
  }
  handlers[authenticationStep.value]()
}


const handleOnClose = async () => {
  layoutStore.loginDialog.toggle()
  resetForm()
  authenticationStep.value = 'username'
}
</script>

<template>
  <el-dialog v-model="layoutStore.loginDialog.isVisible" class="login-dialog" :show-close="false"
    style="width: fit-content; border-radius: 0.75rem;" :before-close="handleOnClose">
    <div class="login-dialog-content-container">
      <!-- Dynamic Header -->
      <div class="login-title-container">
        <h3>{{ stepTitles[authenticationStep] }}</h3>
      </div>

      <!-- Main Form Content -->
      <el-form :model="form" :rules="rules" @submit.prevent="handleSubmit" class="register-form" ref="formRef">
        <!-- Email Field -->
        <el-form-item v-if="authenticationStep === 'username'" prop="identity" size="large">
          <el-input v-model="form.identity" placeholder="Username" :prefix-icon="User" clearable
            autocomplete="username" />
        </el-form-item>

        <!-- Password Field (for login/register) -->
        <el-form-item v-else prop="password" size="large">
          <el-input v-model="form.password" placeholder="Password" :prefix-icon="Lock" type="password" show-password
            autocomplete="current-password" />
        </el-form-item>

        <!-- Submit Button -->
        <el-form-item>
          <el-button type="primary" native-type="submit" class="submit-button" :loading="loading" size="default">
            {{ buttonText }}
          </el-button>
        </el-form-item>

        <!-- Common Content -->
        <el-divider />
        <div class="disclaimer" style="text-align: left">
          {{ 'An account is needed to store your itinerary and share them with your friends!' }}
        </div>
        <div class="disclaimer" style="text-align: left">
          <span class="terms-text">
            {{ termsMessage }}
            <span class="hyperlink">{{ 'Terms and Conditions.' }}</span>
          </span>
        </div>
      </el-form>
    </div>
  </el-dialog>
</template>

<style lang="css" scoped>
.login-dialog :deep(.el-dialog__body) {
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-dialog-content-container {
  width: 100%;
  max-width: 400px;
  margin: 0rem 1rem 1rem 1rem;
}

.login-title-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.login-title-container h3 {
  text-align: center;
  color: #2c3e50;
}

.disclaimer {
  text-align: center;
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  line-height: 1.4;
}


.submit-button {
  margin-top: 1rem;
  width: 100%;
}
</style>
